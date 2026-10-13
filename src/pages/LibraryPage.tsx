import { Bookmark, CloudOff, History, RefreshCw, StickyNote, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { KindIcon } from '@/components/kinds.tsx'
import { EmptyState, PageContainer } from '@/components/ui.tsx'
import { WithData } from '@/components/WithData.tsx'
import type { Indexed } from '@/data/index.ts'
import { entityInfo } from '@/lib/entities.ts'
import { useTitle } from '@/lib/useTitle.ts'
import { formatBytes, offlineSupported, refreshOffline, removeArticleOffline, storageEstimate } from '@/offline/offline.ts'
import { KIND_LABEL } from '@/shared/routes.ts'
import { useLibrary } from '@/store/library.ts'

const TABS = [
  { id: 'lesezeichen', label: 'Lesezeichen', icon: Bookmark },
  { id: 'notizen', label: 'Notizen', icon: StickyNote },
  { id: 'verlauf', label: 'Verlauf', icon: History },
  { id: 'offline', label: 'Offline', icon: CloudOff },
] as const

type Tab = (typeof TABS)[number]['id']

export function LibraryPage() {
  useTitle('Lesezeichen')
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'lesezeichen') as Tab
  return (
    <PageContainer className="pt-8 lg:pt-12">
      <p className="eyebrow mb-3">Meine Bibliothek</p>
      <h1 className="page-title">Lesezeichen und Notizen</h1>
      <p className="soft mt-3 text-sm max-w-2xl">Alles hier ist ausschließlich auf diesem Gerät gespeichert. Es gibt kein Konto und keine Übertragung an einen Server.</p>
      <div className="mt-8 flex gap-2 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Bereiche">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className="chip" aria-pressed={tab === t.id} onClick={() => setParams({ tab: t.id }, { replace: true })}>
            <t.icon size={14} aria-hidden /> {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6" role="tabpanel">
        <WithData>
          {(index) =>
            tab === 'lesezeichen' ? <Bookmarks index={index} /> : tab === 'notizen' ? <Notes index={index} /> : tab === 'verlauf' ? <HistoryList index={index} /> : <OfflineList index={index} />
          }
        </WithData>
      </div>
    </PageContainer>
  )
}

function Bookmarks({ index }: { index: Indexed }) {
  const bookmarks = useLibrary((s) => s.bookmarks)
  const toggle = useLibrary((s) => s.toggleBookmark)
  if (bookmarks.length === 0)
    return (
      <EmptyState icon={<Bookmark />} title="Noch keine Lesezeichen">
        Über das Lesezeichen-Symbol im Kopf eines Artikels oder Eintrags merken Sie sich Inhalte für später.
      </EmptyState>
    )
  return (
    <ul className="card px-4 py-1">
      {bookmarks.map((b) => {
        const info = entityInfo(index, b.kind, b.id)
        return (
          <li key={`${b.kind}:${b.id}`} className="flex items-center gap-3 py-3 border-b border-[var(--line)] last:border-0">
            <KindIcon kind={b.kind} className="text-[var(--gold-soft)] shrink-0" />
            <span className="min-w-0 flex-1">
              {info ? (
                <Link to={info.href} className="font-medium hover:text-[var(--gold)]">
                  {info.title}
                </Link>
              ) : (
                <span className="font-medium muted" title="Nicht mehr im Bestand">
                  {b.title}
                </span>
              )}
              <span className="block text-xs muted">
                {KIND_LABEL[b.kind]} · gemerkt am {new Date(b.added).toLocaleDateString('de-DE')}
              </span>
            </span>
            <button className="icon-btn" aria-label={`Lesezeichen „${b.title}“ entfernen`} onClick={() => toggle(b)}>
              <Trash2 size={16} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function Notes({ index }: { index: Indexed }) {
  const notes = useLibrary((s) => s.notes)
  if (notes.length === 0)
    return (
      <EmptyState icon={<StickyNote />} title="Noch keine Notizen">
        Am Ende jedes Artikels können Sie eigene Notizen festhalten – auch zu einzelnen Abschnitten.
      </EmptyState>
    )
  const visible = [...notes].sort((a, b) => b.updated.localeCompare(a.updated))
  return (
    <>
      <ul className="flex flex-col gap-3">
        {visible.map((n) => {
          const info = entityInfo(index, n.target.kind, n.target.id)
          const href = info ? `${info.href}${n.section ? `#${n.section.id}` : '#notizen'}` : undefined
          return (
            <li key={n.id} className="card p-4">
              <p className="text-xs muted">
                {href ? (
                  <Link to={href} className="text-[var(--gold)]">
                    {n.target.title}
                    {n.section && ` · § ${n.section.title}`}
                  </Link>
                ) : (
                  n.target.title
                )}{' '}
                · {new Date(n.updated).toLocaleDateString('de-DE')}
              </p>
              <p className="whitespace-pre-wrap mt-1.5 font-[family-name:var(--reading-font)]">{n.text}</p>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function HistoryList({ index }: { index: Indexed }) {
  const history = useLibrary((s) => s.history)
  const positions = useLibrary((s) => s.positions)
  const clear = useLibrary((s) => s.clearHistory)
  if (history.length === 0)
    return (
      <EmptyState icon={<History />} title="Noch nichts gelesen">
        Hier erscheinen die zuletzt geöffneten Artikel und Einträge.
      </EmptyState>
    )
  return (
    <>
      <ul className="card px-4 py-1">
        {history.map((h) => {
          const info = entityInfo(index, h.kind, h.id)
          const p = h.kind === 'article' ? positions[h.id]?.progress : undefined
          return (
            <li key={`${h.kind}:${h.id}`} className="py-3 border-b border-[var(--line)] last:border-0 flex items-center gap-3">
              <KindIcon kind={h.kind} className="text-[var(--gold-soft)] shrink-0" />
              <span className="flex-1 min-w-0">
                {info ? (
                  <Link to={info.href} className="font-medium hover:text-[var(--gold)]">
                    {info.title}
                  </Link>
                ) : (
                  <span className="muted">{h.title}</span>
                )}
                <span className="block text-xs muted">
                  {new Date(h.visited).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
                  {p !== undefined && ` · ${Math.round(p * 100)} % gelesen`}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
      <button className="btn btn-ghost mt-4 text-sm" onClick={() => confirm('Verlauf löschen?') && clear()}>
        <Trash2 size={15} aria-hidden /> Verlauf löschen
      </button>
    </>
  )
}

function OfflineList({ index }: { index: Indexed }) {
  const offline = useLibrary((s) => s.offline)
  const entries = Object.values(offline).sort((a, b) => a.title.localeCompare(b.title, 'de'))
  const [estimate, setEstimate] = useState<Awaited<ReturnType<typeof storageEstimate>>>(null)
  const [busy, setBusy] = useState(false)
  const mediaIndex = useMemo(() => new Map(index.entities.media.map((m) => [m.id, m])), [index])
  useEffect(() => {
    storageEstimate().then(setEstimate)
  }, [offline])
  const outdated = entries.filter((e) => index.articleById.get(e.id) && index.articleById.get(e.id)!.hash !== e.hash)
  const total = entries.reduce((s, e) => s + e.bytes, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-5 text-sm soft flex flex-col gap-2">
        <p className="font-medium text-[var(--text)]">Was ohne Internet funktioniert</p>
        <p>
          Nach dem ersten Besuch sind Startseite, Inhaltsverzeichnis, Epochen, Themen, Verzeichnisse, Zeitleiste und Atlas offline nutzbar, ebenso Lesezeichen, Notizen und Einstellungen. Artikeltexte
          werden nur gespeichert, wenn Sie sie ausdrücklich offline speichern; die zuletzt gelesenen Artikel (bis zu 30) bleiben zusätzlich vorübergehend verfügbar.
        </p>
        {!offlineSupported() && <p className="text-[var(--danger)]">Dieser Browser erlaubt hier keine Offline-Speicherung (sichere Verbindung über https erforderlich).</p>}
        {estimate && (
          <p className="muted">
            Speicher dieser Website: {formatBytes(estimate.usage)} belegt
            {estimate.quota > 0 && ` von etwa ${formatBytes(estimate.quota)} verfügbar`}.
            {estimate.persisted ? ' Dauerhafte Speicherung ist aktiviert.' : ''}
          </p>
        )}
      </div>
      {outdated.length > 0 && (
        <div className="card p-4 flex items-center gap-3 text-sm">
          <span className="flex-1">{outdated.length} gespeicherte Artikel wurden inzwischen überarbeitet.</span>
          <button
            className="btn"
            disabled={busy || !navigator.onLine}
            onClick={async () => {
              setBusy(true)
              await refreshOffline(index.articleById, mediaIndex)
              setBusy(false)
            }}
          >
            <RefreshCw size={15} aria-hidden /> Aktualisieren
          </button>
        </div>
      )}
      {entries.length === 0 ? (
        <EmptyState icon={<CloudOff />} title="Keine Artikel offline gespeichert">
          Tippen Sie im Kopf eines Artikels auf das Wolken-Symbol, um ihn mit Text und Abbildungen auf diesem Gerät zu speichern.
        </EmptyState>
      ) : (
        <>
          <p className="text-sm muted">
            {entries.length} Artikel · zusammen etwa {formatBytes(total)}
          </p>
          <ul className="card px-4 py-1">
            {entries.map((e) => {
              const meta = index.articleById.get(e.id)
              return (
                <li key={e.id} className="py-3 border-b border-[var(--line)] last:border-0 flex items-center gap-3">
                  <span className="flex-1 min-w-0">
                    {meta ? (
                      <Link to={`/artikel/${meta.slug}`} className="font-medium hover:text-[var(--gold)]">
                        {e.title}
                      </Link>
                    ) : (
                      <span className="muted">{e.title} (nicht mehr im Bestand)</span>
                    )}
                    <span className="block text-xs muted">
                      {formatBytes(e.bytes)} · gespeichert am {new Date(e.saved).toLocaleDateString('de-DE')}
                      {meta && meta.hash !== e.hash && ' · neuere Fassung verfügbar'}
                    </span>
                  </span>
                  <button className="icon-btn" aria-label={`Offline-Kopie von „${e.title}“ entfernen`} onClick={() => removeArticleOffline(e.id)}>
                    <Trash2 size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
