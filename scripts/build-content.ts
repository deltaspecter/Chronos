/**
 * CHRONOS – Inhalts-Build
 *
 * Liest alle redaktionellen Inhalte aus content/, prüft sie streng (Schema, Verweise,
 * Dubletten, Belege) und schreibt die optimierten Daten nach public/data/.
 *
 *   node scripts/build-content.ts          Build
 *   node scripts/build-content.ts --check  Nur prüfen, nichts schreiben
 *
 * Ausgabe:
 *   public/data/manifest.json                  Version + Dateinamen (nie gecacht)
 *   public/data/catalog.<hash>.json            Metadaten aller Artikel
 *   public/data/taxonomy.<hash>.json           Epochen, Themen, Regionen, Zeitleisten-Spuren
 *   public/data/entities.<hash>.json           Personen, Orte, Ereignisse, Quellen …
 *   public/data/a/<id>.<hash>.json             Ein Artikel (Text, Inhaltsverzeichnis, Belege)
 *
 * Dateinamen enthalten den Inhalts-Hash: Geänderte Inhalte bekommen neue URLs, unveränderte
 * bleiben im Cache gültig. So hält der Service Worker nie veraltete Fassungen fest.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'
import type { z } from 'zod'
import { astro, spanFrom, type HSpan } from '../src/shared/dates.ts'
import { entityHref } from '../src/shared/routes.ts'
import type {
  ArticleBody,
  ArticleMeta,
  Culture,
  EntityKind,
  EpochNode,
  HEvent,
  Manifest,
  Media,
  Person,
  Place,
  Polity,
  Region,
  Route,
  Source,
  Term,
  Territory,
  ThemeNode,
} from '../src/shared/types.ts'
import { escapeHtml, renderArticle, type LinkKind, type Resolver } from './lib/markup.ts'
import * as S from './lib/schema.ts'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const CONTENT = join(ROOT, 'content')
const OUT = join(ROOT, 'public', 'data')
const CHECK_ONLY = process.argv.includes('--check')
/** Nur für die Arbeit an Entwürfen: Fehler werden gemeldet, die Daten aber trotzdem geschrieben */
const LENIENT = process.argv.includes('--lenient')

const errors: string[] = []
const warnings: string[] = []

// ---------------------------------------------------------------------------
// Laden
// ---------------------------------------------------------------------------

function walk(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return []
  const files: string[] = []
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) files.push(...walk(path, ext))
    else if (name.endsWith(ext) && !name.startsWith('_')) files.push(path)
  }
  return files
}

function rel(path: string) {
  return relative(ROOT, path)
}

/** Lädt alle YAML-Dateien eines Ordners; jede Datei enthält eine Liste von Einträgen */
function loadCollection<T extends z.ZodTypeAny>(folder: string, schema: T): z.infer<T>[] {
  const items: z.infer<T>[] = []
  for (const file of walk(join(CONTENT, folder), '.yaml')) {
    let data: unknown
    try {
      data = YAML.parse(readFileSync(file, 'utf8'))
    } catch (error) {
      errors.push(`${rel(file)}: YAML-Fehler – ${(error as Error).message}`)
      continue
    }
    if (data == null) continue
    if (!Array.isArray(data)) {
      errors.push(`${rel(file)}: Erwartet wird eine Liste von Einträgen`)
      continue
    }
    data.forEach((raw, index) => {
      const parsed = schema.safeParse(raw)
      if (!parsed.success) {
        const where = (raw as { id?: string })?.id ?? `#${index + 1}`
        for (const issue of parsed.error.issues) errors.push(`${rel(file)} [${where}] ${issue.path.join('.')}: ${issue.message}`)
      } else items.push(parsed.data)
    })
  }
  return items
}

function uniqueMap<T extends { id: string }>(items: T[], label: string): Map<string, T> {
  const map = new Map<string, T>()
  for (const item of items) {
    if (map.has(item.id)) errors.push(`Doppelte ID in ${label}: "${item.id}"`)
    map.set(item.id, item)
  }
  return map
}

function span(start?: string, end?: string, context = ''): HSpan | undefined {
  if (start === undefined) return undefined
  try {
    const s = spanFrom(start, end)
    if (s.end && astro(s.end) < astro(s.start)) errors.push(`${context}: Ende (${end}) liegt vor Beginn (${start})`)
    return s
  } catch (error) {
    errors.push(`${context}: ${(error as Error).message}`)
    return undefined
  }
}

