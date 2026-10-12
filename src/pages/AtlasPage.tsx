/**
 * Historischer Atlas.
 * Kartengrundlage: Natural Earth 1:50 Mio. (gemeinfrei) über das npm-Paket world-atlas.
 * Die Kartendaten werden mit dieser Seite geladen und vom Service Worker gespeichert –
 * der Atlas funktioniert damit auch offline und ohne Kartendienst eines Drittanbieters.
 */
import { geoEqualEarth, geoGraticule10, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import { select } from 'd3-selection'
import 'd3-transition'
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { Crosshair, Info, Minus, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import land50 from 'world-atlas/land-50m.json'
import { DateSpan, PageContainer } from '@/components/ui.tsx'
import { WithData } from '@/components/WithData.tsx'
import type { Indexed } from '@/data/index.ts'
import { regionName } from '@/lib/entities.ts'
import { totalWidth, xToYear, yearToX } from '@/lib/timeScale.ts'
import { useTitle } from '@/lib/useTitle.ts'
import { astro, formatYear, fromAstro, overlaps } from '@/shared/dates.ts'
import type { Place, Route, Territory } from '@/shared/types.ts'

type Category = Place['categories'][number]

const CATEGORIES: { id: Category; label: string; color: string }[] = [
  { id: 'hauptstadt', label: 'Hauptstädte', color: 'var(--gold)' },
  { id: 'stadt', label: 'Städte', color: 'var(--text-soft)' },
  { id: 'kulturzentrum', label: 'Kulturelle Zentren', color: 'var(--c-deutung)' },
  { id: 'heiligtum', label: 'Heiligtümer', color: 'var(--c-quelle)' },
  { id: 'fundstaette', label: 'Fundstätten', color: 'var(--c-befund)' },
  { id: 'schlachtfeld', label: 'Schlachtfelder', color: 'var(--danger)' },
  { id: 'hafen', label: 'Häfen', color: 'var(--c-perspektive)' },
]

function placeColor(p: Place): string {
  for (const c of CATEGORIES) if (p.categories.includes(c.id)) return c.color
  return 'var(--text-soft)'
}

const landFeature = feature(land50 as unknown as Topology, (land50 as unknown as Topology).objects.land) as unknown as FeatureCollection

export default function AtlasPage() {
  useTitle('Historischer Atlas')
  return <WithData>{(index) => <Atlas index={index} />}</WithData>
}

type Selection = { kind: 'place'; item: Place } | { kind: 'route'; item: Route } | { kind: 'territory'; item: Territory } | null

function Atlas({ index }: { index: Indexed }) {
  const [params] = useSearchParams()
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [k, setK] = useState(1)
  const [size, setSize] = useState({ w: 960, h: 560 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const [cats, setCats] = useState<Set<Category>>(() => new Set(CATEGORIES.map((c) => c.id)))
  const [showRoutes, setShowRoutes] = useState(true)
  const [showTerritories, setShowTerritories] = useState(true)
  const [timeOn, setTimeOn] = useState(!!params.get('jahr'))
  const [sliderX, setSliderX] = useState(() => {
    const j = params.get('jahr')
    return j ? yearToX(astro({ year: Number(j) }), 1) : yearToX(-200, 1)
  })
  const [selected, setSelected] = useState<Selection>(null)
  const year = Math.round(xToYear(sliderX, 1))

  // Größe an den Container anpassen
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      setSize({ w, h: Math.max(360, Math.min(window.innerHeight * 0.7, w * 0.62)) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const projection = useMemo(() => geoEqualEarth().fitExtent([[8, 8], [size.w - 8, size.h - 8]], { type: 'Sphere' } as GeoPermissibleObjects), [size])
  const path = useMemo(() => geoPath(projection), [projection])
  const landPath = useMemo(() => path(landFeature) ?? '', [path])
  const graticulePath = useMemo(() => path(geoGraticule10()) ?? '', [path])
  const spherePath = useMemo(() => path({ type: 'Sphere' } as GeoPermissibleObjects) ?? '', [path])

  // Zoom/Pan
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 40])
      .translateExtent([
        [0, 0],
        [size.w, size.h],
      ])
      .on('zoom', (event) => {
        gRef.current?.setAttribute('transform', event.transform.toString())
        setK(event.transform.k)
      })
    zoomRef.current = z
    select(svg).call(z)
    return () => {
      select(svg).on('.zoom', null)
    }
  }, [size])

  const zoomTo = (lon: number, lat: number, scale: number) => {
    const svg = svgRef.current
    const z = zoomRef.current
    const p = projection([lon, lat])
    if (!svg || !z || !p) return
    const t = zoomIdentity.translate(size.w / 2 - p[0] * scale, size.h / 2 - p[1] * scale).scale(scale)
    select(svg).transition().duration(600).call(z.transform, t)
  }
  const zoomBy = (factor: number) => {
    const svg = svgRef.current
    const z = zoomRef.current
    if (svg && z) select(svg).transition().duration(300).call(z.scaleBy, factor)
  }

  // Auswahl aus der URL
  useEffect(() => {
    const ort = params.get('ort')
    const route = params.get('route')
    const staat = params.get('staat')
    const t = setTimeout(() => {
      if (ort) {
        const p = index.placeById.get(ort)
        if (p) {
          setSelected({ kind: 'place', item: p })
          zoomTo(p.coords[0], p.coords[1], 6)
        }
      } else if (route) {
        const r = index.routeById.get(route)
        if (r) {
          setSelected({ kind: 'route', item: r })
          const mid = r.path[Math.floor(r.path.length / 2)]
          zoomTo(mid[0], mid[1], 2.5)
        }
      } else if (staat) {
        const terr = index.entities.territories.find((t) => t.polity === staat)
        const pol = index.polityById.get(staat)
        if (terr) {
          setSelected({ kind: 'territory', item: terr })
          const ring = terr.rings[0]
          const lon = ring.reduce((s, c) => s + c[0], 0) / ring.length
          const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length
          zoomTo(lon, lat, 3)
        } else if (pol?.capital) {
          const p = index.placeById.get(pol.capital)
          if (p) {
            setSelected({ kind: 'place', item: p })
            zoomTo(p.coords[0], p.coords[1], 5)
          }
        }
      }
    }, 50)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, projection])

  // Zeitfilter: Fenster abhängig von der Dichte der Epoche
  const windowYears = year < -3000 ? 1000 : year < -500 ? 250 : year < 1500 ? 100 : 40
  const placeActive = (p: Place): boolean => {
    if (!timeOn) return true
    if (p.span && overlaps(p.span, year - windowYears, year + windowYears)) return true
    return p.events.some((id) => {
      const e = index.eventById.get(id)
      return e && overlaps(e.span, year - windowYears, year + windowYears)
    })
  }

  const places = index.entities.places.filter((p) => p.categories.some((c) => cats.has(c)) && placeActive(p))
  const routes = showRoutes ? index.entities.routes.filter((r) => !timeOn || overlaps(r.span, year, year)) : []
  const territories = showTerritories ? index.entities.territories.filter((t) => !timeOn || overlaps(t.span, year - windowYears, year + windowYears)) : []

  const r = 4.5 / Math.sqrt(k)
  const sw = 1 / k

  return (
    <div className="pt-8 lg:pt-12">
      <PageContainer wide>
        <p className="eyebrow mb-3">Historischer Atlas</p>
        <h1 className="page-title">Orte, Wege und Reiche</h1>
        <p className="lead mt-4 max-w-3xl">
          Stätten der Geschichte auf der Weltkarte – mit Filtern nach Zeit und Art. Historische Grenzen sind zeitgebundene, teils unsichere Rekonstruktionen und werden ausdrücklich als
          schematisch gekennzeichnet.
        </p>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="Kategorien">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className="chip"
              aria-pressed={cats.has(c.id)}
              onClick={() =>
                setCats((s) => {
                  const n = new Set(s)
                  if (n.has(c.id)) n.delete(c.id)
                  else n.add(c.id)
                  return n
                })
              }
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: c.color }} aria-hidden />
              {c.label}
            </button>
          ))}
          <button className="chip" aria-pressed={showRoutes} onClick={() => setShowRoutes((v) => !v)}>
            Routen
          </button>
          <button className="chip" aria-pressed={showTerritories} onClick={() => setShowTerritories((v) => !v)}>
            Reiche (schematisch)
          </button>
        </div>

        <div className="mt-3 card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="flex items-center gap-2 text-sm shrink-0 cursor-pointer">
            <input type="checkbox" className="w-5 h-5 accent-[var(--gold)]" checked={timeOn} onChange={(e) => setTimeOn(e.target.checked)} />
            Zeitfilter
          </label>
          <input
            type="range"
            min={yearToX(-10000, 1)}
            max={totalWidth(1)}
            step={1}
            value={sliderX}
            disabled={!timeOn}
            onChange={(e) => {
              setSliderX(Number(e.target.value))
              setTimeOn(true)
            }}
            className="flex-1 accent-[var(--gold)]"
            aria-label="Zeitpunkt"
            aria-valuetext={formatYear(fromAstro(year), { era: 'always' })}
          />
          <span className={`text-sm w-40 shrink-0 ${timeOn ? '' : 'muted'}`}>
            {timeOn ? `${formatYear(fromAstro(year), { era: 'always' })} (± ${windowYears} J.)` : 'Alle Zeiten'}
          </span>
        </div>
      </PageContainer>

      <div className="mx-auto max-w-7xl sm:px-6 mt-4">
        <div ref={wrapRef} className="relative sm:rounded-xl overflow-hidden border-y sm:border border-[var(--line)] bg-[var(--map-water)]">
          <svg ref={svgRef} width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} className="block touch-none select-none" role="img" aria-label="Weltkarte mit historischen Orten">
            <g ref={gRef}>
              <path d={spherePath} fill="var(--map-water)" />
              <path d={graticulePath} fill="none" stroke="var(--map-graticule)" strokeWidth={sw} />
              <path d={landPath} fill="var(--map-land)" stroke="var(--map-land-line)" strokeWidth={0.6 * sw} />
              {territories.map((t) => {
                const d = path({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: t.rings.map((ring) => [...ring].reverse()) } as Polygon | MultiPolygon }) ?? ''
                const isSel = selected?.kind === 'territory' && selected.item.id === t.id
                return (
                  <path
                    key={t.id}
                    d={d}
                    fill="url(#hatch)"
                    stroke="var(--c-quelle)"
                    strokeWidth={(isSel ? 2.2 : 1.2) * sw}
                    strokeDasharray={`${4 * sw} ${3 * sw}`}
                    className="cursor-pointer"
                    onClick={() => setSelected({ kind: 'territory', item: t })}
                  >
                    <title>{`${t.name} (schematisch)`}</title>
                  </path>
                )
              })}
              {routes.map((route) => {
                const d = path({ type: 'LineString', coordinates: route.path }) ?? ''
                const isSel = selected?.kind === 'route' && selected.item.id === route.id
                return (
                  <g key={route.id} className="cursor-pointer" onClick={() => setSelected({ kind: 'route', item: route })}>
                    <path d={d} fill="none" stroke="transparent" strokeWidth={12 * sw} />
                    <path d={d} fill="none" stroke="var(--gold)" strokeOpacity={isSel ? 1 : 0.7} strokeWidth={(isSel ? 2.6 : 1.6) * sw} strokeDasharray={route.schematic ? `${6 * sw} ${4 * sw}` : undefined}>
                      <title>{route.name}</title>
                    </path>
                  </g>
                )
              })}
              {places.map((p) => {
                const xy = projection(p.coords)
                if (!xy) return null
                const isSel = selected?.kind === 'place' && selected.item.id === p.id
                return (
                  <g key={p.id} transform={`translate(${xy[0]},${xy[1]})`} className="cursor-pointer atlas-place" onClick={() => setSelected({ kind: 'place', item: p })}>
                    <circle r={10 * sw} fill="transparent" />
                    {p.location !== 'exakt' && <circle r={r * 2.2} fill="none" stroke={placeColor(p)} strokeOpacity={0.5} strokeWidth={sw} strokeDasharray={`${2 * sw} ${2 * sw}`} />}
                    <circle r={isSel ? r * 1.5 : r} fill={placeColor(p)} stroke="var(--bg)" strokeWidth={1.4 * sw} />
                    {(k > 3.5 || isSel) && (
                      <text x={r + 3 * sw} y={3.5 * sw} fontSize={12 * sw} fill="var(--text)" style={{ paintOrder: 'stroke', stroke: 'var(--map-land)', strokeWidth: 3 * sw }}>
                        {p.name}
                      </text>
                    )}
                    <title>{p.name}</title>
                  </g>
                )
              })}
            </g>
            <defs>
              <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="color-mix(in srgb, var(--c-quelle) 10%, transparent)" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--c-quelle)" strokeOpacity="0.35" strokeWidth="1.5" />
              </pattern>
            </defs>
          </svg>
          <div className="absolute right-3 top-3 flex flex-col gap-1 card p-1 shadow-[var(--shadow)]">
            <button className="icon-btn" onClick={() => zoomBy(1.8)} aria-label="Hineinzoomen">
              <Plus size={18} />
            </button>
            <button className="icon-btn" onClick={() => zoomBy(1 / 1.8)} aria-label="Herauszoomen">
              <Minus size={18} />
            </button>
            <button
              className="icon-btn"
              onClick={() => {
                const svg = svgRef.current
                if (svg && zoomRef.current) select(svg).transition().duration(500).call(zoomRef.current.transform, zoomIdentity)
              }}
              aria-label="Gesamtansicht"
            >
              <Crosshair size={18} />
            </button>
          </div>
          {selected && <AtlasDetail selection={selected} index={index} onClose={() => setSelected(null)} />}
        </div>
        <p className="text-xs muted mt-2 px-4 sm:px-0">
          Kartengrundlage: Natural Earth (gemeinfrei). Gestrichelte Kreise: ungefähre oder umstrittene Lage. Gestrichelte Linien: schematischer Routenverlauf über Hauptstationen. Schraffierte
          Flächen: grob vereinfachte Herrschaftsgebiete zu einem Stichjahr.
        </p>
      </div>

      <PageContainer wide>
        <section className="mt-10" aria-labelledby="ortsliste">
          <h2 id="ortsliste" className="section-title mb-1">
            In der aktuellen Auswahl
          </h2>
          <p className="text-sm muted mb-4">
            {places.length} Orte{routes.length ? `, ${routes.length} Routen` : ''}
            {territories.length ? `, ${territories.length} Herrschaftsgebiete` : ''}
          </p>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6">
            {[...places]
              .sort((a, b) => a.name.localeCompare(b.name, 'de'))
              .map((p) => (
                <li key={p.id} className="border-b border-[var(--line)]">
                  <button
                    className="w-full text-left py-2.5 flex items-center gap-2 hover:text-[var(--gold)]"
                    onClick={() => {
                      setSelected({ kind: 'place', item: p })
                      zoomTo(p.coords[0], p.coords[1], 6)
                      wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                  >
                    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: placeColor(p) }} aria-hidden />
                    <span className="flex-1">{p.name}</span>
                    <span className="text-xs muted">{regionName(index, p.regions[0])}</span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      </PageContainer>
    </div>
  )
}

function AtlasDetail({ selection, index, onClose }: { selection: NonNullable<Selection>; index: Indexed; onClose: () => void }) {
  let title = ''
  let body: ReactNode = null
  let href = ''
  if (selection.kind === 'place') {
    const p = selection.item
    title = p.name
    href = `/ort/${p.id}`
    body = (
      <>
        {p.modernName && <p className="text-xs muted">Heute: {p.modernName}</p>}
        <p className="soft text-sm mt-2">{p.summary}</p>
        {p.location !== 'exakt' && <p className="text-xs text-[var(--c-offen)] mt-2">Lage {p.location === 'umstritten' ? 'umstritten' : 'nur ungefähr bekannt'}.</p>}
        {p.events.length > 0 && (
          <ul className="mt-3 text-sm flex flex-col gap-1">
            {p.events.slice(0, 4).map((id) => {
              const e = index.eventById.get(id)
              return e ? (
                <li key={id}>
                  <Link to={`/ereignis/${id}`} className="link">
                    {e.title}
                  </Link>{' '}
                  <DateSpan span={e.span} className="muted text-xs" />
                </li>
              ) : null
            })}
          </ul>
        )}
      </>
    )
  } else if (selection.kind === 'route') {
    const r = selection.item
    title = r.name
    href = `/route/${r.id}`
    body = (
      <>
        <p className="text-xs muted">
          <DateSpan span={r.span} />
        </p>
        <p className="soft text-sm mt-2">{r.summary}</p>
        {r.schematic && <p className="text-xs text-[var(--c-offen)] mt-2">Schematischer Verlauf über Hauptstationen.</p>}
      </>
    )
  } else {
    const t = selection.item
    const pol = index.polityById.get(t.polity)
    title = t.name
    href = `/staat/${t.polity}`
    body = (
      <>
        <p className="text-xs muted">
          Stand: <DateSpan span={t.span} />
        </p>
        {pol && <p className="soft text-sm mt-2">{pol.summary}</p>}
        <p className="text-xs text-[var(--c-offen)] mt-2 flex gap-1.5">
          <Info size={14} className="shrink-0 mt-0.5" aria-hidden /> {t.note}
        </p>
        <p className="text-xs muted mt-1">Grundlage: {t.basis}</p>
      </>
    )
  }
  return (
    <div className="absolute left-3 right-3 bottom-3 sm:right-auto sm:w-96 card p-4 shadow-[var(--shadow)] fade-in max-h-[70%] overflow-y-auto" role="dialog" aria-label={title}>
      <div className="flex items-start gap-2">
        <h2 className="font-display text-xl leading-tight flex-1">{title}</h2>
        <button className="icon-btn w-8 h-8" onClick={onClose} aria-label="Schließen">
          <X size={16} />
        </button>
      </div>
      {body}
      <Link to={href} className="btn mt-3 text-sm min-h-0 py-1.5">
        Eintrag öffnen
      </Link>
    </div>
  )
}
