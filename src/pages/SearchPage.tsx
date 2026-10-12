import { Search as SearchIcon, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { KindIcon } from '@/components/kinds.tsx'
import { hitHref, hitYears, SearchBox } from '@/components/SearchBox.tsx'
import { EmptyState, ErrorBlock, LoadingBlock, PageContainer } from '@/components/ui.tsx'
import { WithData } from '@/components/WithData.tsx'
import type { Indexed } from '@/data/index.ts'
import { regionName } from '@/lib/entities.ts'
import { loadSearch, runSearch, type SearchOutcome } from '@/lib/searchEngine.ts'
import { useTitle } from '@/lib/useTitle.ts'
import { KIND_LABEL, KIND_LABEL_PLURAL } from '@/shared/routes.ts'
import type { EntityKind } from '@/shared/types.ts'

const KIND_FILTERS: EntityKind[] = ['article', 'event', 'person', 'place', 'polity', 'epoch', 'term', 'source']
const REGION_FILTERS = ['afrika', 'westasien', 'europa', 'mittelmeer', 'zentralasien', 'suedasien', 'ostasien', 'amerika']

export function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  useTitle(q ? `Suche: ${q}` : 'Suche')
  return (
    <PageContainer className="pt-8 lg:pt-12">
      <p className="eyebrow mb-3">Suche</p>
      <h1 className="page-title mb-6">Im Bestand suchen</h1>
      <div className="max-w-2xl">
        <SearchBox key={q} initial={q} large autoFocus={!q} />
      </div>
      <WithData>{(index) => <Results index={index} />}</WithData>
    </PageContainer>
  )
}