const regionsRaw = loadCollection('regions', S.regionSchema)
const lanesRaw = loadCollection('lanes', S.laneSchema)
const epochsRaw = loadCollection('epochs', S.epochSchema)
const themesRaw = loadCollection('themes', S.themeSchema)
const seriesRaw = loadCollection('series', S.seriesSchema)
const personsRaw = loadCollection('persons', S.personSchema)
const placesRaw = loadCollection('places', S.placeSchema)
const eventsRaw = loadCollection('events', S.eventSchema)
const politiesRaw = loadCollection('polities', S.politySchema)
const culturesRaw = loadCollection('cultures', S.cultureSchema)
const termsRaw = loadCollection('terms', S.termSchema)
const sourcesRaw = loadCollection('sources', S.sourceSchema)
const routesRaw = loadCollection('routes', S.routeSchema)
const territoriesRaw = loadCollection('territories', S.territorySchema)
const mediaRaw = loadCollection('media', S.mediaSchema)

const mediaLockPath = join(CONTENT, 'media', '_commons.lock.json')
const mediaLock: Record<string, { file: string; width: number; height: number; author: string; license: string; licenseUrl?: string; sourceUrl: string }> =
  existsSync(mediaLockPath) ? JSON.parse(readFileSync(mediaLockPath, 'utf8')) : {}

interface RawArticle {
  front: S.ArticleFront
  body: string
  file: string
}

const articlesRaw: RawArticle[] = []
for (const file of walk(join(CONTENT, 'articles'), '.md')) {
  const text = readFileSync(file, 'utf8')
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text.replace(/\r\n/g, '\n'))
  if (!match) {
    errors.push(`${rel(file)}: Front-Matter (--- … ---) fehlt`)
    continue
  }
  let data: unknown
  try {
    data = YAML.parse(match[1])
  } catch (error) {
    errors.push(`${rel(file)}: YAML-Fehler im Front-Matter – ${(error as Error).message}`)
    continue
  }
  const parsed = S.articleSchema.safeParse(data)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(`${rel(file)} ${issue.path.join('.')}: ${issue.message}`)
    continue
  }
  articlesRaw.push({ front: parsed.data, body: match[2], file })
}

// ---------------------------------------------------------------------------
// Indizes und Grundprüfungen
// ---------------------------------------------------------------------------

const regionMap = uniqueMap(regionsRaw, 'regions')
const epochMap = uniqueMap(epochsRaw, 'epochs')
const themeMap = uniqueMap(themesRaw, 'themes')
const seriesMap = uniqueMap(seriesRaw, 'series')
const personMap = uniqueMap(personsRaw, 'persons')
const placeMap = uniqueMap(placesRaw, 'places')
const eventMap = uniqueMap(eventsRaw, 'events')
const polityMap = uniqueMap(politiesRaw, 'polities')
const cultureMap = uniqueMap(culturesRaw, 'cultures')
const termMap = uniqueMap(termsRaw, 'terms')
const sourceMap = uniqueMap(sourcesRaw, 'sources')
const routeMap = uniqueMap(routesRaw, 'routes')
uniqueMap(territoriesRaw, 'territories')
const mediaMap = uniqueMap(mediaRaw, 'media')
const articleMap = uniqueMap(
  articlesRaw.map((a) => ({ ...a, id: a.front.id })),
  'articles',
)

// Doppelte IDs würden Einträge stillschweigend überschreiben und alle weiteren Prüfungen verfälschen – daher sofort abbrechen
const duplicates = errors.filter((e) => e.startsWith('Doppelte ID'))
if (duplicates.length) {
  console.error(`\n✖ ${duplicates.length} doppelte ID(s):\n`)
  for (const e of duplicates) console.error(`  • ${e}`)
  process.exit(1)
}

const slugMap = new Map<string, string>()
for (const { front, file } of articlesRaw) {
  // Die stabile ID ist immer auch als Adresse erreichbar (/artikel/<id> → kanonischer Slug)
  for (const slug of new Set([front.slug ?? front.id, front.id, ...front.formerSlugs])) {
    if (slugMap.has(slug) && slugMap.get(slug) !== front.id) errors.push(`${rel(file)}: Slug "${slug}" wird bereits von "${slugMap.get(slug)}" verwendet`)
    slugMap.set(slug, front.id)
  }
}

