import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, CloudDownload, CloudOff, Info, ListTree, Network, Share2, StickyNote } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { EntityChip } from '@/components/cards.tsx'
import { Figure } from '@/components/Figure.tsx'
import { KnowledgeGraph } from '@/components/KnowledgeGraph.tsx'
import { NotesPanel } from '@/components/NotesPanel.tsx'
import { Bibliography, Citations } from '@/components/Sources.tsx'
import { TextSettingsButton } from '@/components/TextSettings.tsx'
import { Breadcrumbs, DateSpan, ErrorBlock, LoadingBlock, PageContainer, StatusBadge, statusHint } from '@/components/ui.tsx'
import { WithData } from '@/components/WithData.tsx'
import { epochPath, type Indexed } from '@/data/index.ts'
import { useArticleBody } from '@/data/useData.ts'
import { entityInfo, regionName, type EntityInfo } from '@/lib/entities.ts'
import { useReadingProgress } from '@/lib/useReadingProgress.ts'
import { useTitle } from '@/lib/useTitle.ts'
import { offlineSupported, removeArticleOffline, saveArticleOffline } from '@/offline/offline.ts'
import { KIND_LABEL_PLURAL } from '@/shared/routes.ts'
import type { ArticleBody, ArticleMeta, EntityKind } from '@/shared/types.ts'
import { useLibrary } from '@/store/library.ts'
import { useSettings } from '@/store/settings.ts'
import { NotFoundPage } from './NotFoundPage.tsx'

const TYPE_LABEL: Record<ArticleMeta['type'], string> = {
  ueberblick: 'Überblick',
  ereignis: 'Ereignis',
  person: 'Persönlichkeit',
  epoche: 'Epoche',
  thema: 'Thema',
  ort: 'Ort',
  staat: 'Staat und Reich',
  kultur: 'Kultur',
}

export function ArticlePage() {
  const { slug = '' } = useParams()
  return <WithData>{(index) => <ArticleResolver index={index} slug={slug} />}</WithData>
}

function ArticleResolver({ index, slug }: { index: Indexed; slug: string }) {
  const meta = index.articleBySlug.get(slug)
  const location = useLocation()
  if (!meta) return <NotFoundPage what="Artikel" />
  // Alte Slugs und IDs auf die kanonische Adresse umleiten (Lesezeichen bleiben gültig)
  if (meta.slug !== slug) return <Navigate to={`/artikel/${meta.slug}${location.hash}`} replace />
  return <ArticleView index={index} meta={meta} />
}

function ArticleView({ index, meta }: { index: Indexed; meta: ArticleMeta }) {
  useTitle(meta.title)
  const { loading, body, error } = useArticleBody(meta)
  const [retry, setRetry] = useState(0)
  const visit = useLibrary((s) => s.visit)

  useEffect(() => {
    visit({ kind: 'article', id: meta.id, title: meta.title })
  }, [meta.id, meta.title, visit])

  const headerImage = meta.image ? index.entities.media.find((m) => m.id === meta.image) : undefined
  const primaryEpoch = meta.epochs[0]
  const crumbs = [
    { label: 'Epochen', to: '/epochen' },
    ...(primaryEpoch ? epochPath(index, primaryEpoch).map((e) => ({ label: e.title, to: `/epochen/${e.id}` })) : []),
    { label: meta.title },
  ]

  return (
    <article className="fade-in" key={`${meta.id}-${retry}`}>
      <PageContainer wide>
        <div className="pt-6 lg:pt-10 max-w-[var(--measure)] xl:max-w-none xl:grid xl:grid-cols-[minmax(0,var(--measure))_16rem] xl:gap-16 xl:justify-center">
          <div>
            <Breadcrumbs items={crumbs} />
            <ArticleHeader meta={meta} index={index} />
            {headerImage && <Figure media={headerImage} priority className="mb-8" />}
          </div>
        </div>
      </PageContainer>
      {loading && (
        <PageContainer>
          <LoadingBlock label="Artikel wird geladen" />
        </PageContainer>
      )}
      {error && (
        <PageContainer>
          <ErrorBlock error={error} onRetry={() => setRetry((r) => r + 1)} />
        </PageContainer>
      )}
      {body && <ArticleContent meta={meta} body={body} index={index} />}
    </article>
  )
}

