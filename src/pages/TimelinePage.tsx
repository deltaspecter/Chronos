import { ArrowRight, List, Minus, Plus, Rows3, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { DateSpan, PageContainer } from '@/components/ui.tsx'
import { WithData } from '@/components/WithData.tsx'
import type { Indexed } from '@/data/index.ts'
import { regionName } from '@/lib/entities.ts'
import { density, ticks, tickLabel, totalWidth, xToYear, yearToX } from '@/lib/timeScale.ts'
import { useTitle } from '@/lib/useTitle.ts'
import { astro, fromAstro, formatYear, type HSpan } from '@/shared/dates.ts'
import { entityHref, KIND_LABEL } from '@/shared/routes.ts'
import type { Certainty, EntityKind } from '@/shared/types.ts'

interface TItem {
  key: string
  kind: EntityKind
  id: string
  title: string
  span: HSpan
  start: number
  end: number
  point: boolean
  approx: boolean
  uncertain: boolean
  certainty?: Certainty
  weight: number
  regions: string[]
  themes: string[]
  summary: string
  lane: string
  articles: string[]
}

const ZOOMS = [0.6, 1, 2, 4, 8, 16, 32]
const LANE_ROW = 30
const LABEL_CHAR = 6.6

function buildItems(index: Indexed): TItem[] {
  const laneOf = (regions: string[]): string => {
    if (regions.includes('welt')) return 'global'
    for (const r of regions) {
      const lane = index.taxonomy.lanes.find((l) => l.id !== 'global' && l.regions.some((lr) => index.regionDescendants.get(lr)?.has(r)))
      if (lane) return lane.id
    }
    return 'global'
  }
  const items: TItem[] = []
  const push = (kind: EntityKind, id: string, title: string, span: HSpan | undefined, extra: Partial<TItem> & { regions: string[] }) => {
    if (!span) return
    const start = astro(span.start)
    const end = span.end ? astro(span.end) : start
    items.push({
      key: `${kind}:${id}`,
      kind,
      id,
      title,
      span,
      start,
      end,
      point: !span.end || end - start < 1,
      approx: !!(span.start.approx || span.end?.approx),
      uncertain: !!(span.start.uncertain || span.end?.uncertain),
      weight: 2,
      themes: [],
      summary: '',
      lane: laneOf(extra.regions),
      articles: [],
      ...extra,
    })
  }
  for (const e of index.rootEpochs) push('epoch', e.id, e.title, e.span, { regions: ['welt'], lane: 'epochen', weight: 1, summary: e.summary, articles: e.articles })
  for (const e of index.entities.events)
    push('event', e.id, e.title, e.span, {
      regions: e.regions,
      themes: e.themes,
      weight: e.weight,
      certainty: e.certainty,
      uncertain: e.certainty === 'unsicher' || e.certainty === 'umstritten' || !!e.span.start.uncertain,
      summary: e.summary,
      articles: e.articles,
    })
  for (const p of index.entities.polities) push('polity', p.id, p.name, p.span, { regions: p.regions, themes: p.themes, weight: p.weight, summary: p.summary, articles: p.articles })
  for (const p of index.entities.persons) push('person', p.id, p.name, p.span, { regions: p.regions, themes: p.themes, weight: 3, summary: p.summary, articles: p.articles })
  return items
}

export default function TimelinePage() {
  useTitle('Zeitleiste')
  return <WithData>{(index) => <Timeline index={index} />}</WithData>
}

function Timeline({ index }: { index: Indexed }) {
  const [params, setParams] = useSearchParams()
  const allItems = useMemo(() => buildItems(index), [index])
  const [view, setView] = useState<'leiste' | 'liste'>(() => (typeof window !== 'undefined' && window.innerWidth < 720 ? 'liste' : 'leiste'))
  const [zoomIdx, setZoomIdx] = useState(params.get('von') ? 3 : 1)
  const [showPersons, setShowPersons] = useState(false)
  const [showPolities, setShowPolities] = useState(true)
  const [lanes, setLanes] = useState<Set<string>>(() => new Set(index.taxonomy.lanes.map((l) => l.id)))
  const theme = params.get('thema') ?? ''
  const [selected, setSelected] = useState<TItem | null>(null)
  const zoom = ZOOMS[zoomIdx]

  const filtered = allItems.filter(
    (i) =>
      (i.kind !== 'person' || showPersons) &&
      (i.kind !== 'polity' || showPolities) &&
      (i.lane === 'epochen' || lanes.has(i.lane)) &&
      (!theme || i.kind === 'epoch' || i.themes.includes(theme)),
  )

  const setTheme = (t: string) => {
    const next = new URLSearchParams(params)
    if (t) next.set('thema', t)
    else next.delete('thema')
    setParams(next, { replace: true })
  }

  const usedThemes = useMemo(() => {
    const s = new Set<string>()
    allItems.forEach((i) => i.themes.forEach((t) => s.add(t)))
    return index.taxonomy.themes.filter((t) => s.has(t.id))
  }, [allItems, index])

  return (
    <div className="pt-8 lg:pt-12">
      <PageContainer wide>
        <p className="eyebrow mb-3">Zeitleiste</p>
        <h1 className="page-title">Parallele Geschichte</h1>
        <p className="lead mt-4 max-w-3xl">
          Ereignisse, Staaten und Persönlichkeiten nebeneinander, nach Weltregionen geordnet. Die Zeitleiste ist ein Werkzeug zur Orientierung – die Zusammenhänge erklären die Artikel.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[var(--line-strong)] overflow-hidden" role="group" aria-label="Ansicht">
            <button className={`px-3 py-1.5 text-sm inline-flex items-center gap-1.5 ${view === 'leiste' ? 'bg-[var(--gold-faint)] text-[var(--gold)]' : ''}`} aria-pressed={view === 'leiste'} onClick={() => setView('leiste')}>
              <Rows3 size={15} aria-hidden /> Zeitleiste
            </button>
            <button className={`px-3 py-1.5 text-sm inline-flex items-center gap-1.5 ${view === 'liste' ? 'bg-[var(--gold-faint)] text-[var(--gold)]' : ''}`} aria-pressed={view === 'liste'} onClick={() => setView('liste')}>
              <List size={15} aria-hidden /> Liste
            </button>
          </div>
          <select className="input !min-h-0 !w-auto py-1.5 text-sm" value={theme} onChange={(e) => setTheme(e.target.value)} aria-label="Nach Thema filtern">
            <option value="">Alle Themen</option>
            {usedThemes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <button className="chip" aria-pressed={showPolities} onClick={() => setShowPolities((v) => !v)}>
            Staaten und Reiche
          </button>
          <button className="chip" aria-pressed={showPersons} onClick={() => setShowPersons((v) => !v)}>
            Persönlichkeiten
          </button>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="Regionen">
          {index.taxonomy.lanes.map((l) => (
            <button
              key={l.id}
              className="chip"
              aria-pressed={lanes.has(l.id)}
              onClick={() =>
                setLanes((s) => {
                  const n = new Set(s)
                  if (n.has(l.id)) n.delete(l.id)
                  else n.add(l.id)
                  return n
                })
              }
            >
              {l.name}
            </button>
          ))}
        </div>
      </PageContainer>

      {view === 'leiste' ? (
        <Chart index={index} items={filtered} zoom={zoom} zoomIdx={zoomIdx} setZoomIdx={setZoomIdx} lanes={lanes} onSelect={setSelected} selected={selected} />
      ) : (
        <PageContainer>
          <ListView items={filtered.filter((i) => i.kind !== 'epoch')} index={index} onSelect={setSelected} />
        </PageContainer>
      )}

      <PageContainer wide>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs muted">
          <span className="inline-flex items-center gap-2">
            <span className="tl-dot" /> Ereignis
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-8 h-2.5 rounded-sm bg-[color-mix(in_srgb,var(--c-quelle)_35%,transparent)] border border-[var(--c-quelle)]" /> Staat / Reich
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-8 h-2.5 rounded-sm border border-dashed border-[var(--c-offen)]" /> unsichere oder umstrittene Datierung
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-8 h-2.5 rounded-sm tl-approx bg-[var(--text-muted)]" /> ungefähre Datierung
          </span>
          <span>Senkrechte Linien markieren Wechsel der Zeitskala.</span>
        </div>
      </PageContainer>

      {selected && <Detail item={selected} index={index} onClose={() => setSelected(null)} />}
    </div>
  )
}

interface Placed extends TItem {
  x0: number
  x1: number
  row: number
}

function layout(items: TItem[], zoom: number): { placed: Placed[]; rows: number } {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.weight - b.weight)
  const rowEnds: number[] = []
  const placed: Placed[] = []
  for (const item of sorted) {
    const x0 = yearToX(item.start, zoom)
    const x1 = item.point ? x0 : Math.max(x0 + 4, yearToX(item.end, zoom))
    const labelEnd = (item.point ? x0 + 12 : x0 + 6) + item.title.length * LABEL_CHAR + 14
    const occupied = Math.max(x1, labelEnd)
    let row = rowEnds.findIndex((end) => end < x0 - 4)
    if (row === -1) {
      row = rowEnds.length
      rowEnds.push(occupied)
    } else rowEnds[row] = occupied
    placed.push({ ...item, x0, x1, row })
  }
  return { placed, rows: Math.max(1, rowEnds.length) }
}

function Chart({
  index,
  items,
  zoom,
  zoomIdx,
  setZoomIdx,
  lanes,
  onSelect,
  selected,
}: {
  index: Indexed
  items: TItem[]
  zoom: number
  zoomIdx: number
  setZoomIdx: (i: number) => void
  lanes: Set<string>
  onSelect: (i: TItem) => void
  selected: TItem | null
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const [params] = useSearchParams()
  const centerYear = useRef<number | null>(null)
  const [jump, setJump] = useState('')
  const width = totalWidth(zoom)
  const LABEL_W = 0

  // Sichtbarkeit nach Zoom: grobe Skala zeigt nur bedeutende Einträge
  const visible = items.filter((i) => i.weight <= (zoom >= 4 ? 3 : zoom >= 1 ? 2 : 1) || i.kind === 'epoch')

  const laneDefs = [{ id: 'epochen', name: 'Epochen' }, ...index.taxonomy.lanes.filter((l) => lanes.has(l.id))]
  const laneLayouts = laneDefs.map((l) => ({ lane: l, ...layout(visible.filter((i) => i.lane === l.id), zoom) }))

  const scrollToYear = (astroYear: number, smooth = true) => {
    const el = scroller.current
    if (!el) return
    el.scrollTo({ left: yearToX(astroYear, zoom) - el.clientWidth / 2 + LABEL_W, behavior: smooth ? 'smooth' : 'auto' })
  }

  // Beim Zoomen die Mitte beibehalten
  const changeZoom = (next: number) => {
    const el = scroller.current
    if (el) centerYear.current = xToYear(el.scrollLeft + el.clientWidth / 2, zoom)
    setZoomIdx(Math.max(0, Math.min(ZOOMS.length - 1, next)))
  }
  useLayoutEffect(() => {
    if (centerYear.current !== null) {
      scrollToYear(centerYear.current, false)
      centerYear.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom])

  // Startposition aus der URL (?jahr=… oder ?von=…&bis=…)
  useEffect(() => {
    const jahr = params.get('jahr') ?? params.get('von')
    const bis = params.get('bis')
    if (jahr) {
      const from = Number(jahr)
      const to = bis ? Number(bis) : from
      if (!Number.isNaN(from)) {
        const a = from < 0 ? from + 1 : from
        const b = to < 0 ? to + 1 : to
        scrollToYear((a + b) / 2, false)
        return
      }
    }
    scrollToYear(-500, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doJump = () => {
    const m = /^(-?\d+)\s*(v)?/i.exec(jump.trim().replace(/\./g, ''))
    if (!m) return
    let y = Number(m[1])
    if (m[2] || y < 0) y = -Math.abs(y)
    scrollToYear(y < 0 ? y + 1 : y)
  }

  const segBoundaries = [-100_000, -10_000, -3_500, -500, 500, 1500, 1800]
  const axisTicks = ticks(zoom)

  return (
    <div className="mt-5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-wrap items-center gap-2 mb-2">
        <div className="flex items-center gap-1" role="group" aria-label="Zeitskala">
          <button className="icon-btn" onClick={() => changeZoom(zoomIdx - 1)} disabled={zoomIdx === 0} aria-label="Gröbere Zeitskala">
            <Minus size={18} />
          </button>
          <span className="text-xs muted w-28 text-center">{zoom < 1 ? 'Gesamtüberblick' : zoom < 4 ? 'Grobe Skala' : 'Detaillierte Skala'}</span>
          <button className="icon-btn" onClick={() => changeZoom(zoomIdx + 1)} disabled={zoomIdx === ZOOMS.length - 1} aria-label="Feinere Zeitskala">
            <Plus size={18} />
          </button>
        </div>
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            doJump()
          }}
        >
          <input className="input !min-h-0 py-1.5 w-36 text-sm" placeholder="Jahr, z. B. -44" value={jump} onChange={(e) => setJump(e.target.value)} aria-label="Zu Jahr springen (negativ für v. Chr.)" />
          <button className="btn min-h-0 py-1.5 text-sm">Gehe zu</button>
        </form>
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {[
            [-10000, '10.000 v.'],
            [-3000, '3000 v.'],
            [-500, '500 v.'],
            [1, '1 n.'],
            [1000, '1000'],
            [1500, '1500'],
            [1800, '1800'],
            [1945, '1945'],
          ].map(([y, l]) => (
            <button key={l} className="chip !py-1" onClick={() => scrollToYear(y as number)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={scroller}
        className="tl-scroller relative overflow-x-auto overflow-y-hidden border-y border-[var(--line)] bg-[var(--bg-sunken)]"
        tabIndex={0}
        aria-label="Zeitleiste – horizontal scrollen"
        onKeyDown={(e) => {
          if (e.key === '+') changeZoom(zoomIdx + 1)
          if (e.key === '-') changeZoom(zoomIdx - 1)
        }}
      >
        <div className="relative" style={{ width: width + 200 }}>
          {/* Achse */}
          <div className="sticky top-0 z-10 h-8 border-b border-[var(--line)] bg-[var(--bg-elev)]">
            {axisTicks.map((t) => (
              <span key={`${t.year}-${t.x}`} className="absolute top-0 h-full text-[0.7rem] muted pl-1 border-l border-[var(--line)] flex items-center whitespace-nowrap" style={{ left: t.x + 40 }}>
                {tickLabel(t.year)}
              </span>
            ))}
          </div>
          {/* Skalenwechsel */}
          {segBoundaries.map((y) => (
            <div key={y} className="absolute top-8 bottom-0 border-l border-dashed border-[var(--gold-faint)] pointer-events-none" style={{ left: yearToX(y, zoom) + 40 }} aria-hidden>
              <span className="absolute -top-0 left-1 text-[0.6rem] text-[var(--gold-soft)] opacity-70 whitespace-nowrap">
                {density(y + 1, zoom) >= 1 ? `${density(y + 1, zoom).toFixed(1).replace('.', ',')} px/Jahr` : `1 px ≙ ${Math.round(1 / density(y + 1, zoom)).toLocaleString('de-DE')} J.`}
              </span>
            </div>
          ))}
          {laneLayouts.map(({ lane, placed, rows }) => (
            <section key={lane.id} className="relative border-b border-[var(--line)]" style={{ height: rows * LANE_ROW + 28 }} aria-label={lane.name}>
              <h3 className="sticky left-0 z-[5] inline-block text-[0.68rem] uppercase tracking-[0.12em] font-semibold text-[var(--gold)] bg-[var(--bg-sunken)]/90 px-3 py-1 rounded-br-md">
                {lane.name}
              </h3>
              {placed.map((item) => (
                <button
                  key={item.key}
                  className={`tl-item tl-${item.kind} ${item.point ? 'tl-point' : 'tl-bar'} ${item.uncertain ? 'tl-uncertain' : ''} ${item.approx ? 'tl-approx' : ''} ${selected?.key === item.key ? 'tl-selected' : ''}`}
                  style={{ left: item.x0 + 40, top: item.row * LANE_ROW + 26, width: item.point ? undefined : Math.max(6, item.x1 - item.x0) }}
                  onClick={() => onSelect(item)}
                  title={`${item.title} (${KIND_LABEL[item.kind]})`}
                >
                  {item.point && <span className="tl-dot" aria-hidden />}
                  <span className="tl-label">{item.title}</span>
                  {item.uncertain && <span className="sr-only"> – Datierung unsicher</span>}
                </button>
              ))}
            </section>
          ))}
        </div>
      </div>
      <p className="mx-auto max-w-7xl px-4 sm:px-6 text-xs muted mt-2">Tipp: Horizontal wischen oder scrollen; mit + und − die Zeitskala wechseln. Einträge antippen für Details.</p>
    </div>
  )
}

function ListView({ items, index, onSelect }: { items: TItem[]; index: Indexed; onSelect: (i: TItem) => void }) {
  const [limit, setLimit] = useState(400)
  const sorted = [...items].sort((a, b) => a.start - b.start)
  const groups = new Map<string, TItem[]>()
  for (const item of sorted.slice(0, limit)) {
    const y = fromAstro(item.start)
    let key: string
    if (y <= -20000) key = 'Tiefenzeit'
    else if (y < -3000) key = `${Math.ceil(-y / 1000)}. Jahrtausend v. Chr.`
    else if (y < 0) key = `${Math.ceil(-y / 100)}. Jahrhundert v. Chr.`
    else key = `${Math.ceil(y / 100)}. Jahrhundert`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  return (
    <div className="mt-6 flex flex-col gap-6">
      {[...groups.entries()].map(([key, list]) => (
        <section key={key}>
          <h2 className="font-display text-xl text-[var(--gold)] sticky top-[calc(var(--header-h)+var(--safe-top))] bg-[var(--bg)] py-1 z-10">{key}</h2>
          <ol className="border-l border-[var(--line-strong)] ml-1.5 mt-1">
            {list.map((item) => (
              <li key={item.key} className="relative pl-5 py-2">
                <span
                  className={`absolute -left-[5px] top-[1.05rem] w-2.5 h-2.5 rounded-full ${item.kind === 'polity' ? 'bg-[var(--c-quelle)]' : item.kind === 'person' ? 'bg-[var(--c-deutung)]' : 'bg-[var(--gold)]'}`}
                  aria-hidden
                />
                <button className="text-left w-full group" onClick={() => onSelect(item)}>
                  <span className="text-xs muted">
                    <DateSpan span={item.span} /> · {KIND_LABEL[item.kind]} · {regionName(index, item.regions[0] ?? 'welt')}
                    {item.uncertain && ' · Datierung unsicher'}
                  </span>
                  <span className="block font-medium group-hover:text-[var(--gold)]">{item.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}
      {sorted.length > limit && (
        <button className="btn self-start" onClick={() => setLimit((l) => l + 400)}>
          Weitere Einträge laden
        </button>
      )}
    </div>
  )
}

function Detail({ item, index, onClose }: { item: TItem; index: Indexed; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const articles = item.articles.map((a) => index.articleById.get(a)).filter((a): a is NonNullable<typeof a> => !!a)
  return (
    <>
      <div className="sheet-backdrop md:hidden" onClick={onClose} aria-hidden />
      <div className="sheet" role="dialog" aria-label={item.title}>
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-xs muted">
                {KIND_LABEL[item.kind]} · <DateSpan span={item.span} />
              </p>
              <h2 className="font-display text-2xl leading-tight mt-1">{item.title}</h2>
            </div>
            <button className="icon-btn" onClick={onClose} aria-label="Schließen">
              <X size={20} />
            </button>
          </div>
          {item.uncertain && <p className="text-xs text-[var(--c-offen)] mt-2">Die Datierung ist unsicher oder in der Forschung umstritten.</p>}
          {item.summary && <p className="soft mt-3 text-[0.95rem]">{item.summary}</p>}
          <p className="text-xs muted mt-3">{item.regions.map((r) => regionName(index, r)).join(' · ')}</p>
          <div className="mt-4 flex flex-col gap-2">
            {articles.map((a) => (
              <Link key={a.id} to={`/artikel/${a.slug}`} className="card-link p-3 flex items-center gap-2">
                <span className="flex-1">
                  <span className="text-xs muted block">Ausführlicher Artikel</span>
                  <span className="font-medium">{a.title}</span>
                </span>
                <ArrowRight size={16} className="text-[var(--gold)]" aria-hidden />
              </Link>
            ))}
            <Link to={entityHref(item.kind, item.id)} className="btn self-start mt-1">
              Eintrag öffnen
            </Link>
          </div>
          <p className="text-xs muted mt-4">{formatYear(fromAstro(item.start), { era: 'always' })}</p>
        </div>
      </div>
    </>
  )
}