function checkRefs(context: string, field: string, list: string[] | undefined, map: Map<string, unknown>) {
  for (const ref of list ?? []) if (!map.has(ref)) errors.push(`${context}: ${field} → "${ref}" existiert nicht`)
}

for (const r of regionsRaw) if (r.parent) checkRefs(`regions/${r.id}`, 'parent', [r.parent], regionMap)
for (const l of lanesRaw) checkRefs(`lanes/${l.id}`, 'regions', l.regions, regionMap)
for (const e of epochsRaw) {
  if (e.parent) checkRefs(`epochs/${e.id}`, 'parent', [e.parent], epochMap)
  checkRefs(`epochs/${e.id}`, 'regions', e.regions, regionMap)
}
for (const t of themesRaw) if (t.parent) checkRefs(`themes/${t.id}`, 'parent', [t.parent], themeMap)
for (const p of personsRaw) {
  const c = `persons/${p.id}`
  checkRefs(c, 'regions', p.regions, regionMap)
  checkRefs(c, 'themes', p.themes, themeMap)
  checkRefs(c, 'places', p.places, placeMap)
  checkRefs(c, 'related', p.related, personMap)
}
for (const p of placesRaw) {
  checkRefs(`places/${p.id}`, 'regions', p.regions, regionMap)
  checkRefs(`places/${p.id}`, 'themes', p.themes, themeMap)
}
for (const e of eventsRaw) {
  const c = `events/${e.id}`
  if (!e.date && !e.start) errors.push(`${c}: date oder start fehlt`)
  checkRefs(c, 'regions', e.regions, regionMap)
  checkRefs(c, 'themes', e.themes, themeMap)
  checkRefs(c, 'places', e.places, placeMap)
  checkRefs(c, 'persons', e.persons, personMap)
  checkRefs(c, 'polities', e.polities, polityMap)
  if (e.regions.length === 0) errors.push(`${c}: mindestens eine Region angeben (für Zeitleiste und Filter)`)
}
for (const p of politiesRaw) {
  const c = `polities/${p.id}`
  checkRefs(c, 'regions', p.regions, regionMap)
  checkRefs(c, 'themes', p.themes, themeMap)
  checkRefs(c, 'predecessors', p.predecessors, polityMap)
  checkRefs(c, 'successors', p.successors, polityMap)
  if (p.capital) checkRefs(c, 'capital', [p.capital], placeMap)
}
for (const c of culturesRaw) {
  checkRefs(`cultures/${c.id}`, 'regions', c.regions, regionMap)
  checkRefs(`cultures/${c.id}`, 'places', c.places, placeMap)
}
for (const t of termsRaw) checkRefs(`terms/${t.id}`, 'themes', t.themes, themeMap)
for (const r of routesRaw) {
  checkRefs(`routes/${r.id}`, 'regions', r.regions, regionMap)
  checkRefs(`routes/${r.id}`, 'themes', r.themes, themeMap)
}
for (const t of territoriesRaw) checkRefs(`territories/${t.id}`, 'polity', [t.polity], polityMap)
for (const m of mediaRaw) if (!mediaLock[m.id]) errors.push(`media/${m.id}: Bild noch nicht geladen – "npm run media" ausführen (prüft Lizenz und lädt ${m.commons})`)

for (const s of sourcesRaw) {
  if (s.kind === 'sekundaer' && !s.year) errors.push(`sources/${s.id}: Sekundärliteratur braucht ein Erscheinungsjahr`)
  if (s.kind === 'institution' && !s.url) errors.push(`sources/${s.id}: Institutionen/Datenbanken brauchen eine URL`)
  if (s.authors.length === 0 && s.editors.length === 0 && s.kind === 'sekundaer') errors.push(`sources/${s.id}: Autor oder Herausgeber fehlt`)
}

// Dubletten über Namen erkennen (gleicher Name, verschiedene IDs)
function duplicateNames<T extends { id: string }>(items: T[], name: (t: T) => string, label: string) {
  const seen = new Map<string, string>()
  for (const item of items) {
    const key = name(item).toLowerCase().trim()
    if (seen.has(key)) warnings.push(`Mögliche Dublette in ${label}: "${name(item)}" (${seen.get(key)} / ${item.id})`)
    else seen.set(key, item.id)
  }
}
duplicateNames(personsRaw, (p) => p.name, 'persons')
duplicateNames(placesRaw, (p) => p.name, 'places')
duplicateNames(eventsRaw, (e) => e.title, 'events')
duplicateNames(
  articlesRaw.map((a) => ({ id: a.front.id, title: a.front.title })),
  (a) => a.title,
  'articles',
)
duplicateNames(sourcesRaw, (s) => `${s.authors.join(',')}|${s.title}`, 'sources')

