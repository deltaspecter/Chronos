import { Bookmark, BookmarkCheck, ExternalLink, Map as MapIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArticleCard, EntityChip, EntityRow } from '@/components/cards.tsx'
import { KindIcon } from '@/components/kinds.tsx'
import { KnowledgeGraph } from '@/components/KnowledgeGraph.tsx'
import { NotesPanel } from '@/components/NotesPanel.tsx'
import { Breadcrumbs, DateSpan, PageContainer, SectionHeading } from '@/components/ui.tsx'
import { WithData } from '@/components/WithData.tsx'
import type { Indexed } from '@/data/index.ts'
import { entityInfo, regionName, type EntityInfo } from '@/lib/entities.ts'
import { useTitle } from '@/lib/useTitle.ts'
import { astro } from '@/shared/dates.ts'
import { KIND_LABEL, KIND_LABEL_PLURAL } from '@/shared/routes.ts'
import type { Certainty, EntityKind } from '@/shared/types.ts'
import { useLibrary } from '@/store/library.ts'
import { DIRECTORIES } from './DirectoryPage.tsx'
import { NotFoundPage } from './NotFoundPage.tsx'

const CERTAINTY: Record<Certainty, string> = {
  gesichert: 'Datierung gesichert',
  wahrscheinlich: 'Datierung wahrscheinlich',
  umstritten: 'Datierung umstritten',
  unsicher: 'Datierung unsicher',
}

const LOCATION: Record<string, string> = {
  exakt: 'Lage gesichert',
  ungefaehr: 'Lage ungefähr',
  umstritten: 'Lage umstritten',
}

const SOURCE_KIND: Record<string, string> = {
  primaer: 'Historische Quelle (Primärquelle)',
  edition: 'Quellenedition / Übersetzung',
  sekundaer: 'Forschungsliteratur (Sekundärliteratur)',
  institution: 'Institution, Datenbank oder digitale Sammlung',
}

interface Detail {
  label: string
  value: ReactNode
}

export function EntityPage({ kind }: { kind: EntityKind }) {
  const { id = '' } = useParams()
  return (
    <WithData>
      {(index) => {
        const info = entityInfo(index, kind, id)
        return info ? <EntityView index={index} info={info} /> : <NotFoundPage what={KIND_LABEL[kind]} />
      }}
    </WithData>
  )
}

function infos(index: Indexed, kind: EntityKind, ids: string[]): EntityInfo[] {
  return ids.map((id) => entityInfo(index, kind, id)).filter((x): x is EntityInfo => !!x)
}

