import { describe, expect, it } from 'vitest'
import { astro, formatDate, formatSpan, fromAstro, parseDate, parseYearQuery, spanFrom } from './dates.ts'

describe('parseDate', () => {
  it('liest Jahre, Tage und Kennzeichen', () => {
    expect(parseDate('-264')).toEqual({ year: -264 })
    expect(parseDate('1789-07-14')).toEqual({ year: 1789, month: 7, day: 14 })
    expect(parseDate('-44-03-15')).toEqual({ year: -44, month: 3, day: 15 })
    expect(parseDate('~-3100')).toEqual({ year: -3100, approx: true })
    expect(parseDate('-2600?')).toEqual({ year: -2600, uncertain: true })
  })
  it('lehnt das Jahr 0 und Unsinn ab', () => {
    expect(() => parseDate('0')).toThrow()
    expect(() => parseDate('um 300')).toThrow()
    expect(() => parseDate('1789-13-01')).toThrow()
  })
})

describe('astronomische Jahre', () => {
  it('kennt kein Jahr 0', () => {
    expect(astro({ year: -1 })).toBe(0)
    expect(astro({ year: 1 })).toBe(1)
    expect(fromAstro(0)).toBe(-1)
    expect(fromAstro(-43)).toBe(-44)
  })
  it('berechnet Dauern über die Zeitenwende korrekt', () => {
    // Augustus: 63 v. Chr. bis 14 n. Chr. = 76 Jahre
    expect(astro({ year: 14 }) - astro({ year: -63 })).toBe(76)
  })
})

describe('Formatierung', () => {
  it('zeigt v. Chr. und ungefähre Angaben', () => {
    expect(formatDate(parseDate('-264'))).toBe('264 v. Chr.')
    expect(formatDate(parseDate('~-3100'))).toBe('um 3100 v. Chr.')
    expect(formatDate(parseDate('1789-07-14'))).toBe('14. Juli 1789')
    expect(formatDate(parseDate('-2600?'))).toBe('2600 v. Chr. (?)')
  })
  it('zeigt Tiefenzeit als „vor … Jahren“', () => {
    expect(formatDate(parseDate('~-300000'))).toBe('vor ca. 300.000 Jahren')
  })
  it('fasst Zeiträume zusammen', () => {
    expect(formatSpan(spanFrom('-264', '-146'))).toBe('264–146 v. Chr.')
    expect(formatSpan(spanFrom('1914', '1918'))).toBe('1914–1918')
    expect(formatSpan(spanFrom('-27', '476'))).toBe('27 v. Chr. – 476 n. Chr.')
  })
})

describe('Zeitangaben in Suchanfragen', () => {
  it('erkennt Jahre mit und ohne Ära', () => {
    expect(parseYearQuery('1789')).toMatchObject({ from: 1789, to: 1789, rest: '' })
    expect(parseYearQuery('Schlacht 216 v. Chr.')).toMatchObject({ from: -215, to: -215, rest: 'schlacht' })
  })
  it('erkennt Jahrhunderte', () => {
    // 3. Jh. v. Chr. = 300–201 v. Chr. = astronomisch −299 bis −200
    expect(parseYearQuery('3. Jh. v. Chr.')).toMatchObject({ from: -299, to: -200 })
    expect(parseYearQuery('14. Jahrhundert')).toMatchObject({ from: 1301, to: 1400 })
  })
  it('ignoriert kleine nackte Zahlen', () => {
    expect(parseYearQuery('Ramses 2')).toBeNull()
  })
})
