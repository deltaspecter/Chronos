import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Lesefortschritt innerhalb eines Elements (0–1) und aktuell sichtbarer Abschnitt.
 * Arbeitet mit requestAnimationFrame-Drosselung; keine Layout-Arbeit pro Scroll-Ereignis.
 */
export function useReadingProgress(ref: RefObject<HTMLElement | null>, headingIds: string[], enabled: boolean) {
  const [progress, setProgress] = useState(0)
  const [section, setSection] = useState<string | undefined>()
  const frame = useRef(0)

  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return
    const update = () => {
      frame.current = 0
      const rect = el.getBoundingClientRect()
      const total = rect.height - window.innerHeight * 0.6
      const read = -rect.top + window.innerHeight * 0.25
      setProgress(Math.min(1, Math.max(0, total > 0 ? read / total : 1)))
      let current: string | undefined
      for (const id of headingIds) {
        const h = document.getElementById(id)
        if (h && h.getBoundingClientRect().top < window.innerHeight * 0.3) current = id
      }
      setSection(current)
    }
    const onScroll = () => {
      if (!frame.current) frame.current = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [ref, headingIds, enabled])

  return { progress, section }
}