// ---------------------------------------------------------------------------
// Verweisauflösung und Rendern der Artikel
// ---------------------------------------------------------------------------

const labelOf: Record<LinkKind, (id: string) => string | undefined> = {
  article: (id) => articleMap.get(id)?.front.title,
  person: (id) => personMap.get(id)?.name,
  place: (id) => placeMap.get(id)?.name,
  event: (id) => eventMap.get(id)?.title,
  polity: (id) => polityMap.get(id)?.name,
  culture: (id) => cultureMap.get(id)?.name,
  term: (id) => termMap.get(id)?.name,
  epoch: (id) => epochMap.get(id)?.title,
  theme: (id) => themeMap.get(id)?.title,
  source: (id) => sourceMap.get(id)?.title,
  route: (id) => routeMap.get(id)?.name,
}

function formatSource(s: z.infer<typeof S.sourceSchema>): string {
  const names = (list: string[]) => list.join(' / ')
  const who = s.authors.length ? names(s.authors) : s.editors.length ? `${names(s.editors)} (Hg.)` : ''
  let title = s.subtitle ? `${s.title}. ${s.subtitle}` : s.title
  if (s.kind === 'primaer' && s.written) title += ` (${s.written})`
  const parts: string[] = []
  parts.push(who ? `${who}: ${title}` : title)
  if (s.container) {
    const vol = s.volume ? ` ${s.volume}` : ''
    parts[0] += `. In: ${s.container}${vol}${s.year ? ` (${s.year})` : ''}${s.pages ? `, S. ${s.pages}` : ''}`
  } else {
    if (s.authors.length && s.editors.length) parts.push(`Hg. von ${names(s.editors)}`)
    if (s.edition) parts.push(s.edition)
    if (s.series) parts.push(`(${s.series})`)
    const imprint = [s.place, s.publisher].filter(Boolean).join(': ')
    if (imprint || s.year) parts.push([imprint, s.year].filter(Boolean).join(' '))
  }
  return parts.join('. ').replace(/\.\./g, '.') + '.'
}

function mediaHtml(id: string): { html: string } | null {
  const m = mediaMap.get(id)
  const lock = mediaLock[id]
  if (!m || !lock) return null
  const recon = m.reconstruction ? '<span class="fig-badge">Rekonstruktion</span>' : ''
  const credit = `${escapeHtml(lock.author)} · <a href="${escapeHtml(lock.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(lock.license)}</a> · Wikimedia Commons, für die Anzeige verkleinert`
  return {
    html:
      `<figure class="figure" data-media="${id}"><img src="/media/${lock.file}" width="${lock.width}" height="${lock.height}" alt="${escapeHtml(m.alt)}" loading="lazy" decoding="async">` +
      `<figcaption>${recon}<span class="fig-caption">${escapeHtml(m.caption)}</span><span class="fig-credit">${credit}</span></figcaption></figure>`,
  }
}

const resolver: Resolver = {
  link(kind, id) {
    const label = labelOf[kind]?.(id)
    if (!label) return null
    const slug = kind === 'article' ? (articleMap.get(id)!.front.slug ?? id) : id
    return { href: entityHref(kind as EntityKind, slug), label }
  },
  media: mediaHtml,
  sourceExists: (id) => sourceMap.has(id),
}

interface Rendered {
  raw: RawArticle
  html: string
  toc: ArticleBody['toc']
  citations: ArticleBody['citations']
  text: string
  words: number
  links: { kind: LinkKind; id: string }[]
  media: string[]
}