function ArticleHeader({ meta, index }: { meta: ArticleMeta; index: Indexed }) {
  const [showSpanNote, setShowSpanNote] = useState(false)
  return (
    <header className="mb-6">
      <p className="eyebrow mb-3">
        {TYPE_LABEL[meta.type]}
        {meta.series && (
          <span className="muted normal-case tracking-normal font-normal">
            {' '}
            · Reihe „{meta.series.title}“, Teil {meta.series.order}
          </span>
        )}
      </p>
      <h1 className="page-title text-balance">{meta.title}</h1>
      {meta.subtitle && <p className="mt-3 text-lg soft font-[family-name:var(--reading-font)] italic">{meta.subtitle}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm muted">
        {meta.span && (
          <span className="inline-flex items-center gap-1.5 text-[var(--text-soft)]">
            <DateSpan span={meta.span} />
            {meta.spanNote && (
              <button className="inline-flex text-[var(--gold-soft)]" aria-expanded={showSpanNote} aria-label="Hinweis zur Datierung" onClick={() => setShowSpanNote((v) => !v)}>
                <Info size={15} />
              </button>
            )}
          </span>
        )}
        {meta.regions.slice(0, 3).map((r) => (
          <Link key={r} to={`/inhalt?region=${r}`} className="hover:text-[var(--text)]">
            {regionName(index, r)}
          </Link>
        ))}
        <span>{meta.readingMinutes} Min. Lesezeit</span>
        <StatusBadge status={meta.status} />
      </div>
      {showSpanNote && meta.spanNote && <p className="mt-3 text-sm soft card p-3 fade-in">{meta.spanNote}</p>}
    </header>
  )
}

function useArticleLinks(navigate: ReturnType<typeof useNavigate>) {
  return useCallback(
    (e: MouseEvent<HTMLElement>) => {
      const a = (e.target as HTMLElement).closest('a')
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return
      const href = a.getAttribute('href') ?? ''
      if (href.startsWith('#')) {
        e.preventDefault()
        const target = document.getElementById(decodeURIComponent(href.slice(1)))
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
          history.replaceState(history.state, '', href)
          if (target.classList.contains('ref-target')) target.focus?.()
        }
      } else if (href.startsWith('/')) {
        e.preventDefault()
        navigate(href)
      }
    },
    [navigate],
  )
}