function EntityView({ index, info }: { index: Indexed; info: EntityInfo }) {
  useTitle(info.title)
  const bookmarked = useLibrary((s) => s.bookmarks.some((b) => b.kind === info.kind && b.id === info.id))
  const toggle = useLibrary((s) => s.toggleBookmark)
  const details: Detail[] = []
  let aliases: string[] = []
  let articles: string[] = []
  const related: { kind: EntityKind; items: EntityInfo[] }[] = []
  let mapLink: string | null = null
  let longText: string | null = null

  switch (info.kind) {
    case 'person': {
      const p = index.personById.get(info.id)!
      aliases = p.aliases
      articles = p.articles
      if (p.roles.length) details.push({ label: 'Rolle', value: p.roles.join(', ') })
      if (p.span) details.push({ label: 'Lebensdaten', value: <DateSpan span={p.span} /> })
      related.push({ kind: 'event', items: infos(index, 'event', p.events) }, { kind: 'person', items: infos(index, 'person', p.related) }, { kind: 'place', items: infos(index, 'place', p.places) })
      break
    }
    case 'place': {
      const p = index.placeById.get(info.id)!
      aliases = p.aliases
      articles = p.articles
      if (p.modernName) details.push({ label: 'Heute', value: p.modernName })
      details.push({ label: 'Lage', value: `${p.coords[1].toFixed(2)}° ${p.coords[1] >= 0 ? 'N' : 'S'}, ${Math.abs(p.coords[0]).toFixed(2)}° ${p.coords[0] >= 0 ? 'O' : 'W'} · ${LOCATION[p.location]}` })
      if (p.span) details.push({ label: 'Zeitraum', value: <DateSpan span={p.span} /> })
      mapLink = `/atlas?ort=${p.id}`
      related.push({ kind: 'event', items: infos(index, 'event', p.events) }, { kind: 'person', items: infos(index, 'person', p.persons) })
      break
    }
    case 'event': {
      const e = index.eventById.get(info.id)!
      aliases = e.aliases
      articles = e.articles
      details.push({ label: 'Datum', value: <DateSpan span={e.span} /> })
      details.push({ label: 'Sicherheit', value: CERTAINTY[e.certainty] })
      if (e.dateNote) details.push({ label: 'Zur Datierung', value: e.dateNote })
      if (e.places.length) mapLink = `/atlas?ort=${e.places[0]}`
      related.push(
        { kind: 'person', items: infos(index, 'person', e.persons) },
        { kind: 'place', items: infos(index, 'place', e.places) },
        { kind: 'polity', items: infos(index, 'polity', e.polities) },
      )
      // Ereignisse kurz davor und danach in derselben Region
      const y = astro(e.span.start)
      const near = index.entities.events
        .filter((x) => x.id !== e.id && x.regions.some((r) => e.regions.includes(r)))
        .sort((a, b) => Math.abs(astro(a.span.start) - y) - Math.abs(astro(b.span.start) - y))
        .slice(0, 6)
        .sort((a, b) => astro(a.span.start) - astro(b.span.start))
      related.push({ kind: 'event', items: infos(index, 'event', near.map((n) => n.id)) })
      break
    }
    case 'polity': {
      const p = index.polityById.get(info.id)!
      aliases = p.aliases
      articles = p.articles
      details.push({ label: 'Bestehen', value: <DateSpan span={p.span} /> })
      if (p.spanNote) details.push({ label: 'Zur Datierung', value: p.spanNote })
      if (p.capital) {
        const c = index.placeById.get(p.capital)
        if (c) details.push({ label: 'Zentrum', value: <Link className="link" to={`/ort/${c.id}`}>{c.name}</Link> })
      }
      mapLink = `/atlas?staat=${p.id}`
      related.push(
        { kind: 'polity', items: infos(index, 'polity', [...p.predecessors, ...p.successors]) },
        { kind: 'event', items: infos(index, 'event', index.entities.events.filter((e) => e.polities.includes(p.id)).map((e) => e.id)) },
      )
      break
    }
    case 'culture': {
      const c = index.cultureById.get(info.id)!
      aliases = c.aliases
      articles = c.articles
      if (c.span) details.push({ label: 'Zeitraum', value: <DateSpan span={c.span} /> })
      related.push({ kind: 'place', items: infos(index, 'place', c.places) })
      break
    }
    case 'term': {
      const t = index.termById.get(info.id)!
      aliases = t.aliases
      articles = t.articles
      break
    }
    case 'source': {
      const s = index.sourceById.get(info.id)!
      articles = s.articles
      details.push({ label: 'Art', value: SOURCE_KIND[s.kind] })
      if (s.authors.length) details.push({ label: s.authors.length > 1 ? 'Verfasser' : 'Verfasser/in', value: s.authors.join('; ') })
      if (s.editors.length) details.push({ label: 'Herausgeber', value: s.editors.join('; ') })
      if (s.written) details.push({ label: 'Entstehung', value: s.written })
      if (s.year && s.kind !== 'primaer') details.push({ label: 'Erschienen', value: [s.place, s.publisher, s.year].filter(Boolean).join(', ') })
      longText = s.formatted
      break
    }
    case 'route': {
      const r = index.routeById.get(info.id)!
      aliases = r.aliases
      articles = r.articles
      details.push({ label: 'Zeitraum', value: <DateSpan span={r.span} /> })
      details.push({ label: 'Darstellung', value: r.schematic ? 'Schematischer Verlauf über Hauptstationen – nicht der exakte Wegverlauf' : 'Verlauf nach Quellenlage' })
      mapLink = `/atlas?route=${r.id}`
      break
    }
  }

  const articleMetas = articles.map((id) => index.articleById.get(id)).filter((a): a is NonNullable<typeof a> => !!a)
  const dir = DIRECTORIES.find((d) => d.kind === info.kind)
  const graphNodes = [...infos(index, 'article', articles), ...related.flatMap((r) => r.items)]
  const uniqueGraph = graphNodes.filter((n, i) => graphNodes.findIndex((m) => m.kind === n.kind && m.id === n.id) === i)
  const source = info.kind === 'source' ? index.sourceById.get(info.id) : undefined

  return (
    <PageContainer className="pt-6 lg:pt-10 fade-in">
      <Breadcrumbs items={[{ label: 'Verzeichnisse', to: '/verzeichnis' }, ...(dir ? [{ label: dir.label, to: `/verzeichnis/${dir.slug}` }] : []), { label: info.title }]} />
      <p className="eyebrow mb-3 inline-flex items-center gap-2">
        <KindIcon kind={info.kind} size={14} /> {KIND_LABEL[info.kind]}
      </p>
      <div className="flex items-start gap-3">
        <h1 className="page-title text-balance flex-1">{info.title}</h1>
        <button
          className="icon-btn mt-1"
          aria-pressed={bookmarked}
          aria-label={bookmarked ? 'Lesezeichen entfernen' : 'Lesezeichen setzen'}
          onClick={() => toggle({ kind: info.kind, id: info.id, title: info.title })}
        >
          {bookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
        </button>
      </div>
      {aliases.length > 0 && <p className="mt-2 soft text-sm">Auch: {aliases.join(' · ')}</p>}
      {info.kind !== 'source' && <p className="lead mt-5 max-w-3xl">{info.summary}</p>}
      {longText && <p className="lead mt-5 max-w-3xl">{longText}</p>}
      {source?.note && <p className="soft mt-3 max-w-3xl">{source.note}</p>}

      {(details.length > 0 || info.regions.length > 0) && (
        <dl className="mt-8 card p-5 grid sm:grid-cols-[10rem_1fr] gap-x-6 gap-y-3 text-sm max-w-3xl">
          {details.map((d) => (
            <div key={d.label} className="contents">
              <dt className="muted">{d.label}</dt>
              <dd>{d.value}</dd>
            </div>
          ))}
          {info.regions.length > 0 && (
            <div className="contents">
              <dt className="muted">Regionen</dt>
              <dd className="flex flex-wrap gap-x-3">
                {info.regions.map((r) => (
                  <Link key={r} to={`/suche?region=${r}`} className="link">
                    {regionName(index, r)}
                  </Link>
                ))}
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {mapLink && (
          <Link to={mapLink} className="btn">
            <MapIcon size={16} aria-hidden /> Im Atlas zeigen
          </Link>
        )}
        {info.span && (
          <Link to={`/zeitleiste?jahr=${info.span.start.year}`} className="btn">
            In der Zeitleiste
          </Link>
        )}
        {source?.url && (
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="btn">
            <ExternalLink size={16} aria-hidden /> Website öffnen
          </a>
        )}
      </div>

      {articleMetas.length > 0 && (
        <section>
          <SectionHeading>{info.kind === 'source' ? 'Verwendet in' : 'Ausführlich in'}</SectionHeading>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {articleMetas.map((a) => (
              <ArticleCard key={a.id} article={a} index={index} compact />
            ))}
          </div>
        </section>
      )}

      {uniqueGraph.length > 1 && (
        <section>
          <SectionHeading>Wissensnetz</SectionHeading>
          <KnowledgeGraph center={{ title: info.title, kind: info.kind }} nodes={uniqueGraph} />
        </section>
      )}

      {related
        .filter((r) => r.items.length > 0)
        .map((r, i) => (
          <section key={`${r.kind}-${i}`}>
            <SectionHeading>
              {info.kind === 'event' && r.kind === 'event' ? 'Davor und danach in der Region' : info.kind === 'polity' && r.kind === 'polity' ? 'Vorgänger und Nachfolger' : KIND_LABEL_PLURAL[r.kind]}
            </SectionHeading>
            {r.items.length > 6 || r.kind === 'event' ? (
              <div className="card px-4 py-1">
                {r.items.map((item) => (
                  <EntityRow key={item.id} info={item} showKind={false} />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {r.items.map((item) => (
                  <EntityChip key={item.id} info={item} />
                ))}
              </div>
            )}
          </section>
        ))}

      <NotesPanel target={{ kind: info.kind, id: info.id, title: info.title }} />
    </PageContainer>
  )
}