const rendered: Rendered[] = []
for (const raw of articlesRaw) {
  const { front, file } = raw
  const c = rel(file)
  checkRefs(c, 'epochs', front.epochs, epochMap)
  checkRefs(c, 'themes', front.themes, themeMap)
  checkRefs(c, 'regions', front.regions, regionMap)
  checkRefs(c, 'persons', front.persons, personMap)
  checkRefs(c, 'places', front.places, placeMap)
  checkRefs(c, 'events', front.events, eventMap)
  checkRefs(c, 'polities', front.polities, polityMap)
  checkRefs(c, 'cultures', front.cultures, cultureMap)
  checkRefs(c, 'terms', front.terms, termMap)
  checkRefs(c, 'related', front.related, articleMap)
  checkRefs(c, 'bibliography', front.bibliography, sourceMap)
  if (front.image) checkRefs(c, 'image', [front.image], mediaMap)
  if (front.series) checkRefs(c, 'series', [front.series], seriesMap)
  if (front.series && front.seriesOrder === undefined) errors.push(`${c}: seriesOrder fehlt`)
  const result = renderArticle(raw.body, resolver, c)
  errors.push(...result.errors)
  const words = result.text.split(/\s+/).filter(Boolean).length
  if (front.status !== 'entwurf' && result.citations.length === 0 && front.bibliography.length === 0) {
    errors.push(`${c}: Artikel ohne Belege und ohne Literatur – mindestens die Status-Stufe "entwurf" verwenden`)
  }
  if (result.toc.length === 0 && words > 600) warnings.push(`${c}: langer Artikel ohne Zwischenüberschriften`)
  rendered.push({ raw, html: result.html, toc: result.toc, citations: result.citations, text: result.text, words, links: result.links, media: result.media })
}

// ---------------------------------------------------------------------------
// Beziehungen zusammenführen (beide Richtungen)
// ---------------------------------------------------------------------------

const rel2 = {
  personArticles: new Map<string, Set<string>>(),
  placeArticles: new Map<string, Set<string>>(),
  eventArticles: new Map<string, Set<string>>(),
  polityArticles: new Map<string, Set<string>>(),
  cultureArticles: new Map<string, Set<string>>(),
  termArticles: new Map<string, Set<string>>(),
  sourceArticles: new Map<string, Set<string>>(),
  routeArticles: new Map<string, Set<string>>(),
  backlinks: new Map<string, Set<string>>(),
  personEvents: new Map<string, Set<string>>(),
  placeEvents: new Map<string, Set<string>>(),
  placePersons: new Map<string, Set<string>>(),
}

function add(map: Map<string, Set<string>>, key: string, value: string) {
  if (!map.has(key)) map.set(key, new Set())
  map.get(key)!.add(value)
}

const articleRelations = new Map<string, { persons: Set<string>; places: Set<string>; events: Set<string>; polities: Set<string>; cultures: Set<string>; terms: Set<string>; related: Set<string>; sources: Set<string> }>()

for (const r of rendered) {
  const f = r.raw.front
  const sets = {
    persons: new Set(f.persons),
    places: new Set(f.places),
    events: new Set(f.events),
    polities: new Set(f.polities),
    cultures: new Set(f.cultures),
    terms: new Set(f.terms),
    related: new Set(f.related),
    sources: new Set([...f.bibliography, ...r.citations.map((c) => c.source)]),
  }
  for (const link of r.links) {
    if (link.kind === 'person') sets.persons.add(link.id)
    if (link.kind === 'place') sets.places.add(link.id)
    if (link.kind === 'event') sets.events.add(link.id)
    if (link.kind === 'polity') sets.polities.add(link.id)
    if (link.kind === 'culture') sets.cultures.add(link.id)
    if (link.kind === 'term') sets.terms.add(link.id)
    if (link.kind === 'source') sets.sources.add(link.id)
    if (link.kind === 'route') add(rel2.routeArticles, link.id, f.id)
    if (link.kind === 'article' && link.id !== f.id) add(rel2.backlinks, link.id, f.id)
  }
  for (const target of f.related) add(rel2.backlinks, target, f.id)
  articleRelations.set(f.id, sets)
  for (const id of sets.persons) add(rel2.personArticles, id, f.id)
  for (const id of sets.places) add(rel2.placeArticles, id, f.id)
  for (const id of sets.events) add(rel2.eventArticles, id, f.id)
  for (const id of sets.polities) add(rel2.polityArticles, id, f.id)
  for (const id of sets.cultures) add(rel2.cultureArticles, id, f.id)
  for (const id of sets.terms) add(rel2.termArticles, id, f.id)
  for (const id of sets.sources) add(rel2.sourceArticles, id, f.id)
}
for (const e of eventsRaw) {
  for (const p of e.persons) add(rel2.personEvents, p, e.id)
  for (const p of e.places) add(rel2.placeEvents, p, e.id)
  for (const pl of e.places) for (const p of e.persons) add(rel2.placePersons, pl, p)
}
for (const p of personsRaw) for (const pl of p.places) add(rel2.placePersons, pl, p.id)

