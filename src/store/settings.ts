import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeSetting = 'dark' | 'light' | 'system'

export interface Settings {
  theme: ThemeSetting
  /** Faktor für die Grundschrift (1 = 100 %) */
  fontScale: number
  /** Zeilenabstand im Lesetext */
  lineHeight: number
  /** Schrift des Lesetextes */
  readingFont: 'serif' | 'sans'
  /** Beim Öffnen eines Artikels die letzte Leseposition anbieten */
  resumeReading: boolean
  /** Lesefortschrittsbalken in langen Artikeln */
  showProgress: boolean
  /** Animationen reduzieren (zusätzlich zur Systemeinstellung) */
  reduceMotion: boolean
  set: (patch: Partial<Omit<Settings, 'set' | 'reset'>>) => void
  reset: () => void
}

const DEFAULTS = {
  theme: 'dark' as ThemeSetting,
  fontScale: 1,
  lineHeight: 1.7,
  readingFont: 'serif' as const,
  resumeReading: true,
  showProgress: true,
  reduceMotion: false,
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULTS),
    }),
    { name: 'chronos-settings', version: 1 },
  ),
)

export function resolvedTheme(theme: ThemeSetting): 'dark' | 'light' {
  if (theme !== 'system') return theme
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/** Überträgt die Einstellungen auf das Dokument (CSS-Variablen, Theme-Attribut) */
export function applySettings(s: Pick<Settings, 'theme' | 'fontScale' | 'lineHeight' | 'readingFont' | 'reduceMotion'>) {
  const root = document.documentElement
  const theme = resolvedTheme(s.theme)
  root.dataset.theme = theme
  root.dataset.readingFont = s.readingFont
  root.dataset.reduceMotion = String(s.reduceMotion)
  root.style.setProperty('--font-scale', String(s.fontScale))
  root.style.setProperty('--reading-leading', String(s.lineHeight))
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute('content', theme === 'dark' ? '#0d1320' : '#f6f1e6')
    m.removeAttribute('media')
  })
}
