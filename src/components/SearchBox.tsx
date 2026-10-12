/**
 * Suchfeld mit Autovervollständigung (ARIA-Combobox).
 * Tastatur: ↑/↓ wählt Vorschläge, Enter öffnet, Esc schließt.
 */
import { Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useCore } from '@/data/useData.ts'
import { loadSearch, suggest, type Hit } from '@/lib/searchEngine.ts'
import { formatYear, fromAstro } from '@/shared/dates.ts'
import { entityHref, KIND_LABEL } from '@/shared/routes.ts'
import { KindIcon } from './kinds.tsx'

export function hitHref(hit: Hit) {
  return hit.kind === 'region' ? `/suche?region=${hit.ref}` : entityHref(hit.kind, hit.ref)
}

export function hitYears(hit: Hit) {
  if (hit.from === undefined) return ''
  const a = formatYear(fromAstro(hit.from))
  if (hit.to === undefined || hit.to === hit.from) return a
  return `${a} – ${formatYear(fromAstro(hit.to), { era: hit.from < 1 && hit.to >= 1 ? 'always' : 'auto' })}`
}

export function SearchBox({ autoFocus = false, onNavigate, initial = '', large = false }: { autoFocus?: boolean; onNavigate?: () => void; initial?: string; large?: boolean }) {
  const [query, setQuery] = useState(initial)
  const [hits, setHits] = useState<Hit[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const navigate = useNavigate()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const core = useCore()

  useEffect(() => {
    let cancelled = false
    if (query.trim().length < 2) {
      setHits([])
      return
    }
    loadSearch()
      .then((engine) => {
        if (!cancelled) {
          setHits(suggest(engine, query))
          setActive(-1)
        }
      })
      .catch(() => setHits([]))
    return () => {
      cancelled = true
    }
  }, [query])

  const go = (to: string) => {
    setOpen(false)
    onNavigate?.()
    navigate(to)
  }

  const submit = () => {
    if (active >= 0 && hits[active]) go(hitHref(hits[active]))
    else if (query.trim()) go(`/suche?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="relative w-full" role="search">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <label htmlFor={`${listId}-input`} className="sr-only">
          Suche in CHRONOS
        </label>
        <div className="relative">
          <Search size={large ? 20 : 17} className="absolute left-3 top-1/2 -translate-y-1/2 muted pointer-events-none" aria-hidden />
          <input
            ref={inputRef}
            id={`${listId}-input`}
            className={`input pl-10 pr-10 ${large ? 'min-h-[3.25rem] text-[1.05rem]' : ''}`}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={large ? 'Ereignis, Person, Ort, Epoche oder Jahr …' : 'Suchen …'}
            value={query}
            autoFocus={autoFocus}
            role="combobox"
            aria-expanded={open && hits.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
            onFocus={() => {
              setOpen(true)
              loadSearch().catch(() => {})
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(hits.length - 1, a + 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(-1, a - 1))
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
          />
          {query && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn w-8 h-8"
              aria-label="Eingabe löschen"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>
      {open && hits.length > 0 && (
        <ul id={listId} role="listbox" className="search-pop py-1" aria-label="Vorschläge">
          {hits.map((hit, i) => (
            <li
              key={hit.id}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className="flex items-start gap-3 px-3 py-2.5 cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault()
                go(hitHref(hit))
              }}
              onMouseEnter={() => setActive(i)}
            >
              <KindIcon kind={hit.kind} className="mt-0.5 shrink-0 text-[var(--gold-soft)]" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{hit.title}</span>
                <span className="block text-xs muted truncate">
                  {KIND_LABEL[hit.kind]}
                  {hit.from !== undefined && ` · ${hitYears(hit)}`}
                </span>
              </span>
            </li>
          ))}
          <li
            role="option"
            aria-selected={false}
            className="px-3 py-2 text-sm text-[var(--gold)] border-t border-[var(--line)] cursor-pointer"
            onMouseDown={(e) => {
              e.preventDefault()
              go(`/suche?q=${encodeURIComponent(query.trim())}`)
            }}
          >
            Alle Ergebnisse für „{query.trim()}“
          </li>
        </ul>
      )}
      {core.status === 'error' && <span className="sr-only">Suche derzeit nicht verfügbar</span>}
    </div>
  )
}