function ArticleContent({ meta, body, index }: { meta: ArticleMeta; body: ArticleBody; index: Indexed }) {
  const navigate = useNavigate()
  const location = useLocation()
  const bodyRef = useRef<HTMLDivElement>(null)
  const settings = useSettings()
  const headingIds = useMemo(() => body.toc.map((t) => t.id), [body])
  const { progress, section } = useReadingProgress(bodyRef, headingIds, true)
  const setPosition = useLibrary((s) => s.setPosition)
  const saved = useLibrary.getState().positions[meta.id]
  const [resumeOffer, setResumeOffer] = useState(() => settings.resumeReading && !location.hash && saved && saved.progress > 0.04 && saved.progress < 0.96 ? saved : null)
  const [tocOpen, setTocOpen] = useState(false)
  const onClick = useArticleLinks(navigate)

  // Lesestand speichern (gedrosselt) – nur vorwärts, damit kurzes Hochscrollen nichts überschreibt
  const lastSave = useRef(0)
  useEffect(() => {
    const now = Date.now()
    if (now - lastSave.current < 1500) return
    lastSave.current = now
    const prev = useLibrary.getState().positions[meta.id]?.progress ?? 0
    if (progress > 0.02 && (progress > prev || prev - progress > 0.25 || progress > 0.97)) setPosition(meta.id, { progress, section })
    if (progress > 0.1 && resumeOffer) setResumeOffer(null)
  }, [progress, section, meta.id, setPosition, resumeOffer])

  // Sprung zu Anker aus der URL
  useEffect(() => {
    if (!location.hash) return
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)))
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }))
  }, [location.hash, body])

  const resume = () => {
    if (!resumeOffer) return
    const target = resumeOffer.section ? document.getElementById(resumeOffer.section) : null
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else if (bodyRef.current) {
      const rect = bodyRef.current.getBoundingClientRect()
      window.scrollTo({ top: window.scrollY + rect.top + rect.height * resumeOffer.progress - window.innerHeight * 0.3, behavior: 'smooth' })
    }
    setResumeOffer(null)
  }

  const sectionTitle = (id?: string) => body.toc.find((t) => t.id === id)?.title

  return (
    <>
      {settings.showProgress && <div className="progress-bar" style={{ transform: `scaleX(${progress})`, width: '100%' }} aria-hidden />}
      <PageContainer wide>
        <div className="xl:grid xl:grid-cols-[minmax(0,var(--measure))_16rem] xl:gap-16 xl:justify-center">
          <div className="min-w-0 max-w-[var(--measure)]">
            <ArticleActions meta={meta} index={index} onToggleToc={() => setTocOpen((o) => !o)} tocOpen={tocOpen} hasToc={body.toc.length > 2} />
            {resumeOffer && (
              <div className="card p-3 pl-4 mb-6 flex items-center gap-3 text-sm fade-in" role="status">
                <span className="flex-1 soft">
                  Zuletzt gelesen: {Math.round(resumeOffer.progress * 100)} %{sectionTitle(resumeOffer.section) && <> · „{sectionTitle(resumeOffer.section)}“</>}
                </span>
                <button className="btn btn-primary min-h-0 py-1.5" onClick={resume}>
                  Weiterlesen
                </button>
                <button className="btn btn-ghost min-h-0 py-1.5" onClick={() => setResumeOffer(null)}>
                  Von vorn
                </button>
              </div>
            )}
            {tocOpen && body.toc.length > 2 && (
              <nav className="card p-4 mb-8 xl:hidden fade-in" aria-label="Inhaltsverzeichnis">
                <Toc body={body} active={section} onPick={() => setTocOpen(false)} />
              </nav>
            )}
            <p className="lead mb-8 pb-8 border-b border-[var(--line)]">{meta.summary}</p>
            <div ref={bodyRef} className="prose article-body" onClick={onClick} dangerouslySetInnerHTML={{ __html: body.html }} />
            <Citations body={body} index={index} />
            <Bibliography ids={body.bibliography} index={index} />
            <SeriesNav body={body} index={index} />
            <KnowledgeNetwork meta={meta} body={body} index={index} />
            <NotesPanel target={{ kind: 'article', id: meta.id, title: meta.title }} sections={body.toc} currentSection={section} />
            <ArticleFooter meta={meta} body={body} />
          </div>
          {body.toc.length > 2 && (
            <aside className="hidden xl:block">
              <nav className="sticky top-[calc(var(--header-h)+2rem)] max-h-[calc(100dvh-var(--header-h)-4rem)] overflow-y-auto pr-2" aria-label="Inhaltsverzeichnis">
                <p className="eyebrow mb-3">Inhalt</p>
                <Toc body={body} active={section} />
                <div className="mt-6 h-1 rounded bg-[var(--line)] overflow-hidden" aria-hidden>
                  <div className="h-full bg-[var(--gold)] transition-[width]" style={{ width: `${progress * 100}%` }} />
                </div>
                <p className="text-xs muted mt-2">{Math.round(progress * 100)} % gelesen</p>
              </nav>
            </aside>
          )}
        </div>
      </PageContainer>
    </>
  )
}

function Toc({ body, active, onPick }: { body: ArticleBody; active?: string; onPick?: () => void }) {
  return (
    <ol className="flex flex-col gap-0.5 text-[0.86rem]">
      {body.toc.map((t) => (
        <li key={t.id} className={t.level === 3 ? 'pl-3.5' : ''}>
          <a
            href={`#${t.id}`}
            onClick={(e) => {
              e.preventDefault()
              document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              history.replaceState(history.state, '', `#${t.id}`)
              onPick?.()
            }}
            className={`block py-1 leading-snug border-l-2 pl-3 transition-colors ${active === t.id ? 'border-[var(--gold)] text-[var(--text)]' : 'border-transparent muted hover:text-[var(--text)]'} ${t.level === 3 ? 'text-[0.8rem]' : ''}`}
            aria-current={active === t.id ? 'location' : undefined}
          >
            {t.title}
          </a>
        </li>
      ))}
      <li>
        <a href="#belege" className="block py-1 pl-3 border-l-2 border-transparent muted hover:text-[var(--text)]" onClick={(e) => {
          e.preventDefault()
          ;(document.getElementById('belege') ?? document.getElementById('literatur'))?.scrollIntoView({ behavior: 'smooth' })
          onPick?.()
        }}>
          Belege und Literatur
        </a>
      </li>
    </ol>
  )
}

