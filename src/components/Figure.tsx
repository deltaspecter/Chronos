import type { Media } from '@/shared/types.ts'

/** Abbildung mit Bildunterschrift, Urheber und Lizenz (Pflichtangaben freier Lizenzen) */
export function Figure({ media, priority = false, className = '' }: { media: Media; priority?: boolean; className?: string }) {
  const portrait = media.height > media.width
  return (
    <figure className={`m-0 ${className}`}>
      <div className="overflow-hidden rounded-xl bg-[var(--bg-elev-2)] border border-[var(--line)]">
        <img
          src={`/media/${media.file}`}
          width={media.width}
          height={media.height}
          alt={media.alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          className={`w-full ${portrait ? 'max-h-[min(70vh,34rem)] object-contain' : 'h-auto max-h-[min(60vh,30rem)] object-cover'}`}
        />
      </div>
      <figcaption className="mt-2 text-[0.8rem] leading-relaxed soft flex flex-col gap-0.5">
        {media.reconstruction && <span className="text-[var(--c-offen)] font-semibold text-[0.7rem] uppercase tracking-wider">Rekonstruktion</span>}
        <span>{media.caption}</span>
        <span className="muted text-[0.72rem]">
          {media.author} ·{' '}
          <a href={media.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2">
            {media.license}
          </a>{' '}
          · Wikimedia Commons, für die Anzeige verkleinert
        </span>
      </figcaption>
    </figure>
  )
}
