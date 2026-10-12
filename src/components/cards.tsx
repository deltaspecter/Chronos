import { Clock } from 'lucide-react'
import { Link } from 'react-router'
import type { Indexed } from '@/data/index.ts'
import type { EntityInfo } from '@/lib/entities.ts'
import { regionName } from '@/lib/entities.ts'
import { KIND_LABEL } from '@/shared/routes.ts'
import type { ArticleMeta } from '@/shared/types.ts'
import { useLibrary } from '@/store/library.ts'
import { KindIcon } from './kinds.tsx'
import { DateSpan } from './ui.tsx'

export function ArticleCard({ article, index, compact = false }: { article: ArticleMeta; index: Indexed; compact?: boolean }) {
  const offline = useLibrary((s) => !!s.offline[article.id])
  const progress = useLibrary((s) => s.positions[article.id]?.progress ?? 0)
  const image = !compact && article.image ? index.entities.media.find((m) => m.id === article.image) : undefined
  return (
    <Link to={`/artikel/${article.slug}`} className="card-link overflow-hidden flex flex-col h-full group">
      {image && (
        <img
          src={`/media/${image.file}`}
          alt=""
          loading="lazy"
          decoding="async"
          width={image.width}
          height={image.height}
          className="w-full aspect-[16/9] object-cover object-[50%_30%] border-b border-[var(--line)] opacity-90 group-hover:opacity-100 transition-opacity"
        />
      )}
      <div className="p-5 flex flex-col gap-2 flex-1">
      <div className="flex items-center gap-2 text-xs muted">
        <DateSpan span={article.span} />
        {article.regions[0] && (
          <>
            <span aria-hidden>·</span>
            <span>{regionName(index, article.regions[0])}</span>
          </>
        )}
      </div>
      <h3 className="font-display text-[1.45rem] leading-tight group-hover:text-[var(--gold)] transition-colors">{article.title}</h3>
      {!compact && <p className="soft text-[0.92rem] leading-relaxed line-clamp-3 font-[family-name:var(--reading-font)]">{article.summary}</p>}
      <div className="mt-auto pt-2 flex items-center gap-3 text-xs muted">
        <span className="inline-flex items-center gap-1">
          <Clock size={13} aria-hidden /> {article.readingMinutes} Min.
        </span>
        {offline && <span className="text-[var(--ok)]">offline verfügbar</span>}
        {progress > 0.03 && progress < 0.97 && (
          <span className="ml-auto inline-flex items-center gap-2" aria-label={`${Math.round(progress * 100)} Prozent gelesen`}>
            <span className="block w-14 h-1 rounded bg-[var(--line)] overflow-hidden">
              <span className="block h-full bg-[var(--gold)]" style={{ width: `${progress * 100}%` }} />
            </span>
          </span>
        )}
        {progress >= 0.97 && <span className="ml-auto">gelesen</span>}
      </div>
      </div>
    </Link>
  )
}

export function EntityRow({ info, showKind = true }: { info: EntityInfo; showKind?: boolean }) {
  return (
    <Link to={info.href} className="flex gap-3 py-3 px-1 border-b border-[var(--line)] last:border-0 hover:bg-[var(--bg-elev)] rounded-md transition-colors group">
      <span className="mt-1 text-[var(--gold-soft)]">
        <KindIcon kind={info.kind} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium group-hover:text-[var(--gold)] transition-colors">{info.title}</span>
          {info.span && <DateSpan span={info.span} className="text-xs muted" />}
          {showKind && <span className="text-[0.7rem] uppercase tracking-wider muted">{KIND_LABEL[info.kind]}</span>}
        </span>
        {info.summary && <span className="block text-sm soft line-clamp-2 mt-0.5">{info.summary}</span>}
      </span>
    </Link>
  )
}

export function EntityChip({ info }: { info: EntityInfo }) {
  return (
    <Link to={info.href} className="chip">
      <KindIcon kind={info.kind} size={13} className="text-[var(--gold-soft)]" />
      {info.title}
    </Link>
  )
}