function ArticleActions({ meta, index, onToggleToc, tocOpen, hasToc }: { meta: ArticleMeta; index: Indexed; onToggleToc: () => void; tocOpen: boolean; hasToc: boolean }) {
  const bookmarked = useLibrary((s) => s.bookmarks.some((b) => b.kind === 'article' && b.id === meta.id))
  const toggleBookmark = useLibrary((s) => s.toggleBookmark)
  const offline = useLibrary((s) => s.offline[meta.id])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const mediaIndex = useMemo(() => new Map(index.entities.media.map((m) => [m.id, m])), [index])

  const flash = (text: string) => {
    setMessage(text)
    setTimeout(() => setMessage(null), 3500)
  }

  const toggleOffline = async () => {
    setBusy(true)
    try {
      if (offline) {
        await removeArticleOffline(meta.id)
        flash('Offline-Kopie entfernt.')
      } else {
        await saveArticleOffline(meta, mediaIndex)
        flash('Gespeichert – dieser Artikel ist jetzt auch ohne Internet lesbar.')
      }
    } catch (error) {
      flash((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const share = async () => {
    const url = `${location.origin}/artikel/${meta.slug}`
    try {
      if (navigator.share) await navigator.share({ title: meta.title, text: meta.summary, url })
      else {
        await navigator.clipboard.writeText(url)
        flash('Link kopiert.')
      }
    } catch {
      /* abgebrochen */
    }
  }

  const outdated = offline && offline.hash !== meta.hash

  return (
    <div className="mb-8">
      <div className="flex items-center gap-1 border-y border-[var(--line)] py-1.5 -mx-1">
        {hasToc && (
          <button className="icon-btn xl:hidden" onClick={onToggleToc} aria-expanded={tocOpen} aria-label="Inhaltsverzeichnis" title="Inhaltsverzeichnis">
            <ListTree size={19} />
          </button>
        )}
        <button
          className="icon-btn"
          aria-pressed={bookmarked}
          onClick={() => {
            toggleBookmark({ kind: 'article', id: meta.id, title: meta.title })
            flash(bookmarked ? 'Lesezeichen entfernt.' : 'Zu den Lesezeichen hinzugefügt.')
          }}
          aria-label={bookmarked ? 'Lesezeichen entfernen' : 'Lesezeichen setzen'}
          title={bookmarked ? 'Lesezeichen entfernen' : 'Lesezeichen setzen'}
        >
          {bookmarked ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
        </button>
        {offlineSupported() && (
          <button
            className="icon-btn"
            aria-pressed={!!offline}
            onClick={toggleOffline}
            disabled={busy}
            aria-label={offline ? 'Offline-Kopie entfernen' : 'Offline speichern'}
            title={offline ? 'Offline gespeichert – zum Entfernen tippen' : 'Offline speichern'}
          >
            {offline ? <CloudOff size={19} /> : <CloudDownload size={19} />}
          </button>
        )}
        <a href="#notizen" className="icon-btn" aria-label="Notizen" title="Notizen">
          <StickyNote size={19} />
        </a>
        <a href="#wissensnetz" className="icon-btn" aria-label="Wissensnetz" title="Wissensnetz">
          <Network size={19} />
        </a>
        <div className="flex-1" />
        <button className="icon-btn" onClick={share} aria-label="Teilen" title="Teilen">
          <Share2 size={19} />
        </button>
        <TextSettingsButton />
      </div>
      <div aria-live="polite" className="min-h-0">
        {message && <p className="text-sm soft mt-2 fade-in">{message}</p>}
        {outdated && !message && <p className="text-sm text-[var(--c-offen)] mt-2">Die Offline-Kopie ist älter als diese Fassung; sie wird bei der nächsten Verbindung aktualisiert.</p>}
      </div>
    </div>
  )
}

function SeriesNav({ body, index }: { body: ArticleBody; index: Indexed }) {
  const prev = body.prev ? index.articleById.get(body.prev) : undefined
  const next = body.next ? index.articleById.get(body.next) : undefined
  if (!prev && !next) return null
  return (
    <nav className="mt-14 grid sm:grid-cols-2 gap-3" aria-label="Artikelreihe">
      {prev ? (
        <Link to={`/artikel/${prev.slug}`} className="card-link p-4 flex gap-3 items-center">
          <ChevronLeft className="shrink-0 text-[var(--gold)]" aria-hidden />
          <span>
            <span className="block text-xs muted">Vorheriger Teil</span>
            <span className="font-display text-lg leading-tight">{prev.title}</span>
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link to={`/artikel/${next.slug}`} className="card-link p-4 flex gap-3 items-center justify-end text-right">
          <span>
            <span className="block text-xs muted">Nächster Teil</span>
            <span className="font-display text-lg leading-tight">{next.title}</span>
          </span>
          <ChevronRight className="shrink-0 text-[var(--gold)]" aria-hidden />
        </Link>
      )}
    </nav>
  )
}

function KnowledgeNetwork({ meta, body, index }: { meta: ArticleMeta; body: ArticleBody; index: Indexed }) {
  const groups: { kind: EntityKind; ids: string[] }[] = [
    { kind: 'article', ids: [...new Set([...body.related, ...body.backlinks])].filter((id) => id !== meta.id) },
    { kind: 'event', ids: body.events },
    { kind: 'person', ids: body.persons },
    { kind: 'place', ids: body.places },
    { kind: 'polity', ids: body.polities },
    { kind: 'culture', ids: body.cultures },
    { kind: 'term', ids: body.terms },
  ]
  const resolved = groups.map((g) => ({ kind: g.kind, items: g.ids.map((id) => entityInfo(index, g.kind, id)).filter((x): x is EntityInfo => !!x) }))
  const all = resolved.flatMap((g) => g.items)
  if (all.length === 0) return null
  const graphNodes = [...resolved[0].items, ...resolved[1].items.slice(0, 6), ...resolved[2].items.slice(0, 7), ...resolved[3].items.slice(0, 5), ...resolved[4].items.slice(0, 3), ...resolved[5].items.slice(0, 2)]
  return (
    <section aria-labelledby="wissensnetz" className="mt-14">
      <h2 id="wissensnetz" className="section-title mb-1">
        Wissensnetz
      </h2>
      <p className="text-sm muted mb-5">Personen, Orte, Ereignisse und Artikel, die mit diesem Thema verbunden sind.</p>
      <KnowledgeGraph center={{ title: meta.title, kind: 'article' }} nodes={graphNodes} />
      <div className="mt-6 flex flex-col gap-5">
        {resolved
          .filter((g) => g.items.length)
          .map((g) => (
            <div key={g.kind}>
              <h3 className="eyebrow mb-2">{g.kind === 'article' ? 'Verwandte Artikel' : KIND_LABEL_PLURAL[g.kind]}</h3>
              <div className="flex flex-wrap gap-2">
                {g.items.map((info) => (
                  <EntityChip key={info.id} info={info} />
                ))}
              </div>
            </div>
          ))}
        {meta.epochs.length > 0 && (
          <div>
            <h3 className="eyebrow mb-2">Epochen und Themen</h3>
            <div className="flex flex-wrap gap-2">
              {meta.epochs.map((id) => {
                const info = entityInfo(index, 'epoch', id)
                return info ? <EntityChip key={id} info={info} /> : null
              })}
              {meta.themes.map((id) => {
                const info = entityInfo(index, 'theme', id)
                return info ? <EntityChip key={id} info={info} /> : null
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function ArticleFooter({ meta, body }: { meta: ArticleMeta; body: ArticleBody }) {
  const url = `${typeof location !== 'undefined' ? location.origin : ''}/artikel/${meta.slug}`
  const today = new Date().toLocaleDateString('de-DE')
  return (
    <footer className="mt-14 pt-8 border-t border-[var(--line)] text-sm soft flex flex-col gap-6">
      <div>
        <h2 className="eyebrow mb-2">Redaktioneller Stand</h2>
        <p>
          <StatusBadge status={meta.status} /> <span className="ml-2">{statusHint(meta.status)}</span>
        </p>
        <ul className="mt-3 text-xs muted flex flex-col gap-1">
          {body.history.map((h) => (
            <li key={h.version}>
              Version {h.version} vom {new Date(h.date).toLocaleDateString('de-DE')}: {h.note}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="eyebrow mb-2">Zitiervorschlag</h2>
        <p className="font-[family-name:var(--reading-font)] text-[0.92rem] select-all">
          CHRONOS – Enzyklopädie der Menschheitsgeschichte: „{meta.title}“, Version {meta.version} vom {new Date(meta.updated).toLocaleDateString('de-DE')}. {url} (abgerufen am {today}).
        </p>
        <p className="text-xs muted mt-2">Stabile Kennung: {meta.id}. Für wissenschaftliche Arbeiten bitte stets die angegebene Fachliteratur heranziehen.</p>
      </div>
    </footer>
  )
}
