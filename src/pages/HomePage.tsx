import { ArrowRight, BookOpen, Clock, Hourglass, Layers, ListTree, Map, RefreshCw, ShieldCheck, Telescope, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArticleCard } from '@/components/cards.tsx'
import { DateSpan, PageContainer, SectionHeading } from '@/components/ui.tsx'
import { WithData } from '@/components/WithData.tsx'
import { startYear, type Indexed } from '@/data/index.ts'
import { manifest } from '@/data/load.ts'
import { regionName } from '@/lib/entities.ts'
import { useTitle } from '@/lib/useTitle.ts'
import { astro } from '@/shared/dates.ts'
import type { HEvent } from '@/shared/types.ts'
import { useLibrary } from '@/store/library.ts'

export function HomePage() {
  useTitle(undefined)
  return (
    <>
      <Hero />
      <WithData>{(index) => <HomeContent index={index} />}</WithData>
    </>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--line)]">
      <div
        aria-hidden
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          background: 'radial-gradient(60rem 30rem at 85% -10%, var(--gold-faint), transparent 60%), radial-gradient(40rem 20rem at 0% 110%, var(--gold-faint), transparent 60%)',
        }}
      />
      <PageContainer className="relative pt-12 pb-12 sm:pt-20 sm:pb-16">
        <p className="eyebrow mb-4">Enzyklopädie der Menschheitsgeschichte</p>
        <h1 className="font-display text-[clamp(2.6rem,9vw,5rem)] leading-[0.98] max-w-3xl text-balance">
          Die Geschichte der Menschheit – <span className="italic text-[var(--gold)]">lesen, verstehen, entdecken.</span>
        </h1>
        <p className="lead mt-6 max-w-2xl">
          Von den ersten Steinwerkzeugen bis zur Gegenwart: ausführliche, belegte Artikel, ein Wissensnetz aus Personen, Orten und Ereignissen, eine Zeitleiste paralleler Entwicklungen
          und ein historischer Atlas. In Ihrem eigenen Tempo, ohne Ablenkung.
        </p>
        <div className="mt-8">
          <Link to="/inhalt" className="btn btn-primary inline-flex items-center gap-2">
            <ListTree size={18} aria-hidden /> Zum Inhaltsverzeichnis
          </Link>
          <p className="text-xs muted mt-2">Alle Artikel nach Epochen geordnet, dazu Register aller Personen, Orte, Ereignisse und Quellen.</p>
        </div>
        <nav className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl" aria-label="Einstiege">
          {[
            { to: '/epochen', label: 'Epochen', hint: 'Von der Urgeschichte bis heute', icon: Hourglass },
            { to: '/themen', label: 'Themen', hint: 'Politik, Religion, Wirtschaft …', icon: Layers },
            { to: '/zeitleiste', label: 'Zeitleiste', hint: 'Parallele Entwicklungen', icon: Clock },
            { to: '/atlas', label: 'Atlas', hint: 'Orte, Routen, Reiche', icon: Map },
          ].map((item) => (
            <Link key={item.to} to={item.to} className="card-link p-4 flex flex-col gap-1">
              <item.icon size={20} className="text-[var(--gold)] mb-1" aria-hidden />
              <span className="font-medium">{item.label}</span>
              <span className="text-xs muted">{item.hint}</span>
            </Link>
          ))}
        </nav>
      </PageContainer>
    </section>
  )
}

