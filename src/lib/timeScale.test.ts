import { describe, expect, it } from 'vitest'
import { MAX_YEAR, MIN_YEAR, ticks, totalWidth, xToYear, yearToX } from './timeScale.ts'

describe('Zeitskala', () => {
  it('bildet Anfang und Ende auf die Ränder ab', () => {
    expect(yearToX(MIN_YEAR, 1)).toBe(0)
    expect(yearToX(MAX_YEAR, 1)).toBeCloseTo(totalWidth(1))
  })
  it('ist streng monoton', () => {
    let last = -1
    for (const y of [-2_000_000, -50_000, -9000, -3000, -44, 0, 1, 800, 1517, 1789, 1990]) {
      const x = yearToX(y, 2)
      expect(x).toBeGreaterThan(last)
      last = x
    }
  })
  it('ist umkehrbar', () => {
    for (const y of [-200_000, -7000, -264, 1453, 1914]) expect(xToYear(yearToX(y, 3), 3)).toBeCloseTo(y, 5)
  })
  it('liefert sortierte Achsenmarken mit Mindestabstand', () => {
    const t = ticks(1)
    for (let i = 1; i < t.length; i++) expect(t[i].x - t[i - 1].x).toBeGreaterThan(30)
  })
})