function Results({ index }: { index: Indexed }) {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const kind = params.get('typ') as EntityKind | null
  const region = params.get('region')
  const theme = params.get('thema')
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  useEffect(() => {
    if (!q && !region && !theme) {
      setOutcome(null)
      return
    }
    let cancelled = false
    setLoading(true)
    loadSearch()
      .then((engine) => {
        if (cancelled) return
        const regions = region ? index.regionDescendants.get(region) : undefined
        if (q) setOutcome(runSearch(engine, q, { kinds: kind ? [kind] : undefined, regions, theme: theme ?? undefined }, 120))
        else {
          // Nur Filter (z. B. von einem Regions-Link): alle passenden Einträge
          const hits = [...engine.docs.values()].filter(
            (h) => (!kind || h.kind === kind) && (!regions || h.regions.some((r) => regions.has(r))) && (!theme || h.themes.includes(theme)),
          )
          hits.sort((a, b) => (a.kind === 'article' ? -1 : 0) - (b.kind === 'article' ? -1 : 0) || (a.from ?? 1e9) - (b.from ?? 1e9))
          setOutcome({ hits: hits.slice(0, 200), synonyms: [], relaxed: false })
        }
        setError(null)
      })
      .catch((e: Error) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [q, kind, region, theme, index])

  const counts = useMemo(() => {
    const c = new Map<EntityKind, number>()
    outcome?.hits.forEach((h) => c.set(h.kind, (c.get(h.kind) ?? 0) + 1))
    return c
  }, [outcome])

  // Verwandte Suchbegriffe: Synonyme + häufige Themen der Treffer
  const relatedTerms = useMemo(() => {
    if (!outcome) return []
    const themes = new Map<string, number>()
    outcome.hits.slice(0, 20).forEach((h) => h.themes.forEach((t) => themes.set(t, (themes.get(t) ?? 0) + 1)))
    return [...themes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => index.themeById.get(t))
      .filter((t): t is NonNullable<typeof t> => !!t)
  }, [outcome, index])

  if (!q && !region && !theme) return <SearchHelp />
  if (error) return <ErrorBlock error={error} />
  if (loading && !outcome) return <LoadingBlock label="Suche läuft" />
  if (!outcome) return null

  const visible = kind ? outcome.hits : outcome.hits

  return (
    <div className="mt-8">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="Nach Typ filtern">
        <button className="chip" aria-pressed={!kind} onClick={() => setParam('typ', null)}>
          Alle
        </button>
        {KIND_FILTERS.map((k) => (
          <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setParam('typ', kind === k ? null : k)}>
            <KindIcon kind={k} size={13} /> {KIND_LABEL_PLURAL[k]}
            {!kind && counts.get(k) ? <span className="muted">{counts.get(k)}</span> : null}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 mt-2 [scrollbar-width:none]" role="group" aria-label="Nach Region filtern">
        {REGION_FILTERS.map((r) => (
          <button key={r} className="chip" aria-pressed={region === r} onClick={() => setParam('region', region === r ? null : r)}>
            {regionName(index, r)}
          </button>
        ))}
        {theme && (
          <button className="chip" aria-pressed onClick={() => setParam('thema', null)}>
            Thema: {index.themeById.get(theme)?.title} ✕
          </button>
        )}
      </div>

      <div className="mt-6 text-sm soft flex flex-col gap-1" aria-live="polite">
        <p>
          {visible.length === 0 ? 'Keine Treffer' : `${visible.length}${visible.length >= 120 ? '+' : ''} Treffer`}
          {q && <> für „{q}“</>}
          {region && <> · Region: {regionName(index, region)}</>}
        </p>
        {outcome.period && <p className="muted">Zeitangabe erkannt: {outcome.period.label} – es werden Einträge gezeigt, die diesen Zeitraum berühren.</p>}
        {outcome.relaxed && <p className="muted">Kein Eintrag enthält alle Begriffe – gezeigt werden Treffer für einzelne Begriffe.</p>}
        {outcome.synonyms.length > 0 && <p className="muted">Auch gesucht: {outcome.synonyms.join(', ')}</p>}
      </div>

      {visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<SearchIcon />} title="Nichts gefunden">
            Prüfen Sie die Schreibweise oder versuchen Sie einen allgemeineren Begriff. Jahreszahlen wie „1789“ oder „44 v. Chr.“ und Jahrhunderte wie „12. Jh.“ werden erkannt. Der Bestand
            wächst schrittweise – nicht jedes Thema ist schon erfasst.
          </EmptyState>
        </div>
      ) : (
        <ol className="mt-6 flex flex-col">
          {visible.map((hit) => (
            <li key={hit.id} className="border-b border-[var(--line)] last:border-0">
              <Link to={hitHref(hit)} className="flex gap-3 py-4 group">
                <KindIcon kind={hit.kind} size={18} className="mt-1 shrink-0 text-[var(--gold-soft)]" />
                <span className="min-w-0">
                  <span className="text-xs muted">
                    {KIND_LABEL[hit.kind]}
                    {hit.from !== undefined && ` · ${hitYears(hit)}`}
                    {hit.regions[0] && ` · ${regionName(index, hit.regions[0])}`}
                    {hit.viaSynonym && ` · über „${hit.viaSynonym}“`}
                  </span>
                  <span className={`block group-hover:text-[var(--gold)] transition-colors ${hit.kind === 'article' ? 'font-display text-xl' : 'font-medium'}`}>{hit.title}</span>
                  {hit.summary && <span className="block text-sm soft line-clamp-2 mt-0.5">{hit.summary}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {relatedTerms.length > 0 && (
        <aside className="mt-10" aria-label="Verwandte Themen">
          <p className="eyebrow mb-3 inline-flex items-center gap-2">
            <Sparkles size={13} aria-hidden /> Verwandte Themen
          </p>
          <div className="flex flex-wrap gap-2">
            {relatedTerms.map((t) => (
              <Link key={t.id} to={`/themen/${t.id}`} className="chip">
                {t.title}
              </Link>
            ))}
          </div>
        </aside>
      )}
    </div>
  )
}

function SearchHelp() {
  return (
    <div className="mt-10 grid md:grid-cols-2 gap-4 max-w-4xl">
      <div className="card p-5">
        <p className="font-medium mb-2">So funktioniert die Suche</p>
        <ul className="text-sm soft flex flex-col gap-2">
          <li>Durchsucht werden alle Artikel samt Volltext sowie Personen, Orte, Ereignisse, Staaten, Epochen, Begriffe und Quellen.</li>
          <li>Schreibweisen werden vereinheitlicht: „Cäsar“ findet „Caesar“, „Pompejus“ findet „Pompeius“.</li>
          <li>Tippfehler werden toleriert, Namensvarianten und Synonyme mitgesucht („Shoah“ → Holocaust).</li>
        </ul>
      </div>
      <div className="card p-5">
        <p className="font-medium mb-2">Nach Zeiträumen suchen</p>
        <ul className="text-sm soft flex flex-col gap-2">
          {['1789', '44 v. Chr.', '3. Jh. v. Chr.', '14. Jahrhundert', 'Schlacht 216 v. Chr.'].map((q) => (
            <li key={q}>
              <Link to={`/suche?q=${encodeURIComponent(q)}`} className="link">
                {q}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
