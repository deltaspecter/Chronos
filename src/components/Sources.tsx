import { ArrowUp } from 'lucide-react'
import { Link } from 'react-router'
import type { Indexed } from '@/data/index.ts'
import type { ArticleBody, Source } from '@/shared/types.ts'

const GROUPS: { kind: Source['kind']; title: string; hint: string }[] = [
  { kind: 'primaer', title: 'Historische Quellen', hint: 'Zeugnisse aus der behandelten Zeit oder ihr nahe stehende Überlieferung' },
  { kind: 'edition', title: 'Quelleneditionen und Übersetzungen', hint: 'Wissenschaftliche Ausgaben und Übersetzungen von Quellen' },
  { kind: 'sekundaer', title: 'Forschungsliteratur', hint: 'Darstellungen und Studien der modernen Wissenschaft' },
  { kind: 'institution', title: 'Institutionen, Datenbanken und digitale Sammlungen', hint: 'Museen, Archive, Forschungsprojekte' },
]

export function SourceEntry({ source }: { source: Source }) {
  return (
    <span>
      <Link to={`/quelle/${source.id}`} className="hover:text-[var(--gold)]">
        {source.formatted}
      </Link>
      {source.url && (
        <>
          {' '}
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="link break-all text-[0.85em]">
            {source.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        </>
      )}
    </span>
  )
}

export function Citations({ body, index }: { body: ArticleBody; index: Indexed }) {
  if (body.citations.length === 0) return null
  return (
    <section aria-labelledby="belege" className="mt-14">
      <h2 id="belege" className="section-title mb-1">
        Belege
      </h2>
      <p className="text-sm muted mb-4">Die hochgestellten Ziffern im Text verweisen auf diese Angaben. Stellenangaben bei antiken Texten nach Buch und Kapitel.</p>
      <ol className="text-[0.92rem] soft flex flex-col gap-2 list-none pl-0">
        {body.citations.map((c) => {
          const source = index.sourceById.get(c.source)
          return (
            <li key={c.n} id={`beleg-${c.n}`} className="ref-target flex gap-3 p-1 -m-1">
              <a href={`#ref-${c.n}`} className="shrink-0 w-7 text-right tabular-nums text-[var(--gold)] inline-flex items-start justify-end gap-0.5" aria-label={`Zurück zur Textstelle ${c.n}`}>
                {c.n}
                <ArrowUp size={11} className="mt-1 opacity-60" aria-hidden />
              </a>
              <span>
                {source ? (
                  <Link to={`/quelle/${source.id}`} className="hover:text-[var(--gold)]">
                    {shortCite(source)}
                  </Link>
                ) : (
                  c.source
                )}
                {c.locator && <span>, {c.locator}</span>}.
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/** Kurzzitat: „Bringmann 2002“ / „Polybios, Historien“ */
export function shortCite(source: Source): string {
  const names = (source.authors.length ? source.authors : source.editors).map((n) => n.split(',')[0]).filter((n) => n !== 'u. a.')
  const who = names.length > 2 ? `${names[0]} u. a.` : names.join(' / ')
  if (source.kind === 'primaer' || source.kind === 'institution') return who ? `${who}, ${source.title}` : source.title
  if (source.kind === 'edition' && !source.year) return source.title
  return `${who || source.title}${source.editors.length && !source.authors.length ? ' (Hg.)' : ''} ${source.year ?? ''}: ${source.title}`.trim()
}

export function Bibliography({ ids, index, title = 'Quellen und Literatur' }: { ids: string[]; index: Indexed; title?: string }) {
  const sources = ids.map((id) => index.sourceById.get(id)).filter((s): s is Source => !!s)
  if (sources.length === 0) return null
  return (
    <section aria-labelledby="literatur" className="mt-14">
      <h2 id="literatur" className="section-title mb-4">
        {title}
      </h2>
      <div className="flex flex-col gap-7">
        {GROUPS.map((g) => {
          const items = sources.filter((s) => s.kind === g.kind).sort((a, b) => a.formatted.localeCompare(b.formatted, 'de'))
          if (items.length === 0) return null
          return (
            <div key={g.kind}>
              <h3 className="eyebrow mb-1">{g.title}</h3>
              <p className="text-xs muted mb-3">{g.hint}</p>
              <ul className="flex flex-col gap-2.5 text-[0.92rem] soft leading-relaxed">
                {items.map((s) => (
                  <li key={s.id} className="pl-4 -indent-4">
                    <SourceEntry source={s} />
                    {s.note && <span className="block text-xs muted indent-0 mt-0.5">{s.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