const list = (map: Map<string, Set<string>>, key: string) => [...(map.get(key) ?? [])].sort()

// Fehlende Ziel-Artikel in Querverweisen der Epochen/Themen (planned) sind erlaubt; Artikel ohne Querverweise nicht
for (const r of rendered) {
  const rels = articleRelations.get(r.raw.front.id)!
  const total = rels.persons.size + rels.places.size + rels.events.size + rels.related.size
  if (total === 0) warnings.push(`${rel(r.raw.file)}: Artikel ist nicht mit dem Wissensnetz verknüpft`)
}

// ---------------------------------------------------------------------------
// Ausgabe-Strukturen
// ---------------------------------------------------------------------------

function hashOf(data: string) {
  return createHash('sha256').update(data).digest('hex').slice(0, 10)
}

const articleMeta: ArticleMeta[] = []
const articleBodies: { body: ArticleBody; hash: string; json: string }[] = []

const seriesMembers = new Map<string, { id: string; order: number }[]>()
for (const { front } of articlesRaw) if (front.series) {
  if (!seriesMembers.has(front.series)) seriesMembers.set(front.series, [])
  seriesMembers.get(front.series)!.push({ id: front.id, order: front.seriesOrder ?? 0 })
}
for (const members of seriesMembers.values()) members.sort((a, b) => a.order - b.order)

for (const r of rendered) {
  const f = r.raw.front
  const rels = articleRelations.get(f.id)!
  const members = f.series ? seriesMembers.get(f.series)! : []
  const index = members.findIndex((m) => m.id === f.id)
  const body: ArticleBody = {
    id: f.id,
    html: r.html,
    toc: r.toc,
    citations: r.citations,
    bibliography: [...rels.sources].sort(),
    persons: [...rels.persons],
    places: [...rels.places],
    events: [...rels.events],
    polities: [...rels.polities],
    cultures: [...rels.cultures],
    terms: [...rels.terms],
    related: [...rels.related],
    backlinks: list(rel2.backlinks, f.id),
    prev: index > 0 ? members[index - 1].id : undefined,
    next: index >= 0 && index < members.length - 1 ? members[index + 1].id : undefined,
    history: f.history.length ? f.history : [{ version: f.version, date: f.updated, note: 'Erstfassung' }],
    media: [...new Set([...(f.image ? [f.image] : []), ...r.media])],
  }
  const json = JSON.stringify(body)
  const hash = hashOf(json)
  articleBodies.push({ body, hash, json })
  articleMeta.push({
    id: f.id,
    slug: f.slug ?? f.id,
    title: f.title,
    subtitle: f.subtitle,
    type: f.type,
    summary: f.summary,
    span: span(f.start, f.end, rel(r.raw.file)),
    spanNote: f.spanNote,
    epochs: f.epochs,
    themes: f.themes,
    regions: f.regions,
    aliases: f.aliases,
    status: f.status,
    version: f.version,
    updated: f.updated,
    words: r.words,
    readingMinutes: Math.max(1, Math.round(r.words / 200)),
    image: f.image,
    series: f.series ? { id: f.series, title: seriesMap.get(f.series)?.title ?? f.series, order: f.seriesOrder ?? 0 } : undefined,
    file: `/data/a/${f.id}.${hash}.json`,
    hash,
  })
}
articleMeta.sort((a, b) => a.title.localeCompare(b.title, 'de'))

// Epochen-Baum
const epochChildren = new Map<string, string[]>()
for (const e of [...epochsRaw].sort((a, b) => a.order - b.order)) if (e.parent) {
  if (!epochChildren.has(e.parent)) epochChildren.set(e.parent, [])
  epochChildren.get(e.parent)!.push(e.id)
}
const epochArticles = new Map<string, Set<string>>()
for (const a of articleMeta) for (const e of a.epochs) add(epochArticles, e, a.id)

/** Quellen, auf die Epochen- und Themenseiten verweisen (zählen als verwendet) */
const sourcesInTaxonomy = new Set<string>()

