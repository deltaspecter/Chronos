/**
 * Registrierung des Service Workers und Update-Erkennung.
 * Eine neue Version wird nicht ungefragt aktiviert: Die App zeigt einen dezenten Hinweis
 * „Neue Version verfügbar – Neu laden“. Beim Neuladen übernimmt der neue Service Worker.
 */
import { create } from 'zustand'

interface SwState {
  updateReady: boolean
  waiting: ServiceWorker | null
  online: boolean
  offlineReady: boolean
}

export const useSw = create<SwState>(() => ({
  updateReady: false,
  waiting: null,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  offlineReady: false,
}))

export function registerServiceWorker() {
  window.addEventListener('online', () => useSw.setState({ online: true }))
  window.addEventListener('offline', () => useSw.setState({ online: false }))
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      const markWaiting = (worker: ServiceWorker | null) => {
        if (worker && navigator.serviceWorker.controller) useSw.setState({ updateReady: true, waiting: worker })
      }
      markWaiting(registration.waiting)
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') {
            if (navigator.serviceWorker.controller) markWaiting(worker)
            else useSw.setState({ offlineReady: true })
          }
        })
      })
      if (registration.active) useSw.setState({ offlineReady: true })
      // Beim Zurückkehren in die App (z. B. vom Home-Bildschirm) nach Updates sehen
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {})
      })
      setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000)
    } catch (error) {
      console.warn('[chronos] Service Worker konnte nicht registriert werden', error)
    }
  })

  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  })
}

export function applyUpdate() {
  const { waiting } = useSw.getState()
  if (waiting) waiting.postMessage('SKIP_WAITING')
  else window.location.reload()
}
