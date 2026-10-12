import { ArrowRight, ChevronLeft, ChevronRight, Hourglass, PenLine } from 'lucide-react'
import { useMemo, useState, type MouseEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ArticleCard, EntityRow } from '@/components/cards.tsx'
import { Breadcrumbs, DateSpan, EmptyState, PageContainer, SectionHeading } from '@/components/ui.tsx'
import { WithData } from '@/components/WithData.tsx'
import { articlesInEpoch, epochPath, matchesRegion, startYear, type Indexed } from '@/data/index.ts'
import { entityInfo, regionName } from '@/lib/entities.ts'
import { useTitle } from '@/lib/useTitle.ts'
import { overlaps, astro } from '@/shared/dates.ts'
import { normalize } from '@/shared/search.ts'
import type { EpochNode } from '@/shared/types.ts'
import { NotFoundPage } from './NotFoundPage.tsx'

export function useInternalLinks() {
  const navigate = useNavigate()
  return (e: MouseEvent<HTMLElement>) => {
    const a = (e.target as HTMLElement).closest('a')
    const href = a?.getAttribute('href')
    if (a && href?.startsWith('/') && !e.metaKey && !e.ctrlKey && a.target !== '_blank') {
      e.preventDefault()
      navigate(href)
    }
  }
}

export function EpochsPage() {
  useTitle('Epochen')
  return <WithData>{(index) => <EpochsOverview index={index} />}</WithData>
}

/** Für Filter: Regionen, die in Epochen vorkommen, als Auswahl */
const REGION_FILTERS = ['welt', 'afrika', 'westasien', 'europa', 'mittelmeer', 'zentralasien', 'suedasien', 'ostasien', 'suedostasien', 'amerika']

