/**
 * Stückweise lineare Zeitskala für die Zeitleiste.
 *
 * Die Menschheitsgeschichte umfasst über drei Millionen Jahre, aber die Dichte der
 * Ereignisse nimmt zur Gegenwart hin stark zu. Eine lineare Skala wäre unbrauchbar.
 * Die Skala teilt die Zeit daher in Abschnitte mit jeweils eigener Auflösung;
 * die Abschnittsgrenzen werden in der Zeitleiste sichtbar markiert (Skalenwechsel).
 * Alle Jahre sind astronomische Jahre (1 v. Chr. = 0).
 */

export interface Segment {
  from: number
  to: number
  /** Breite des Abschnitts in Pixeln bei Zoom 1 */
  px: number
}

export const SEGMENTS: Segment[] = [
  { from: -3_300_000, to: -100_000, px: 130 },
  { from: -100_000, to: -10_000, px: 150 },
  { from: -10_000, to: -3_500, px: 200 },
  { from: -3_500, to: -500, px: 420 },
  { from: -500, to: 500, px: 380 },
  { from: 500, to: 1500, px: 360 },
  { from: 1500, to: 1800, px: 300 },
  { from: 1800, to: 2030, px: 380 },
]

export const MIN_YEAR = SEGMENTS[0].from
export const MAX_YEAR = SEGMENTS[SEGMENTS.length - 1].to

export function totalWidth(zoom: number): number {
  return SEGMENTS.reduce((s, seg) => s + seg.px, 0) * zoom
}

export function yearToX(year: number, zoom: number): number {
  let x = 0
  for (const seg of SEGMENTS) {
    if (year <= seg.to) {
      const clamped = Math.max(seg.from, year)
      return (x + ((clamped - seg.from) / (seg.to - seg.from)) * seg.px) * zoom
    }
    x += seg.px
  }
  return x * zoom
}

export function xToYear(x: number, zoom: number): number {
  let acc = 0
  const target = x / zoom
  for (const seg of SEGMENTS) {
    if (target <= acc + seg.px) return seg.from + ((target - acc) / seg.px) * (seg.to - seg.from)
    acc += seg.px
  }
  return MAX_YEAR
}

/** Pixel pro Jahr an einer Stelle der Skala */
export function density(year: number, zoom: number): number {
  const seg = SEGMENTS.find((s) => year >= s.from && year <= s.to) ?? SEGMENTS[SEGMENTS.length - 1]
  return (seg.px / (seg.to - seg.from)) * zoom
}

const NICE = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10_000, 20_000, 25_000, 50_000, 100_000, 200_000, 250_000, 500_000, 1_000_000]

/** Achsenmarken: pro Abschnitt ein „schönes“ Intervall mit mindestens minGap Pixeln Abstand */
export function ticks(zoom: number, minGap = 90): { year: number; x: number; major: boolean }[] {
  const out: { year: number; x: number; major: boolean }[] = []
  for (const seg of SEGMENTS) {
    const pxPerYear = (seg.px * zoom) / (seg.to - seg.from)
    const step = NICE.find((n) => n * pxPerYear >= minGap) ?? NICE[NICE.length - 1]
    // Marken auf „runde“ historische Jahre legen (500 v. Chr. = astronomisch −499)
    const toAstro = (h: number) => (h < 0 ? h + 1 : h)
    const histFrom = seg.from <= 0 ? seg.from - 1 : seg.from
    const start = Math.ceil(histFrom / step) * step
    for (let h = start; toAstro(h) < seg.to; h += step) {
      if (h === 0) continue
      const y = toAstro(h)
      if (y < seg.from) continue
      out.push({ year: y, x: yearToX(y, zoom), major: y === seg.from })
    }
  }
  out.push({ year: MAX_YEAR, x: yearToX(MAX_YEAR, zoom), major: false })
  // Dubletten an Abschnittsgrenzen entfernen
  return out.filter((t, i) => i === 0 || t.x - out[i - 1].x > 30)
}

/** Kurze Achsenbeschriftung */
export function tickLabel(astroYear: number): string {
  if (astroYear <= -20_000) {
    const ago = -astroYear
    if (ago >= 1_000_000) return `${(ago / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio.`
    return `${(ago / 1000).toLocaleString('de-DE')} Tsd.`
  }
  if (astroYear <= 0) {
    const y = 1 - astroYear
    return `${y.toLocaleString('de-DE')} v.`
  }
  return String(astroYear)
}
