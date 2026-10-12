/**
 * Laden der generierten Inhaltsdaten.
 *
 * Alle Dateinamen enthalten einen Inhalts-Hash (siehe scripts/build-content.ts). Das Manifest
 * wird beim Build in die App eingebunden – App und Daten haben also immer dieselbe Version.
 *
 * Fallback-Kette: Netz (bzw. Service Worker) → Cache API (offline gespeicherte Artikel).
 * Die zweite Stufe sorgt dafür, dass offline gespeicherte Artikel auch dann lesbar sind,
 * wenn (noch) kein Service Worker die Seite kontrolliert.
 */
import manifestJson from '@/generated/data-manifest.json'
import type { ArticleBody, ArticleMeta, Entities, Manifest, Taxonomy } from '@/shared/types.ts'

export const manifest = manifestJson as Manifest

export class LoadError extends Error {
  constructor(
    message: string,
    readonly offline: boolean,
  ) {
    super(message)
  }
}

export async function fetchJson<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new LoadError(`Die Datei ${url} konnte nicht geladen werden (HTTP ${response.status}).`, false)
    return (await response.json()) as T
  } catch (error) {
    if ('caches' in globalThis) {
      try {
        const cached = await caches.match(url, { ignoreVary: true })
        if (cached) return (await cached.json()) as T
      } catch {
        /* Cache API nicht verfügbar (z. B. privater Modus) */
      }
    }
    if (error instanceof LoadError) throw error
    throw new LoadError(
      navigator.onLine
        ? 'Die Inhalte konnten nicht geladen werden. Bitte später erneut versuchen.'
        : 'Keine Internetverbindung – dieser Inhalt ist nicht offline gespeichert.',
      !navigator.onLine,
    )
  }
}

export interface CoreData {
  articles: ArticleMeta[]
  slugs: Record<string, string>
  taxonomy: Taxonomy
  entities: Entities
}

let corePromise: Promise<CoreData> | null = null

export function loadCore(): Promise<CoreData> {
  corePromise ??= Promise.all([
    fetchJson<{ articles: ArticleMeta[]; slugs: Record<string, string> }>(manifest.files.catalog),
    fetchJson<Taxonomy>(manifest.files.taxonomy),
    fetchJson<Entities>(manifest.files.entities),
  ]).then(([catalog, taxonomy, entities]) => ({ articles: catalog.articles, slugs: catalog.slugs, taxonomy, entities }))
  corePromise.catch(() => {
    corePromise = null
  })
  return corePromise
}

const bodyCache = new Map<string, Promise<ArticleBody>>()

export function loadArticleBody(meta: ArticleMeta): Promise<ArticleBody> {
  let promise = bodyCache.get(meta.file)
  if (!promise) {
    promise = fetchJson<ArticleBody>(meta.file)
    promise.catch(() => bodyCache.delete(meta.file))
    bodyCache.set(meta.file, promise)
  }
  return promise
}
