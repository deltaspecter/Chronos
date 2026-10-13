import { ArrowRight, Clock, Layers, Map as MapIcon } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { KindIcon } from '@/components/kinds.tsx'
import { DateSpan, PageContainer } from '@/components/ui.tsx'
import { WithData } from '@/components/WithData.tsx'
import { articlesInEpoch, matchesRegion, startYear, type Indexed } from '@/data/index.ts'
import { regionName } from '@/lib/entities.ts'
import { useTitle } from '@/lib/useTitle.ts'
import type { ArticleMeta, EpochNode } from '@/shared/types.ts'
import { DIRECTORIES } from './DirectoryPage.tsx'

/** Regionen, nach denen sich das Inhaltsverzeichnis eingrenzen lässt */
const REGION_FILTERS = ['afrika', 'westasien', 'europa', 'mittelmeer', 'zentralasien', 'suedasien', 'ostasien', 'suedostasien', 'amerika', 'ozeanien']

export function ContentsPage() {
  useTitle('Inhaltsverzeichnis')
  return <WithData>{(index) => <Contents index={index} />}</WithData>
}

function Contents({ index }: { index: Indexed }) {
  const [params, setParams] = useSearchParams()
  const region = params.get('region')
  const matches = (a: ArticleMeta) => matchesRegion(index, a.regions, region)
  /** Ohne Regionsfilter erscheinen alle Epochen, mit Filter nur solche mit passenden Artikeln */
  const shown = (e: EpochNode) => !region || articlesInEpoch(index, e.id).some(matches)
  const roots = index.rootEpochs.filter(shown)
  const total = index.articles.filter(matches).length

  return (
    <PageContainer className="pt-8 lg:pt-12">
      <p className="eyebrow mb-3">Inhaltsverzeichnis</p>
      <h1 className="page-title">Alle Inhalte auf einen Blick</h1>
      <p className="lead mt-4 max-w-3xl">
        Die Artikel sind nach Epochen geordnet, von der Urgeschichte bis zur Gegenwart. Personen, Orte, Ereignisse, Staaten, Begriffe und Quellen finden Sie in den Registern am Ende.
      </p>

      <nav className="mt-8 card p-5" aria-label="Übersicht">
        <p className="text-xs uppercase tracking-wider muted mb-3">Übersicht</p>
        <ol className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5">
          {roots.map((root, i) => (
            <li key={root.id}>
              <a href={`#epoche-${root.id}`} className="link-quiet flex items-baseline gap-2">
                <span className="text-[var(--gold)] tabular-nums w-6 shrink-0">{i + 1}</span>
                <span>{root.title}</span>
              </a>
            </li>
          ))}
          <li>
            <a href="#register" className="link-quiet flex items-baseline gap-2">
              <span className="text-[var(--gold)] w-6 shrink-0">→</span>
              <span>Register von A bis Z</span>
            </a>
          </li>
        </ol>
      </nav>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="Nach Region eingrenzen">
        <button className="chip" aria-pressed={!region} onClick={() => setParams({})}>
          Alle Regionen
        </button>
        {REGION_FILTERS.map((r) => (
          <button key={r} className="chip" aria-pressed={region === r} onClick={() => setParams(region === r ? {} : { region: r })}>
            {regionName(index, r)}
          </button>
        ))}
        {region && !REGION_FILTERS.includes(region) && (
          <button className="chip" aria-pressed onClick={() => setParams({})}>
            {regionName(index, region)}
          </button>
        )}
      </div>
      <p className="text-sm muted mt-3">
        {region ? `${total} Artikel zur Region ${regionName(index, region)}` : `${total} Artikel in ${index.epochById.size} Epochen und Teilbereichen`}
      </p>

      <div className="mt-8 flex flex-col gap-10">
        {roots.map((root, i) => (
          <EpochSection key={root.id} index={index} epoch={root} number={`${i + 1}`} depth={0} matches={matches} shown={shown} />
        ))}
        {roots.length === 0 && <p className="soft">Zu dieser Region gibt es noch keine Artikel.</p>}
      </div>

      <section id="register" className="mt-14 scroll-mt-[calc(var(--header-h)+var(--safe-top)+1rem)]" aria-labelledby="register-titel">
        <h2 id="register-titel" className="font-display text-3xl">
          Register von A bis Z
        </h2>
        <p className="soft mt-2 max-w-3xl">Jeder Eintrag des Wissensnetzes ist hier alphabetisch oder chronologisch verzeichnet.</p>
        <ul className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {DIRECTORIES.map((d) => (
            <li key={d.slug}>
              <Link to={`/verzeichnis/${d.slug}`} className="card-link p-4 flex items-center gap-3 h-full">
                <KindIcon kind={d.kind} size={20} className="text-[var(--gold)] shrink-0" />
                <span>
                  <span className="block font-medium">{d.label}</span>
                  <span className="text-xs muted">{d.count(index)} Einträge</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <ul className="mt-6 grid sm:grid-cols-3 gap-3">
          {[
            { to: '/themen', label: 'Themen', hint: 'Politik, Religion, Wirtschaft …', icon: Layers },
            { to: '/zeitleiste', label: 'Zeitleiste', hint: 'Ereignisse nach Jahren', icon: Clock },
            { to: '/atlas', label: 'Atlas', hint: 'Orte auf der Karte', icon: MapIcon },
          ].map((item) => (
            <li key={item.to}>
              <Link to={item.to} className="card-link p-4 flex items-center gap-3 h-full">
                <item.icon size={20} className="text-[var(--gold)] shrink-0" aria-hidden />
                <span>
                  <span className="block font-medium">{item.label}</span>
                  <span className="text-xs muted">{item.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageContainer>
  )
}

function EpochSection({
  index,
  epoch,
  number,
  depth,
  matches,
  shown,
}: {
  index: Indexed
  epoch: EpochNode
  number: string
  depth: number
  matches: (a: ArticleMeta) => boolean
  shown: (e: EpochNode) => boolean
}) {
  const articles = epoch.articles
    .map((id) => index.articleById.get(id))
    .filter((a): a is ArticleMeta => !!a && matches(a))
    .sort((a, b) => startYear(a.span) - startYear(b.span))
  const children = epoch.children.map((id) => index.epochById.get(id)!).filter((c) => c && shown(c))
  const Heading = depth === 0 ? 'h2' : depth === 1 ? 'h3' : 'h4'
  const headingClass = depth === 0 ? 'font-display text-3xl' : depth === 1 ? 'font-display text-xl' : 'font-medium'

  return (
    <section id={`epoche-${epoch.id}`} className={depth === 0 ? 'scroll-mt-[calc(var(--header-h)+var(--safe-top)+1rem)]' : 'mt-5'} aria-label={epoch.title}>
      <div className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 ${depth === 0 ? 'border-b border-[var(--line)] pb-2' : ''}`}>
        <Heading className={headingClass}>
          <span className="text-[var(--gold)] tabular-nums mr-2">{number}</span>
          <Link to={`/epochen/${epoch.id}`} className="hover:text-[var(--gold)] transition-colors">
            {epoch.title}
          </Link>
        </Heading>
        <DateSpan span={epoch.span} className="text-sm muted" />
      </div>
      {articles.length > 0 && (
        <ol className="mt-2 flex flex-col">
          {articles.map((a) => (
            <li key={a.id}>
              <Link to={`/artikel/${a.slug}`} className="group flex items-baseline gap-3 py-2 border-b border-[var(--line)] last:border-b-0">
                <span className="flex-1 min-w-0">
                  <span className="font-medium group-hover:text-[var(--gold)] transition-colors">{a.title}</span>
                  {a.subtitle && <span className="block text-sm muted">{a.subtitle}</span>}
                </span>
                <ArrowRight size={15} className="shrink-0 muted group-hover:text-[var(--gold)]" aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      )}
      {articles.length === 0 && children.length === 0 && <p className="text-sm muted mt-2">Einführung in die Epoche – ausführliche Artikel folgen.</p>}
      {children.length > 0 && (
        <div className={depth === 0 ? 'mt-2' : 'ml-4 sm:ml-6 border-l border-[var(--line)] pl-4'}>
          {children.map((child, i) => (
            <EpochSection key={child.id} index={index} epoch={child} number={`${number}.${i + 1}`} depth={depth + 1} matches={matches} shown={shown} />
          ))}
        </div>
      )}
    </section>
  )
}
