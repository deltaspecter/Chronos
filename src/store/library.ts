/**
 * Persönliche Bibliothek: Lesezeichen, Notizen, Verlauf, Lesestand, Offline-Liste.
 * Alles bleibt ausschließlich auf dem Gerät (localStorage) – es gibt kein Konto und keinen Server.
 * Export/Import als JSON-Datei ist in den Einstellungen möglich.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EntityKind } from '@/shared/types.ts'

export interface Bookmark {
  kind: EntityKind
  id: string
  title: string
  added: string
}

export interface Note {
  id: string
  /** Artikel- oder Eintrags-ID, auf die sich die Notiz bezieht */
  target: { kind: EntityKind; id: string; title: string }
  /** Optionaler Abschnitt (Anker-ID im Artikel) */
  section?: { id: string; title: string }
  text: string
  created: string
  updated: string
}

export interface HistoryEntry {
  kind: EntityKind
  id: string
  title: string
  visited: string
}

export interface ReadingPosition {
  /** Anteil 0–1 */
  progress: number
  /** zuletzt sichtbarer Abschnitt */
  section?: string
  updated: string
}

export interface OfflineEntry {
  id: string
  title: string
  /** Hash der gespeicherten Fassung – weicht er vom Katalog ab, gibt es eine neuere Version */
  hash: string
  file: string
  media: string[]
  bytes: number
  saved: string
}

interface LibraryState {
  bookmarks: Bookmark[]
  notes: Note[]
  history: HistoryEntry[]
  positions: Record<string, ReadingPosition>
  offline: Record<string, OfflineEntry>
  toggleBookmark: (b: Omit<Bookmark, 'added'>) => void
  isBookmarked: (kind: EntityKind, id: string) => boolean
  saveNote: (note: Omit<Note, 'id' | 'created' | 'updated'> & { id?: string }) => void
  deleteNote: (id: string) => void
  visit: (entry: Omit<HistoryEntry, 'visited'>) => void
  clearHistory: () => void
  setPosition: (articleId: string, pos: Omit<ReadingPosition, 'updated'>) => void
  setOffline: (entry: OfflineEntry) => void
  removeOffline: (id: string) => void
  importData: (data: Partial<Pick<LibraryState, 'bookmarks' | 'notes' | 'history' | 'positions'>>) => void
  clearAll: () => void
}

const HISTORY_LIMIT = 50
const now = () => new Date().toISOString()

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      notes: [],
      history: [],
      positions: {},
      offline: {},
      toggleBookmark: (b) =>
        set((s) =>
          s.bookmarks.some((x) => x.kind === b.kind && x.id === b.id)
            ? { bookmarks: s.bookmarks.filter((x) => !(x.kind === b.kind && x.id === b.id)) }
            : { bookmarks: [{ ...b, added: now() }, ...s.bookmarks] },
        ),
      isBookmarked: (kind, id) => get().bookmarks.some((x) => x.kind === kind && x.id === id),
      saveNote: (note) =>
        set((s) => {
          if (note.id) {
            return { notes: s.notes.map((n) => (n.id === note.id ? { ...n, ...note, id: n.id, updated: now() } : n)) }
          }
          const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())
          return { notes: [{ ...note, id, created: now(), updated: now() }, ...s.notes] }
        }),
      deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      visit: (entry) =>
        set((s) => ({
          history: [{ ...entry, visited: now() }, ...s.history.filter((h) => !(h.kind === entry.kind && h.id === entry.id))].slice(0, HISTORY_LIMIT),
        })),
      clearHistory: () => set({ history: [] }),
      setPosition: (articleId, pos) => set((s) => ({ positions: { ...s.positions, [articleId]: { ...pos, updated: now() } } })),
      setOffline: (entry) => set((s) => ({ offline: { ...s.offline, [entry.id]: entry } })),
      removeOffline: (id) =>
        set((s) => {
          const offline = { ...s.offline }
          delete offline[id]
          return { offline }
        }),
      importData: (data) =>
        set((s) => ({
          bookmarks: mergeBy([...(data.bookmarks ?? []), ...s.bookmarks], (b) => `${b.kind}:${b.id}`),
          notes: mergeBy([...(data.notes ?? []), ...s.notes], (n) => n.id),
          history: mergeBy([...(data.history ?? []), ...s.history], (h) => `${h.kind}:${h.id}`).slice(0, HISTORY_LIMIT),
          positions: { ...(data.positions ?? {}), ...s.positions },
        })),
      clearAll: () => set({ bookmarks: [], notes: [], history: [], positions: {} }),
    }),
    { name: 'chronos-library', version: 1 },
  ),
)

function mergeBy<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
