import { AlertTriangle, ChevronRight, RefreshCw, WifiOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { formatSpan, type HSpan } from '@/shared/dates.ts'
import type { ReviewStatus } from '@/shared/types.ts'

export function DateSpan({ span, className }: { span?: HSpan; className?: string }) {
  if (!span) return null
  const uncertain = span.start.uncertain || span.end?.uncertain
  return (
    <span className={className} title={uncertain ? 'Datierung unsicher oder umstritten' : undefined}>
      {formatSpan(span)}
    </span>
  )
}

const STATUS_LABEL: Record<ReviewStatus, { label: string; hint: string }> = {
  entwurf: { label: 'Entwurf', hint: 'Noch nicht vollständig belegt – nur mit Vorsicht verwenden.' },
  erstfassung: {
    label: 'Erstfassung',
    hint: 'Redaktionell erstellt und mit Literatur belegt; die fachliche Begutachtung durch Historikerinnen und Historiker steht noch aus.',
  },
  geprueft: { label: 'Redaktionell geprüft', hint: 'Belege und Angaben wurden redaktionell gegengeprüft.' },
  begutachtet: { label: 'Fachlich begutachtet', hint: 'Von einer Fachwissenschaftlerin oder einem Fachwissenschaftler begutachtet.' },
}

export function StatusBadge({ status }: { status: ReviewStatus }) {
  const s = STATUS_LABEL[status]
  return (
    <Link to="/info#qualitaet" className={`status status-${status}`} title={s.hint}>
      {s.label}
    </Link>
  )
}

export function statusHint(status: ReviewStatus) {
  return STATUS_LABEL[status].hint
}

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Brotkrumen" className="mb-4 overflow-x-auto [scrollbar-width:none]">
      <ol className="flex items-center gap-1 text-[0.8rem] whitespace-nowrap muted">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={13} aria-hidden className="opacity-60" />}
            {item.to && i < items.length - 1 ? (
              <Link to={item.to} className="hover:text-[var(--text)]">
                {item.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function PageContainer({ children, wide = false, className = '' }: { children: ReactNode; wide?: boolean; className?: string }) {
  return <div className={`mx-auto w-full px-4 sm:px-6 ${wide ? 'max-w-7xl' : 'max-w-5xl'} ${className}`}>{children}</div>
}

export function LoadingBlock({ label = 'Wird geladen …' }: { label?: string }) {
  return (
    <div className="py-10" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="skeleton h-10 w-2/3 mb-4" />
      <div className="skeleton h-4 w-full mb-2" />
      <div className="skeleton h-4 w-11/12 mb-2" />
      <div className="skeleton h-4 w-4/5" />
    </div>
  )
}

export function ErrorBlock({ error, onRetry }: { error: Error & { offline?: boolean }; onRetry?: () => void }) {
  const offline = error.offline || (typeof navigator !== 'undefined' && !navigator.onLine)
  return (
    <div className="card p-6 my-8 flex gap-4 items-start" role="alert">
      {offline ? <WifiOff className="shrink-0 text-[var(--c-offen)]" /> : <AlertTriangle className="shrink-0 text-[var(--danger)]" />}
      <div>
        <p className="font-semibold">{offline ? 'Offline nicht verfügbar' : 'Fehler beim Laden'}</p>
        <p className="soft mt-1 text-sm">{error.message}</p>
        {offline && (
          <p className="muted mt-2 text-sm">
            Tipp: Artikel lassen sich über „Offline speichern“ im Artikelkopf dauerhaft auf dem Gerät ablegen.{' '}
            <Link className="link" to="/lesezeichen?tab=offline">
              Gespeicherte Artikel ansehen
            </Link>
          </p>
        )}
        {onRetry && (
          <button className="btn mt-4" onClick={onRetry}>
            <RefreshCw size={16} /> Erneut versuchen
          </button>
        )}
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="card p-8 text-center flex flex-col items-center gap-3">
      {icon && <div className="text-[var(--gold)] opacity-80">{icon}</div>}
      <p className="font-display text-xl">{title}</p>
      {children && <div className="soft text-sm max-w-md">{children}</div>}
    </div>
  )
}

export function SectionHeading({ children, id, aside }: { children: ReactNode; id?: string; aside?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4 mt-12">
      <h2 id={id} className="section-title">
        {children}
      </h2>
      {aside}
    </div>
  )
}
