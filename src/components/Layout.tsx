import { Bookmark, Clock, Compass, Home, Hourglass, Info, Layers, Map as MapIcon, Menu, Search, Settings, WifiOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { useCore } from '@/data/useData.ts'
import { refreshOffline } from '@/offline/offline.ts'
import { applyUpdate, useSw } from '@/offline/sw-register.ts'
import { SearchBox } from './SearchBox.tsx'

export const NAV = [
  { to: '/', label: 'Start', icon: Home, end: true },
  { to: '/epochen', label: 'Epochen', icon: Hourglass },
  { to: '/themen', label: 'Themen', icon: Layers },
  { to: '/zeitleiste', label: 'Zeitleiste', icon: Clock },
  { to: '/atlas', label: 'Atlas', icon: MapIcon },
  { to: '/suche', label: 'Suche', icon: Search },
  { to: '/lesezeichen', label: 'Lesezeichen', icon: Bookmark },
] as const

function Brand() {
  return (
    <Link to="/" className="brand flex items-center gap-2" aria-label="CHRONOS – zur Startseite">
      <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden className="brand-mark">
        <circle cx="16" cy="16" r="13.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M16 7v9l6 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="16" cy="16" r="1.6" fill="currentColor" />
      </svg>
      CHRONOS
    </Link>
  )
}

function MoreSheet({ onClose }: { onClose: () => void }) {
  const online = useSw((s) => s.online)
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden />
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Weitere Bereiche">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <p className="font-display text-xl">Weitere Bereiche</p>
          <button className="icon-btn" onClick={onClose} aria-label="Schließen">
            <X size={20} />
          </button>
        </div>
        <nav className="px-3 grid grid-cols-2 gap-2" aria-label="Weitere Bereiche">
          {[
            { to: '/themen', label: 'Themen', icon: Layers, hint: 'Personen, Ereignisse, Orte …' },
            { to: '/atlas', label: 'Historischer Atlas', icon: MapIcon, hint: 'Orte, Routen, Reiche' },
            { to: '/lesezeichen', label: 'Lesezeichen', icon: Bookmark, hint: 'Notizen, Verlauf, Offline' },
            { to: '/verzeichnis', label: 'Verzeichnisse', icon: Compass, hint: 'Alle Einträge A–Z' },
            { to: '/einstellungen', label: 'Einstellungen', icon: Settings, hint: 'Schrift, Theme, Daten' },
            { to: '/info', label: 'Über CHRONOS', icon: Info, hint: 'Quellen, Methode, App' },
          ].map((item) => (
            <Link key={item.to} to={item.to} onClick={onClose} className="card-link p-4 flex flex-col gap-1.5">
              <item.icon size={20} className="text-[var(--gold)]" aria-hidden />
              <span className="font-medium">{item.label}</span>
              <span className="text-xs muted">{item.hint}</span>
            </Link>
          ))}
        </nav>
        {!online && (
          <p className="mx-5 mt-4 text-sm soft flex items-center gap-2">
            <WifiOff size={16} aria-hidden /> Offline – gespeicherte Artikel, Suche, Zeitleiste und Atlas bleiben nutzbar.
          </p>
        )}
      </div>
    </>
  )
}

function UpdateToast() {
  const updateReady = useSw((s) => s.updateReady)
  const [dismissed, setDismissed] = useState(false)
  if (!updateReady || dismissed) return null
  return (
    <div className="toast px-4 py-3 flex items-center gap-3 text-sm" role="status">
      <span>Eine neue Version von CHRONOS ist verfügbar.</span>
      <button className="btn btn-primary min-h-0 py-1.5" onClick={applyUpdate}>
        Neu laden
      </button>
      <button className="icon-btn w-8 h-8" aria-label="Später" onClick={() => setDismissed(true)}>
        <X size={16} />
      </button>
    </div>
  )
}

/** Offline gespeicherte Artikel still auf die aktuelle Fassung bringen, sobald Daten und Netz da sind */
function useOfflineRefresh() {
  const core = useCore()
  const online = useSw((s) => s.online)
  useEffect(() => {
    if (core.status !== 'ready' || !online) return
    const media = new Map(core.data.entities.media.map((m) => [m.id, m]))
    const timer = setTimeout(() => refreshOffline(core.data.articleById, media).catch(() => {}), 3000)
    return () => clearTimeout(timer)
  }, [core, online])
}

export function Layout() {
  const [moreOpen, setMoreOpen] = useState(false)
  const online = useSw((s) => s.online)
  const location = useLocation()
  useOfflineRefresh()

  useEffect(() => setMoreOpen(false), [location.pathname])
  useEffect(() => {
    if (!moreOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moreOpen])

  const bottom = [NAV[0], NAV[1], NAV[5], NAV[3]]
  const moreActive = ['/themen', '/atlas', '/lesezeichen', '/verzeichnis', '/einstellungen', '/info'].some((p) => location.pathname.startsWith(p))

  return (
    <>
      <a href="#inhalt" className="skip-link">
        Zum Inhalt springen
      </a>
      <header className="app-header">
        <div className="app-header-inner mx-auto max-w-7xl px-4 sm:px-6 flex items-center gap-4">
          <Brand />
          <nav className="hidden lg:flex items-center gap-0.5 ml-4" aria-label="Hauptnavigation">
            {NAV.filter((n) => n.to !== '/suche').map((item) => (
              <NavLink key={item.to} to={item.to} end={'end' in item ? item.end : undefined} className="nav-link">
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex-1" />
          {!online && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs muted" title="Keine Internetverbindung">
              <WifiOff size={14} aria-hidden /> Offline
            </span>
          )}
          <div className="hidden md:block w-72 xl:w-80">
            <SearchBox />
          </div>
          <Link to="/suche" className="icon-btn md:hidden" aria-label="Suche">
            <Search size={20} />
          </Link>
          <Link to="/einstellungen" className="icon-btn hidden lg:inline-flex" aria-label="Einstellungen">
            <Settings size={19} />
          </Link>
        </div>
      </header>

      <main id="inhalt" className="main-pad" tabIndex={-1}>
        <Outlet />
      </main>

      <nav className="bottom-nav lg:hidden" aria-label="Hauptnavigation">
        <div className="grid grid-cols-5 max-w-xl mx-auto">
          {bottom.map((item) => (
            <NavLink key={item.to} to={item.to} end={'end' in item ? item.end : undefined}>
              <item.icon size={21} aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button onClick={() => setMoreOpen(true)} aria-expanded={moreOpen} data-active={moreActive} aria-haspopup="dialog">
            <Menu size={21} aria-hidden />
            <span>Mehr</span>
          </button>
        </div>
      </nav>

      {moreOpen && <MoreSheet onClose={() => setMoreOpen(false)} />}
      <UpdateToast />
      <ScrollRestoration getKey={(loc) => loc.pathname + loc.search} />
    </>
  )
}