const epochs: EpochNode[] = epochsRaw.map((e) => {
  const r = renderArticle(e.body, resolver, `epochs/${e.id}`)
  errors.push(...r.errors)
  r.links.filter((l) => l.kind === 'source').forEach((l) => sourcesInTaxonomy.add(l.id))
  return {
    id: e.id,
    title: e.title,
    span: span(e.start, e.end, `epochs/${e.id}`),
    spanNote: e.spanNote,
    regions: e.regions,
    summary: e.summary,
    html: r.html,
    parent: e.parent,
    children: epochChildren.get(e.id) ?? [],
    planned: e.planned,
    articles: list(epochArticles, e.id),
    order: e.order,
  }
})
// Zyklen im Epochenbaum verhindern
for (const e of epochs) {
  const seen = new Set<string>()
  let cur: string | undefined = e.id
  while (cur) {
    if (seen.has(cur)) {
      errors.push(`epochs/${e.id}: Zyklus in der Hierarchie`)
      break
    }
    seen.add(cur)
    cur = epochMap.get(cur)?.parent
  }
}

const themeChildren = new Map<string, string[]>()
for (const t of themesRaw) if (t.parent) {
  if (!themeChildren.has(t.parent)) themeChildren.set(t.parent, [])
  themeChildren.get(t.parent)!.push(t.id)
}
const themeArticles = new Map<string, Set<string>>()
for (const a of articleMeta) for (const t of a.themes) add(themeArticles, t, a.id)
const themes: ThemeNode[] = themesRaw.map((t) => {
  const r = renderArticle(t.body, resolver, `themes/${t.id}`)
  errors.push(...r.errors)
  r.links.filter((l) => l.kind === 'source').forEach((l) => sourcesInTaxonomy.add(l.id))
  return {
    id: t.id,
    title: t.title,
    summary: t.summary,
    html: r.html,
    parent: t.parent,
    children: themeChildren.get(t.id) ?? [],
    articles: list(themeArticles, t.id),
    icon: t.icon,
    planned: t.planned,
  }
})

const regions: Region[] = regionsRaw.map((r) => ({ id: r.id, name: r.name, parent: r.parent, aliases: r.aliases }))

const persons: Person[] = personsRaw.map((p) => ({
  id: p.id,
  name: p.name,
  aliases: p.aliases,
  span: span(p.born, p.died, `persons/${p.id}`),
  roles: p.roles,
  summary: p.summary,
  regions: p.regions,
  themes: p.themes,
  articles: list(rel2.personArticles, p.id),
  places: p.places,
  events: list(rel2.personEvents, p.id),
  related: p.related,
  certainty: p.certainty,
}))

const places: Place[] = placesRaw.map((p) => ({
  id: p.id,
  name: p.name,
  aliases: p.aliases,
  coords: p.coords,
  location: p.location,
  categories: p.categories,
  span: span(p.start, p.end, `places/${p.id}`),
  summary: p.summary,
  modernName: p.modernName,
  regions: p.regions,
  themes: p.themes,
  articles: list(rel2.placeArticles, p.id),
  events: list(rel2.placeEvents, p.id),
  persons: list(rel2.placePersons, p.id),
}))

const events: HEvent[] = eventsRaw.map((e) => ({
  id: e.id,
  title: e.title,
  aliases: e.aliases,
  span: span(e.date ?? e.start, e.date ? undefined : e.end, `events/${e.id}`) ?? { start: { year: 1 } },
  certainty: e.certainty,
  dateNote: e.dateNote,
  weight: e.weight,
  kind: e.kind,
  summary: e.summary,
  regions: e.regions,
  themes: e.themes,
  places: e.places,
  persons: e.persons,
  articles: list(rel2.eventArticles, e.id),
  polities: e.polities,
}))

const polities: Polity[] = politiesRaw.map((p) => ({
  id: p.id,
  name: p.name,
  aliases: p.aliases,
  span: span(p.start, p.end, `polities/${p.id}`)!,
  spanNote: p.spanNote,
  capital: p.capital,
  summary: p.summary,
  regions: p.regions,
  themes: p.themes,
  articles: list(rel2.polityArticles, p.id),
  predecessors: p.predecessors,
  successors: p.successors,
  weight: p.weight,
}))

const cultures: Culture[] = culturesRaw.map((c) => ({
  id: c.id,
  name: c.name,
  aliases: c.aliases,
  span: span(c.start, c.end, `cultures/${c.id}`),
  summary: c.summary,
  regions: c.regions,
  articles: list(rel2.cultureArticles, c.id),
  places: c.places,
}))

const terms: Term[] = termsRaw.map((t) => ({ ...t, articles: list(rel2.termArticles, t.id) }))

