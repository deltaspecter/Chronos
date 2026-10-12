/**
 * Volltextsuche im Browser (MiniSearch, Index wird beim Build vorberechnet).
 *
 * Unterstützt: Präfix- und Tippfehlersuche, Namensvarianten (über die alias-Felder der Inhalte),
 * Synonymgruppen (content/synonyms), Schreibweisen-Normalisierung (Cäsar = Caesar = Kaesar),
 * Zeitangaben („1789“, „44 v. Chr.“, „3. Jh. v. Chr.“) und Filter nach Typ, Region und Thema.
 */
import MiniSearch, { type SearchResult as MSResult } from 'minisearch'
import { manifest, fetchJson } from '@/data/load.ts'
import { parseYearQuery } from '@/shared/dates.ts'
import { DEFAULT_SEARCH, KIND_WEIGHT, MINISEARCH_OPTIONS, normalize } from '@/shared/search.ts'
import type { EntityKind, SearchDoc } from '@/shared/types.ts'

export interface Hit {
  id: string
  kind: EntityKind
  ref: string
  title: string
  summary: string
  from?: number
  to?: number
  regions: string[]
  themes: string[]
  score: number
  /** Treffer über ein Synonym statt über den eingegebenen Begriff */
  viaSynonym?: string
}

export interface SearchFilters {
  kinds?: EntityKind[]
  /** Region inkl. Unterregionen (vom Aufrufer aufgelöst) */
  regions?: Set<string>
  theme?: string
}

export interface SearchOutcome {
  hits: Hit[]
  period?: { from: number; to: number; label: string }
  synonyms: string[]
  relaxed: boolean
}

interface Engine {
  mini: MiniSearch<SearchDoc>
  synonyms: Map<string, string[]>
  docs: Map<string, Hit>
}

let enginePromise: Promise<Engine> | null = null

export function loadSearch(): Promise<Engine> {
  enginePromise ??= fetchJson<{ index: object; synonyms: string[][] }>(manifest.files.search).then(({ index, synonyms }) => {
    const mini = MiniSearch.loadJS<SearchDoc>(index as never, MINISEARCH_OPTIONS)
    const map = new Map<string, string[]>()
    for (const group of synonyms) for (const term of group) map.set(normalize(term), group.filter((t) => t !== term))
    const docs = new Map<string, Hit>()
    // Alle gespeicherten Felder einmal abrufen (für Zeitraum-Suchen ohne Text)
    for (const r of mini.search(MiniSearch.wildcard)) docs.set(String(r.id), toHit(r))
    return { mini, synonyms: map, docs }
  })
  enginePromise.catch(() => (enginePromise = null))
  return enginePromise
}

function toHit(r: MSResult, viaSynonym?: string): Hit {
  return {
    id: String(r.id),
    kind: r.kind as EntityKind,
    ref: r.ref as string,
    title: r.title as string,
    summary: r.summary as string,
    from: r.from as number | undefined,
    to: r.to as number | undefined,
    regions: ((r.regions as string) || '').split(' ').filter(Boolean),
    themes: ((r.themes as string) || '').split(' ').filter(Boolean),
    score: r.score * (KIND_WEIGHT[r.kind as string] ?? 1),
    viaSynonym,
  }
}

function passes(hit: Hit, filters: SearchFilters, period?: { from: number; to: number }): boolean {
  if (filters.kinds?.length && !filters.kinds.includes(hit.kind)) return false
  if (filters.regions && !hit.regions.some((r) => filters.regions!.has(r))) return false
  if (filters.theme && !hit.themes.includes(filters.theme)) return false
  if (period) {
    if (hit.from === undefined) return false
    const to = hit.to ?? hit.from
    if (hit.from > period.to || to < period.from) return false
  }
  return true
}

function synonymsFor(engine: Engine, query: string): string[] {
  const q = normalize(query.trim())
  const found = new Set<string>()
  if (engine.synonyms.has(q)) engine.synonyms.get(q)!.forEach((t) => found.add(t))
  for (const token of q.split(/\s+/)) if (token.length > 2 && engine.synonyms.has(token)) engine.synonyms.get(token)!.forEach((t) => found.add(t))
  return [...found]
}

export function runSearch(engine: Engine, rawQuery: string, filters: SearchFilters = {}, limit = 60): SearchOutcome {
  const query = rawQuery.trim()
  if (!query) return { hits: [], synonyms: [], relaxed: false }
  const parsed = parseYearQuery(query)
  const period = parsed ? { from: parsed.from, to: parsed.to, label: parsed.label } : undefined
  const text = parsed ? parsed.rest : query

  // Reine Zeitangabe: alles, was diesen Zeitpunkt/Zeitraum berührt
  if (period && !text.replace(/[^\p{L}\p{N}]/gu, '')) {
    const hits = [...engine.docs.values()]
      .filter((h) => passes(h, filters, period))
      .map((h) => {
        const span = Math.max(1, (h.to ?? h.from!) - h.from!)
        return { ...h, score: (KIND_WEIGHT[h.kind] ?? 1) * (1 / Math.log10(span + 10)) }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
    return { hits, period, synonyms: [], relaxed: false }
  }

  const byId = new Map<string, Hit>()
  let relaxed = false
  let results = engine.mini.search(text, DEFAULT_SEARCH)
  if (results.length === 0) {
    results = engine.mini.search(text, { ...DEFAULT_SEARCH, combineWith: 'OR' })
    relaxed = results.length > 0
  }
  for (const r of results) byId.set(String(r.id), toHit(r))

  const synonyms = synonymsFor(engine, text)
  for (const alt of synonyms) {
    for (const r of engine.mini.search(alt, DEFAULT_SEARCH)) {
      const id = String(r.id)
      const hit = toHit(r, alt)
      hit.score *= 0.85
      const existing = byId.get(id)
      if (!existing) byId.set(id, hit)
      else existing.score = Math.max(existing.score, hit.score)
    }
  }

  let hits = [...byId.values()].filter((h) => passes(h, filters, period))
  // Gibt es mit Zeitfilter nichts, lieber ungefiltert zeigen als gar nichts
  if (period && hits.length === 0) hits = [...byId.values()].filter((h) => passes(h, filters))
  hits.sort((a, b) => b.score - a.score)
  return { hits: hits.slice(0, limit), period, synonyms, relaxed }
}

/** Schnelle Vorschläge während der Eingabe */
export function suggest(engine: Engine, query: string, limit = 7): Hit[] {
  const q = query.trim()
  if (q.length < 2) return []
  const parsed = parseYearQuery(q)
  if (parsed && !parsed.rest) return runSearch(engine, q, {}, limit).hits
  const results = engine.mini.search(q, { ...DEFAULT_SEARCH, prefix: true, fuzzy: (t) => (t.length > 4 ? 0.2 : false) })
  return results
    .map((r) => toHit(r))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
