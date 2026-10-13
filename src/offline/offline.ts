/**
 * Ausdrückliches Offline-Speichern einzelner Artikel.
 *
 * Gespeichert werden der Artikeltext (JSON mit HTML, Inhaltsverzeichnis, Belegen) und die
 * Abbildungen des Artikels – in einem eigenen Cache, den der Service Worker nie automatisch leert.
 * Die Kerndaten (Katalog, Wissensnetz, Suchindex, Karte) speichert der Service Worker ohnehin
 * mit der App, sodass Inhaltsverzeichnis, Zeitleiste und Atlas offline funktionieren.
 *
 * Grenzen: höchstens MAX_ARTICLES Artikel – kein unkontrolliertes Herunterladen.
 */
import { manifest } from '@/data/load.ts'
import type { ArticleBody, ArticleMeta, Media } from '@/shared/types.ts'
import { useLibrary, type OfflineEntry } from '@/store/library.ts'

export const OFFLINE_CACHE = 'chronos-offline'
export const MAX_ARTICLES = 200

export function offlineSupported(): boolean {
  return typeof window !== 'undefined' && 'caches' in window && window.isSecureContext
}

export async function saveArticleOffline(meta: ArticleMeta, mediaIndex: Map<string, Media>): Promise<OfflineEntry> {
  if (!offlineSupported()) throw new Error('Dieser Browser unterstützt keine Offline-Speicherung (sichere Verbindung erforderlich).')
  const count = Object.keys(useLibrary.getState().offline).length
  if (count >= MAX_ARTICLES && !useLibrary.getState().offline[meta.id]) {
    throw new Error(`Es können höchstens ${MAX_ARTICLES} Artikel offline gespeichert werden. Bitte zuerst ältere entfernen.`)
  }
  const cache = await caches.open(OFFLINE_CACHE)
  const response = await fetch(meta.file)
  if (!response.ok) throw new Error('Der Artikel konnte nicht geladen werden.')
  const text = await response.clone().text()
  await cache.put(meta.file, response)
  const body = JSON.parse(text) as ArticleBody
  let bytes = text.length
  const mediaFiles: string[] = []
  for (const id of body.media) {
    const media = mediaIndex.get(id)
    if (!media) continue
    const url = `/media/${media.file}`
    try {
      const r = await fetch(url)
      if (r.ok) {
        const blob = await r.clone().blob()
        bytes += blob.size
        await cache.put(url, r)
        mediaFiles.push(url)
      }
    } catch {
      /* Bild optional – Artikeltext bleibt lesbar */
    }
  }
  const previous = useLibrary.getState().offline[meta.id]
  if (previous && previous.file !== meta.file) await cache.delete(previous.file)
  const entry: OfflineEntry = { id: meta.id, title: meta.title, hash: meta.hash, file: meta.file, media: mediaFiles, bytes, saved: new Date().toISOString() }
  useLibrary.getState().setOffline(entry)
  return entry
}

export async function removeArticleOffline(id: string): Promise<void> {
  const entry = useLibrary.getState().offline[id]
  if (!entry) return
  if (offlineSupported()) {
    const cache = await caches.open(OFFLINE_CACHE)
    await cache.delete(entry.file)
    // Bilder nur löschen, wenn kein anderer gespeicherter Artikel sie verwendet
    const others = Object.values(useLibrary.getState().offline).filter((e) => e.id !== id)
    for (const url of entry.media) if (!others.some((o) => o.media.includes(url))) await cache.delete(url)
  }
  useLibrary.getState().removeOffline(id)
}

/** Gespeicherte Artikel, für die eine neuere Fassung vorliegt */
export function outdatedOffline(articles: Map<string, ArticleMeta>): OfflineEntry[] {
  return Object.values(useLibrary.getState().offline).filter((e) => {
    const meta = articles.get(e.id)
    return meta && meta.hash !== e.hash
  })
}

/**
 * Aktualisiert gespeicherte Artikel auf die Fassung dieser App-Version (nur online).
 * Entfernte Artikel bleiben gespeichert, werden aber als „nicht mehr im Bestand“ angezeigt.
 */
export async function refreshOffline(articles: Map<string, ArticleMeta>, mediaIndex: Map<string, Media>): Promise<number> {
  if (!navigator.onLine || !offlineSupported()) return 0
  let updated = 0
  for (const entry of outdatedOffline(articles)) {
    const meta = articles.get(entry.id)!
    try {
      await saveArticleOffline(meta, mediaIndex)
      updated++
    } catch {
      /* nächster Versuch beim nächsten Start */
    }
  }
  return updated
}

export async function storageEstimate(): Promise<{ usage: number; quota: number; persisted: boolean } | null> {
  if (!navigator.storage?.estimate) return null
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  const persisted = (await navigator.storage.persisted?.()) ?? false
  return { usage, quota, persisted }
}

export async function requestPersistence(): Promise<boolean> {
  return (await navigator.storage?.persist?.()) ?? false
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

export const dataVersion = manifest.version
