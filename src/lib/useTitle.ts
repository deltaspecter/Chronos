import { useEffect } from 'react'

/** Setzt den Dokumenttitel (wichtig für Verlauf, Lesezeichen des Browsers und Screenreader) */
export function useTitle(title: string | undefined) {
  useEffect(() => {
    if (title) document.title = `${title} – CHRONOS`
    else document.title = 'CHRONOS – Enzyklopädie der Menschheitsgeschichte'
  }, [title])
}
