import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { EntityRow } from '@/components/cards.tsx'
import { KindIcon } from '@/components/kinds.tsx'
import { Breadcrumbs, PageContainer } from '@/components/ui.tsx'
import { WithData } from '@/components/WithData.tsx'
import type { Indexed } from '@/data/index.ts'
import { entityInfo, type EntityInfo } from '@/lib/entities.ts'
import { useTitle } from '@/lib/useTitle.ts'
import { astro } from '@/shared/dates.ts'
import type { EntityKind } from '@/shared/types.ts'
import { NotFoundPage } from './NotFoundPage.tsx'

export const DIRECTORIES: { slug: string; kind: EntityKind; label: string; count: (i: Indexed) => number; ids: (i: Indexed) => string[] }[] = [
  { slug: 'artikel', kind: 'article', label: 'Artikel', count: (i) => i.articles.length, ids: (i) => i.articles.map((a) => a.id) },
  { slug: 'personen', kind: 'person', label: 'Persönlichkeiten', count: (i) => i.entities.persons.length, ids: (i) => i.entities.persons.map((x) => x.id) },
  { slug: 'ereignisse', kind: 'event', label: 'Ereignisse', count: (i) => i.entities.events.length, ids: (i) => i.entities.events.map((x) => x.id) },
  { slug: 'orte', kind: 'place', label: 'Orte', count: (i) => i.entities.places.length, ids: (i) => i.entities.places.map((x) => x.id) },
  { slug: 'staaten', kind: 'polity', label: 'Staaten und Reiche', count: (i) => i.entities.polities.length, ids: (i) => i.entities.polities.map((x) => x.id) },
  { slug: 'kulturen', kind: 'culture', label: 'Kulturen', count: (i) => i.entities.cultures.length, ids: (i) => i.entities.cultures.map((x) => x.id) },
  { slug: 'begriffe', kind: 'term', label: 'Begriffe', count: (i) => i.entities.terms.length, ids: (i) => i.entities.terms.map((x) => x.id) },
  { slug: 'quellen', kind: 'source', label: 'Quellen und Literatur', count: (i) => i.entities.sources.length, ids: (i) => i.entities.sources.map((x) => x.id) },
  { slug: 'routen', kind: 'route', label: 'Routen', count: (i) => i.entities.routes.length, ids: (i) => i.entities.routes.map((x) => x.id) },
]

/** Sprungmarke für eine Gruppe (Buchstabe oder Jahrhundert) */
function anchor(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-')
}

export function DirectoryPage() {
  const { kind } = useParams()
  return (
    <WithData>
      {(index) => {
        if (!kind) return <DirectoryOverview index={index} />
        const dir = DIRECTORIES.find((d) => d.slug === kind)
        return dir ? <DirectoryList index={index} dir={dir} /> : <NotFoundPage what="Verzeichnis" />
      }}
    </WithData>
  )
}

function DirectoryOverview({ index }: { index: Indexed }) {
  useTitle('Verzeichnisse')
  return (
    <PageContainer className="pt-8 lg:pt-12">
      <Breadcrumbs items={[{ label: 'Inhaltsverzeichnis', to: '/inhalt' }, { label: 'Register' }]} />
      <h1 className="page-title">Verzeichnisse</h1>
      <ul className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {DIRECTORIES.map((d) => (
          <li key={d.slug}>
            <Link to={`/verzeichnis/${d.slug}`} className="card-link p-4 flex items-center gap-3">
              <KindIcon kind={d.kind} size={20} className="text-[var(--gold)]" />
              <span>
                <span className="block font-medium">{d.label}</span>
                <span className="text-xs muted">{d.count(index)} Einträge</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </PageContainer>
  )
}

function DirectoryList({ index, dir }: { index: Indexed; dir: (typeof DIRECTORIES)[number] }) {
  useTitle(dir.label)
  const [order, setOrder] = useState<'alpha' | 'chrono'>(dir.kind === 'event' ? 'chrono' : 'alpha')
  const [sourceKind, setSourceKind] = useState<string>('')
  const items = useMemo(() => dir.ids(index).map((id) => entityInfo(index, dir.kind, id)).filter((x): x is EntityInfo => !!x), [index, dir])
  const filtered = items
    .filter((i) => !sourceKind || index.sourceById.get(i.id)?.kind === sourceKind)
    .sort((a, b) => (order === 'alpha' ? a.title.localeCompare(b.title, 'de') : (a.span ? astro(a.span.start) : 1e9) - (b.span ? astro(b.span.start) : 1e9)))

  const groups = new Map<string, EntityInfo[]>()
  for (const item of filtered) {
    let key: string
    if (order === 'alpha') key = item.title.replace(/^(Der|Die|Das|The)\s+/, '').charAt(0).toUpperCase()
    else if (!item.span) key = 'Ohne Datierung'
    else {
      const y = item.span.start.year
      if (y < -3000) key = 'Vor 3000 v. Chr.'
      else if (y < 0) key = `${Math.ceil(-y / 100)}. Jahrhundert v. Chr.`
      else key = `${Math.floor((y - 1) / 100) + 1}. Jahrhundert`
    }
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  const hasDates = items.some((i) => i.span)

  return (
    <PageContainer className="pt-8 lg:pt-12">
      <Breadcrumbs items={[{ label: 'Inhaltsverzeichnis', to: '/inhalt' }, { label: 'Register', to: '/verzeichnis' }, { label: dir.label }]} />
      <h1 className="page-title">{dir.label}</h1>
      <p className="muted mt-2">{items.length} Einträge</p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        {hasDates && (
          <div className="flex gap-2" role="group" aria-label="Sortierung">
            <button className="chip" aria-pressed={order === 'alpha'} onClick={() => setOrder('alpha')}>
              A–Z
            </button>
            <button className="chip" aria-pressed={order === 'chrono'} onClick={() => setOrder('chrono')}>
              Chronologisch
            </button>
          </div>
        )}
        {dir.kind === 'source' && (
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Quellenart">
            {[
              ['', 'Alle'],
              ['primaer', 'Quellen'],
              ['edition', 'Editionen'],
              ['sekundaer', 'Forschung'],
              ['institution', 'Institutionen'],
            ].map(([k, l]) => (
              <button key={k} className="chip" aria-pressed={sourceKind === k} onClick={() => setSourceKind(k)}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>
      <nav className="mt-6 flex flex-wrap gap-1.5" aria-label="Springen zu">
        {[...groups.keys()].map((key) => (
          <a key={key} href={`#gruppe-${anchor(key)}`} className="chip min-w-9 justify-center">
            {key}
          </a>
        ))}
      </nav>
      <div className="mt-8 flex flex-col gap-8">
        {[...groups.entries()].map(([key, list]) => (
          <section key={key} id={`gruppe-${anchor(key)}`} aria-label={key} className="scroll-mt-[calc(var(--header-h)+var(--safe-top)+3rem)]">
            <h2 className="font-display text-2xl text-[var(--gold)] mb-2 sticky top-[calc(var(--header-h)+var(--safe-top))] bg-[var(--bg)] py-1 z-10">{key}</h2>
            <div className="card px-4 py-1">
              {list.map((info) => (
                <EntityRow key={info.id} info={info} showKind={false} />
              ))}
            </div>
          </section>
        ))}
        {filtered.length === 0 && <p className="soft">Keine Einträge vorhanden.</p>}
      </div>
    </PageContainer>
  )
}