function EpochsOverview({ index }: { index: Indexed }) {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const region = params.get('region')
  const q = normalize(query.trim())

  const matches = (e: EpochNode): boolean => {
    const textOk = !q || normalize(`${e.title} ${e.summary} ${e.planned.join(' ')}`).includes(q)
    const regionOk = !region || e.regions.includes('welt') || matchesRegion(index, e.regions, region)
    return textOk && regionOk
  }
  const visible = (e: EpochNode): boolean => matches(e) || e.children.some((c) => visible(index.epochById.get(c)!))

  const roots = index.rootEpochs.filter(visible)

  return (
    <PageContainer className="pt-8 lg:pt-12">
      <p className="eyebrow mb-3">Epochen</p>
      <h1 className="page-title">Zeiträume der Menschheitsgeschichte</h1>
      <p className="lead mt-4 max-w-3xl">
        Die Gliederung folgt großen Zeitabschnitten, innerhalb derer jede Region ihre eigene Periodisierung behält. „Mittelalter“ etwa bezeichnet hier nur das lateinische Europa – für China,
        die islamische Welt oder Westafrika gelten andere Einteilungen.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center">
        <label className="flex-1">
          <span className="sr-only">Epochen durchsuchen</span>
          <input className="input" type="search" placeholder="Epochen durchsuchen, z. B. „Kusch“, „Mongolen“, „Reformation“" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="Nach Region filtern">
        <button className="chip" aria-pressed={!region} onClick={() => setParams({})}>
          Alle Regionen
        </button>
        {REGION_FILTERS.map((r) => (
          <button key={r} className="chip" aria-pressed={region === r} onClick={() => setParams(region === r ? {} : { region: r })}>
            {regionName(index, r)}
          </button>
        ))}
      </div>

      {roots.length === 0 && (
        <div className="mt-10">
          <EmptyState icon={<Hourglass />} title="Keine passende Epoche">
            Versuchen Sie einen anderen Suchbegriff oder die <Link className="link" to={`/suche?q=${encodeURIComponent(query)}`}>Volltextsuche</Link>.
          </EmptyState>
        </div>
      )}

      <ol className="mt-10 flex flex-col gap-6">
        {roots.map((root) => (
          <li key={root.id} className="card overflow-hidden">
            <Link to={`/epochen/${root.id}`} className="block p-5 sm:p-6 hover:bg-[var(--bg-elev-2)] transition-colors group">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-display text-[1.75rem] leading-tight group-hover:text-[var(--gold)] transition-colors">{root.title}</h2>
                <DateSpan span={root.span} className="text-sm muted" />
              </div>
              <p className="soft mt-2 max-w-3xl">{root.summary}</p>
              {articlesInEpoch(index, root.id).length > 0 && <p className="text-xs muted mt-3">{articlesInEpoch(index, root.id).length} ausführliche Artikel</p>}
            </Link>
            {root.children.length > 0 && (
              <ul className="border-t border-[var(--line)] grid sm:grid-cols-2 lg:grid-cols-3">
                {root.children
                  .map((id) => index.epochById.get(id)!)
                  .filter(visible)
                  .map((child) => (
                    <li key={child.id} className="border-b border-[var(--line)] sm:[&:nth-last-child(-n+2)]:border-b-0">
                      <Link to={`/epochen/${child.id}`} className="block p-4 h-full hover:bg-[var(--bg-elev-2)] transition-colors">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="font-medium">{child.title}</span>
                          {articlesInEpoch(index, child.id).length > 0 && (
                            <span className="text-xs text-[var(--gold)] shrink-0">{articlesInEpoch(index, child.id).length} Art.</span>
                          )}
                        </span>
                        <DateSpan span={child.span} className="text-xs muted block mt-0.5" />
                        {child.children.length > 0 && (
                          <span className="text-xs soft block mt-1">{child.children.map((c) => index.epochById.get(c)?.title).join(' · ')}</span>
                        )}
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </PageContainer>
  )
}

export function EpochPage() {
  const { id = '' } = useParams()
  return (
    <WithData>
      {(index) => {
        const epoch = index.epochById.get(id)
        return epoch ? <EpochView index={index} epoch={epoch} /> : <NotFoundPage what="Epoche" />
      }}
    </WithData>
  )
}

function EpochView({ index, epoch }: { index: Indexed; epoch: EpochNode }) {
  useTitle(epoch.title)
  const onClick = useInternalLinks()
  const path = epochPath(index, epoch.id)
  const articles = articlesInEpoch(index, epoch.id).sort((a, b) => startYear(a.span) - startYear(b.span))
  const children = epoch.children.map((c) => index.epochById.get(c)!).filter(Boolean)
  const siblings = (epoch.parent ? index.epochById.get(epoch.parent)!.children.map((c) => index.epochById.get(c)!) : index.rootEpochs).filter(Boolean)
  const pos = siblings.findIndex((s) => s.id === epoch.id)
  const prev = pos > 0 ? siblings[pos - 1] : undefined
  const next = pos >= 0 && pos < siblings.length - 1 ? siblings[pos + 1] : undefined

  const inScope = (regions: string[]) => epoch.regions.includes('welt') || epoch.regions.some((r) => matchesRegion(index, regions, r))
  const from = epoch.span ? astro(epoch.span.start) : -Infinity
  const to = epoch.span ? astro(epoch.span.end ?? epoch.span.start) : Infinity
  const events = useMemo(
    () =>
      index.entities.events
        .filter((e) => overlaps(e.span, from, to) && inScope(e.regions))
        .sort((a, b) => a.weight - b.weight || astro(a.span.start) - astro(b.span.start))
        .slice(0, 12)
        .sort((a, b) => astro(a.span.start) - astro(b.span.start)),
    [epoch.id],
  )
  const polities = index.entities.polities.filter((p) => overlaps(p.span, from, to) && inScope(p.regions)).sort((a, b) => astro(a.span.start) - astro(b.span.start))

  return (
    <PageContainer className="pt-6 lg:pt-10 fade-in">
      <Breadcrumbs items={[{ label: 'Epochen', to: '/epochen' }, ...path.map((p) => ({ label: p.title, to: `/epochen/${p.id}` }))]} />
      <p className="eyebrow mb-3">{epoch.parent ? 'Teilbereich' : 'Epoche'}</p>
      <h1 className="page-title text-balance">{epoch.title}</h1>
      <p className="mt-3 text-sm muted flex flex-wrap gap-x-4 gap-y-1">
        <DateSpan span={epoch.span} className="text-[var(--text-soft)]" />
        {epoch.regions.slice(0, 5).map((r) => (
          <span key={r}>{regionName(index, r)}</span>
        ))}
      </p>
      <p className="lead mt-5 max-w-3xl">{epoch.summary}</p>
      {epoch.spanNote && (
        <aside className="mt-6 max-w-3xl border-l-2 border-[var(--c-deutung)] pl-4 text-sm soft">
          <p className="eyebrow !text-[var(--c-deutung)] mb-1">Zur Zeitgliederung</p>
          {epoch.spanNote}
        </aside>
      )}
      {epoch.html.trim() && <div className="prose mt-8" onClick={onClick} dangerouslySetInnerHTML={{ __html: epoch.html }} />}

      {children.length > 0 && (
        <section>
          <SectionHeading>Teilbereiche</SectionHeading>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {children.map((c) => (
              <li key={c.id}>
                <Link to={`/epochen/${c.id}`} className="card-link p-5 h-full flex flex-col gap-1.5">
                  <DateSpan span={c.span} className="text-xs muted" />
                  <span className="font-display text-xl leading-tight">{c.title}</span>
                  <span className="text-sm soft line-clamp-3">{c.summary}</span>
                  {articlesInEpoch(index, c.id).length > 0 && <span className="text-xs text-[var(--gold)] mt-auto pt-2">{articlesInEpoch(index, c.id).length} ausführliche Artikel</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {articles.length > 0 && (
        <section>
          <SectionHeading>Ausführliche Artikel</SectionHeading>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} index={index} />
            ))}
          </div>
        </section>
      )}

      {epoch.planned.length > 0 && (
        <section>
          <SectionHeading>Im Aufbau</SectionHeading>
          <div className="card p-5">
            <p className="text-sm soft flex gap-2 mb-3">
              <PenLine size={16} className="shrink-0 mt-0.5 text-[var(--gold)]" aria-hidden />
              Für diese Themen sind ausführliche Artikel geplant, aber noch nicht verfasst. CHRONOS veröffentlicht Artikel erst, wenn sie belegt sind.
            </p>
            <ul className="flex flex-wrap gap-2">
              {epoch.planned.map((p) => (
                <li key={p}>
                  <Link to={`/suche?q=${encodeURIComponent(p)}`} className="chip" title="In vorhandenen Inhalten suchen">
                    {p}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section>
          <SectionHeading aside={<Link to={`/zeitleiste?von=${epoch.span?.start.year ?? ''}&bis=${epoch.span?.end?.year ?? ''}`} className="text-sm link inline-flex items-center gap-1">Zeitleiste <ArrowRight size={14} /></Link>}>
            Ereignisse dieser Zeit
          </SectionHeading>
          <div className="card px-4 py-1">
            {events.map((e) => {
              const info = entityInfo(index, 'event', e.id)
              return info ? <EntityRow key={e.id} info={info} showKind={false} /> : null
            })}
          </div>
        </section>
      )}

      {polities.length > 0 && (
        <section>
          <SectionHeading>Staaten und Reiche</SectionHeading>
          <div className="flex flex-wrap gap-2">
            {polities.map((p) => (
              <Link key={p.id} to={`/staat/${p.id}`} className="chip">
                {p.name} <DateSpan span={p.span} className="muted text-xs" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {(prev || next) && (
        <nav className="mt-14 grid sm:grid-cols-2 gap-3" aria-label="Benachbarte Epochen">
          {prev ? (
            <Link to={`/epochen/${prev.id}`} className="card-link p-4 flex items-center gap-3">
              <ChevronLeft className="text-[var(--gold)] shrink-0" aria-hidden />
              <span>
                <span className="block text-xs muted">Davor</span>
                <span className="font-medium">{prev.title}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={`/epochen/${next.id}`} className="card-link p-4 flex items-center gap-3 justify-end text-right">
              <span>
                <span className="block text-xs muted">Danach</span>
                <span className="font-medium">{next.title}</span>
              </span>
              <ChevronRight className="text-[var(--gold)] shrink-0" aria-hidden />
            </Link>
          )}
        </nav>
      )}
    </PageContainer>
  )
}