function ContinueReading({ index }: { index: Indexed }) {
  const history = useLibrary((s) => s.history)
  const positions = useLibrary((s) => s.positions)
  const recent = history
    .filter((h) => h.kind === 'article')
    .map((h) => index.articleById.get(h.id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .slice(0, 3)
  if (recent.length === 0) return null
  const [first, ...rest] = recent
  const p = positions[first.id]?.progress ?? 0
  return (
    <section aria-labelledby="weiterlesen">
      <SectionHeading id="weiterlesen" aside={<Link to="/lesezeichen?tab=verlauf" className="text-sm link">Verlauf</Link>}>
        Weiterlesen
      </SectionHeading>
      <div className="grid md:grid-cols-[2fr_1fr] gap-3">
        <Link to={`/artikel/${first.slug}`} className="card-link p-5 flex flex-col gap-2">
          <span className="text-xs muted">Zuletzt geöffnet</span>
          <span className="font-display text-2xl leading-tight">{first.title}</span>
          <span className="soft text-sm line-clamp-2">{first.summary}</span>
          <span className="mt-2 flex items-center gap-3 text-xs muted">
            <span className="block flex-1 max-w-48 h-1 rounded bg-[var(--line)] overflow-hidden">
              <span className="block h-full bg-[var(--gold)]" style={{ width: `${p * 100}%` }} />
            </span>
            {Math.round(p * 100)} % gelesen
          </span>
        </Link>
        <div className="flex flex-col gap-3">
          {rest.map((a) => (
            <Link key={a.id} to={`/artikel/${a.slug}`} className="card-link p-4">
              <span className="font-display text-lg leading-tight block">{a.title}</span>
              <span className="text-xs muted">{Math.round((positions[a.id]?.progress ?? 0) * 100)} % gelesen</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function EpochStrip({ index }: { index: Indexed }) {
  return (
    <section aria-labelledby="epochen-ueberblick">
      <SectionHeading id="epochen-ueberblick" aside={<Link to="/epochen" className="text-sm link">Alle Epochen</Link>}>
        Epochen im Überblick
      </SectionHeading>
      <ol className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:thin]">
        {index.rootEpochs.map((e, i) => (
          <li key={e.id} className="snap-start shrink-0 w-[17rem]">
            <Link to={`/epochen/${e.id}`} className="card-link p-5 h-full flex flex-col gap-2">
              <span className="flex items-center justify-between text-xs muted">
                <span className="font-display text-[var(--gold)] text-lg">{String(i + 1).padStart(2, '0')}</span>
                <DateSpan span={e.span} />
              </span>
              <span className="font-display text-xl leading-tight">{e.title}</span>
              <span className="text-sm soft line-clamp-4">{e.summary}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** „Zur gleichen Zeit“: Ein Ereignis und was zeitgleich in anderen Weltregionen geschah */
function Parallels({ index }: { index: Indexed }) {
  const anchors = useMemo(() => index.entities.events.filter((e) => e.weight <= 2 && astro(e.span.start) > -5000), [index])
  const [pick, setPick] = useState(() => (anchors.length ? Math.floor(new Date().getDate() * 7.31) % anchors.length : 0))
  if (anchors.length === 0) return null
  const anchor = anchors[pick % anchors.length]
  const y = astro(anchor.span.start)
  const window = y < -1000 ? 300 : y < 1000 ? 120 : y < 1800 ? 60 : 25
  const lane = (e: HEvent) => index.taxonomy.lanes.find((l) => e.regions.some((r) => l.regions.some((lr) => index.regionDescendants.get(lr)?.has(r))))?.id
  const anchorLane = lane(anchor)
  const parallels = index.entities.events
    .filter((e) => e.id !== anchor.id && Math.abs(astro(e.span.start) - y) <= window && lane(e) !== anchorLane)
    .sort((a, b) => a.weight - b.weight || Math.abs(astro(a.span.start) - y) - Math.abs(astro(b.span.start) - y))
    .slice(0, 4)
  const polities = index.entities.polities.filter((p) => astro(p.span.start) <= y && astro(p.span.end ?? p.span.start) >= y).slice(0, 6)
  return (
    <section aria-labelledby="gleichzeitig">
      <SectionHeading
        id="gleichzeitig"
        aside={
          <button className="btn btn-ghost text-sm" onClick={() => setPick((p) => p + 1)}>
            <RefreshCw size={15} aria-hidden /> Anderes Beispiel
          </button>
        }
      >
        Zur gleichen Zeit
      </SectionHeading>
      <div className="card p-5 sm:p-6">
        <p className="text-xs muted mb-1">
          <DateSpan span={anchor.span} /> · {regionName(index, anchor.regions[0])}
        </p>
        <Link to={`/ereignis/${anchor.id}`} className="font-display text-2xl hover:text-[var(--gold)]">
          {anchor.title}
        </Link>
        <p className="soft mt-1 text-[0.95rem]">{anchor.summary}</p>
        {parallels.length > 0 ? (
          <>
            <p className="eyebrow mt-6 mb-3">Etwa zur selben Zeit anderswo (± {window} Jahre)</p>
            <ul className="grid sm:grid-cols-2 gap-3">
              {parallels.map((e) => (
                <li key={e.id}>
                  <Link to={`/ereignis/${e.id}`} className="block p-3 rounded-lg border border-[var(--line)] hover:border-[var(--gold-soft)] transition-colors">
                    <span className="text-xs muted">
                      <DateSpan span={e.span} /> · {regionName(index, e.regions[0])}
                    </span>
                    <span className="block font-medium mt-0.5">{e.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm muted mt-6">Für diesen Zeitraum sind in anderen Regionen noch keine Ereignisse erfasst – der Bestand wächst.</p>
        )}
        {polities.length > 0 && (
          <p className="text-sm soft mt-5">
            <span className="muted">Bestehende Staaten und Reiche: </span>
            {polities.map((p, i) => (
              <span key={p.id}>
                {i > 0 && ', '}
                <Link className="link" to={`/staat/${p.id}`}>
                  {p.name}
                </Link>
              </span>
            ))}
          </p>
        )}
        <Link to={`/zeitleiste?jahr=${anchor.span.start.year}`} className="inline-flex items-center gap-1 text-sm link mt-5">
          In der Zeitleiste ansehen <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
    </section>
  )
}

function HomeContent({ index }: { index: Indexed }) {
  const articles = [...index.articles].sort((a, b) => startYear(a.span) - startYear(b.span))
  const series = articles.filter((a) => a.series).sort((a, b) => (a.series!.order ?? 0) - (b.series!.order ?? 0))
  const others = articles.filter((a) => !a.series)
  const c = manifest.counts
  return (
    <PageContainer className="pb-8">
      <ContinueReading index={index} />
      <EpochStrip index={index} />

      <section aria-labelledby="artikel">
        <SectionHeading id="artikel" aside={<Link to="/verzeichnis/artikel" className="text-sm link">Alle Artikel</Link>}>
          Ausführliche Artikel
        </SectionHeading>
        {series.length > 0 && (
          <div className="card p-5 sm:p-6 mb-4">
            <p className="eyebrow mb-1">Artikelreihe</p>
            <p className="font-display text-2xl mb-4">{series[0].series!.title}</p>
            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {series.map((a) => (
                <li key={a.id}>
                  <Link to={`/artikel/${a.slug}`} className="flex gap-3 items-baseline p-2 -m-0 rounded-lg hover:bg-[var(--bg-elev-2)] transition-colors">
                    <span className="font-display text-[var(--gold)] text-lg w-5">{a.series!.order}</span>
                    <span>
                      <span className="block font-medium leading-snug">{a.title}</span>
                      <DateSpan span={a.span} className="text-xs muted" />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {others.map((a) => (
            <ArticleCard key={a.id} article={a} index={index} />
          ))}
        </div>
      </section>

      <Parallels index={index} />

      <section aria-labelledby="methode" className="mt-16">
        <div className="card p-6 sm:p-8 grid gap-8 md:grid-cols-3">
          <div className="md:col-span-3">
            <p className="eyebrow mb-2">Wie CHRONOS arbeitet</p>
            <h2 id="methode" className="section-title">
              Nachprüfbar statt vollständig um jeden Preis
            </h2>
          </div>
          {[
            {
              icon: ShieldCheck,
              title: 'Belegt',
              text: 'Jeder Artikel nennt Quellen und Fachliteratur. Primärquellen und Forschungsliteratur sind getrennt ausgewiesen; jeder Text trägt einen sichtbaren Prüfstatus.',
            },
            {
              icon: Telescope,
              title: 'Differenziert',
              text: 'Gesicherte Befunde, Deutungen der Forschung und offene Fragen werden im Text sichtbar unterschieden – gerade dort, wo die Wissenschaft uneins ist.',
            },
            {
              icon: Users,
              title: 'Vielstimmig',
              text: 'Regionale Zeitrechnungen statt einer europäischen Einheitsgliederung; die Perspektiven Unterworfener, Versklavter und Marginalisierter werden mitgedacht.',
            },
          ].map((p) => (
            <div key={p.title}>
              <p.icon className="text-[var(--gold)] mb-3" aria-hidden />
              <h3 className="font-medium mb-1">{p.title}</h3>
              <p className="text-sm soft leading-relaxed">{p.text}</p>
            </div>
          ))}
          <p className="md:col-span-3 text-sm">
            <Link to="/info" className="link">
              Mehr zu Quellenarbeit, Prüfstatus und Grenzen des Bestands
            </Link>
          </p>
        </div>
      </section>

      <section aria-label="Bestand" className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm muted">
        <span className="inline-flex items-center gap-2">
          <BookOpen size={16} aria-hidden /> {c.articles} ausführliche Artikel · {c.words?.toLocaleString('de-DE')} Wörter
        </span>
        <span>{c.persons} Personen</span>
        <span>{c.events} Ereignisse</span>
        <span>{c.places} Orte</span>
        <span>{c.sources} Quellen und Titel</span>
        <span>Datenstand {new Date(manifest.generated).toLocaleDateString('de-DE')}</span>
      </section>
    </PageContainer>
  )
}