const sources: Source[] = sourcesRaw.map((s) => ({
  ...s,
  articles: list(rel2.sourceArticles, s.id),
  formatted: formatSource(s),
}))
for (const s of sources) if (s.articles.length === 0 && !sourcesInTaxonomy.has(s.id)) warnings.push(`sources/${s.id}: wird in keinem Artikel verwendet`)

const routes: Route[] = routesRaw.map((r) => ({
  id: r.id,
  name: r.name,
  aliases: r.aliases,
  span: span(r.start, r.end, `routes/${r.id}`)!,
  kind: r.kind,
  path: r.path,
  schematic: r.schematic,
  summary: r.summary,
  articles: list(rel2.routeArticles, r.id),
  themes: r.themes,
  regions: r.regions,
}))

/** Ringe in GeoJSON-Orientierung (außen gegen den Uhrzeigersinn) und geschlossen speichern */
function normalizeRing(ring: [number, number][]): [number, number][] {
  const closed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring : [...ring, ring[0]]
  let area = 0
  for (let i = 0; i < closed.length - 1; i++) area += closed[i][0] * closed[i + 1][1] - closed[i + 1][0] * closed[i][1]
  return area < 0 ? [...closed].reverse() : closed
}

const territories: Territory[] = territoriesRaw.map((t) => ({
  id: t.id,
  polity: t.polity,
  name: t.name,
  span: span(t.start, t.end, `territories/${t.id}`)!,
  certainty: t.certainty,
  rings: t.rings.map((r) => normalizeRing(r as [number, number][])),
  basis: t.basis,
  note: t.note,
}))

const media: Media[] = mediaRaw
  .filter((m) => mediaLock[m.id])
  .map((m) => ({ id: m.id, title: m.title, caption: m.caption, alt: m.alt, reconstruction: m.reconstruction, ...mediaLock[m.id] }))

// ---------------------------------------------------------------------------
// Bericht und Schreiben
// ---------------------------------------------------------------------------

const counts = {
  articles: articleMeta.length,
  words: articleMeta.reduce((sum, a) => sum + a.words, 0),
  epochs: epochs.length,
  themes: themes.length,
  persons: persons.length,
  places: places.length,
  events: events.length,
  polities: polities.length,
  cultures: cultures.length,
  terms: terms.length,
  sources: sources.length,
  routes: routes.length,
  territories: territories.length,
  media: media.length,
}

for (const w of warnings) console.warn(`  ⚠ ${w}`)
if (errors.length) {
  console.error(`\n✖ ${errors.length} Fehler in den Inhalten:\n`)
  for (const e of errors) console.error(`  • ${e}`)
  if (!LENIENT) process.exit(1)
  console.error('\n  (--lenient: Daten werden trotzdem geschrieben – nicht für Veröffentlichungen verwenden)\n')
}

console.log(
  `✓ Inhalte geprüft: ${counts.articles} Artikel (${counts.words.toLocaleString('de-DE')} Wörter), ${counts.epochs} Epochen, ${counts.themes} Themen, ` +
    `${counts.persons} Personen, ${counts.places} Orte, ${counts.events} Ereignisse, ${counts.polities} Staaten, ${counts.sources} Quellen/Titel`,
)
if (CHECK_ONLY) process.exit(0)

rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, 'a'), { recursive: true })

function writeHashed(name: string, data: unknown): string {
  const json = JSON.stringify(data)
  const file = `${name}.${hashOf(json)}.json`
  writeFileSync(join(OUT, file), json)
  return `/data/${file}`
}

for (const { body, hash, json } of articleBodies) writeFileSync(join(OUT, 'a', `${body.id}.${hash}.json`), json)

const files = {
  catalog: writeHashed('catalog', { articles: articleMeta, slugs: Object.fromEntries(slugMap) }),
  taxonomy: writeHashed('taxonomy', { epochs, themes, regions, lanes: lanesRaw }),
  entities: writeHashed('entities', { persons, places, events, polities, cultures, terms, sources, routes, territories, media }),
}
const version = hashOf(Object.values(files).join('|'))
const manifest: Manifest = { version, generated: new Date().toISOString(), files, counts }
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
// Die App bindet das Manifest beim Build ein: App-Version und Datenversion sind damit immer identisch
mkdirSync(join(ROOT, 'src', 'generated'), { recursive: true })
writeFileSync(join(ROOT, 'src', 'generated', 'data-manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`✓ Daten geschrieben nach public/data (Version ${version})`)
