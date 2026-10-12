/**
 * Historische Datierungen.
 *
 * Schreibweise in den Inhaltsdateien (YAML/Front-Matter):
 *   "1789-07-14"   Tagesdatum (n. Chr.)
 *   "-44-03-15"    Tagesdatum v. Chr. (historische Zählung, es gibt kein Jahr 0)
 *   "-264"         Jahr v. Chr.
 *   "~-3100"       ungefähre Angabe („um 3100 v. Chr.“)
 *   "-2600?"       unsichere/umstrittene Angabe
 *   "~-300000"     Tiefenzeit – wird als „vor ca. 300.000 Jahren“ angezeigt
 *
 * Intern wird mit astronomischen Jahren gerechnet (1 v. Chr. = 0), damit Dauern stimmen.
 */

export interface HDate {
  /** Historisches Jahr: negativ = v. Chr., nie 0 */
  year: number
  month?: number
  day?: number
  /** „um“, „ca.“ */
  approx?: boolean
  /** Datierung in der Forschung unsicher oder umstritten */
  uncertain?: boolean
}

export interface HSpan {
  start: HDate
  end?: HDate
}

const PATTERN = /^(~)?(-?\d+)(?:-(\d{1,2}))?(?:-(\d{1,2}))?(\?)?$/

export function parseDate(input: string | number): HDate {
  const raw = String(input).trim()
  const match = PATTERN.exec(raw)
  if (!match) throw new Error(`Ungültige Datierung: "${raw}"`)
  const [, approx, yearRaw, monthRaw, dayRaw, uncertain] = match
  const year = Number(yearRaw)
  if (year === 0) throw new Error(`Es gibt kein Jahr 0: "${raw}"`)
  const date: HDate = { year }
  if (monthRaw) {
    const month = Number(monthRaw)
    if (month < 1 || month > 12) throw new Error(`Ungültiger Monat in "${raw}"`)
    date.month = month
  }
  if (dayRaw) {
    const day = Number(dayRaw)
    if (day < 1 || day > 31) throw new Error(`Ungültiger Tag in "${raw}"`)
    date.day = day
  }
  if (approx) date.approx = true
  if (uncertain) date.uncertain = true
  return date
}

/** Astronomisches Jahr (1 v. Chr. = 0, 2 v. Chr. = −1) für Berechnungen und Skalen. */
export function astro(date: HDate): number {
  return date.year < 0 ? date.year + 1 : date.year
}

/** Astronomisches Jahr → historisches Jahr */
export function fromAstro(year: number): number {
  const rounded = Math.round(year)
  return rounded <= 0 ? rounded - 1 : rounded
}

/** Bruchteilsjahr für feine Sortierung (Monat/Tag) */
export function sortKey(date: HDate): number {
  return astro(date) + ((date.month ?? 1) - 1) / 12 + ((date.day ?? 1) - 1) / 372
}

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

const nf = new Intl.NumberFormat('de-DE')

/**
 * Ab wann Jahre als „vor … Jahren“ dargestellt werden (Tiefenzeit).
 * In der Tiefenzeit ist der Unterschied zwischen „v. Chr.“ und „vor heute“ (rund 2000 Jahre)
 * kleiner als jede Datierungsunsicherheit – angezeigt wird daher der Betrag des Jahres.
 */
export const DEEP_TIME = -20000

export function formatYear(year: number, opts: { era?: 'auto' | 'always' } = {}): string {
  if (year <= DEEP_TIME) return `vor ${nf.format(-year)} Jahren`
  if (year < 0) return `${Math.abs(year) >= 10000 ? nf.format(-year) : -year} v. Chr.`
  return opts.era === 'always' ? `${year} n. Chr.` : String(year)
}

export function formatDate(date: HDate, opts: { era?: 'auto' | 'always' } = {}): string {
  let text: string
  if (date.year <= DEEP_TIME) {
    const ago = -date.year
    text = `vor ${date.approx ? 'ca. ' : ''}${nf.format(ago)} Jahren`
    return date.uncertain ? `${text} (unsicher)` : text
  }
  const yearText = formatYear(date.year, opts)
  if (date.day && date.month) text = `${date.day}. ${MONTHS[date.month - 1]} ${yearText}`
  else if (date.month) text = `${MONTHS[date.month - 1]} ${yearText}`
  else text = yearText
  if (date.approx) text = `um ${text}`
  if (date.uncertain) text = `${text} (?)`
  return text
}

/** Zeitraum kompakt: „264–146 v. Chr.“, „um 3100 – 2686 v. Chr.“, „27 v. Chr. – 14 n. Chr.“ */
export function formatSpan(span: HSpan): string {
  const { start, end } = span
  if (!end) return formatDate(start)
  if (start.year <= DEEP_TIME && end.year <= DEEP_TIME) {
    return `vor ${start.approx ? 'ca. ' : ''}${nf.format(-start.year)} bis ${nf.format(-end.year)} Jahren`
  }
  const sameEra = (start.year < 0) === (end.year < 0)
  const simple = !start.month && !end.month && !start.approx && !end.approx && !start.uncertain && !end.uncertain
  if (sameEra && simple && start.year > DEEP_TIME) {
    if (start.year < 0) return `${-start.year}–${-end.year} v. Chr.`
    return `${start.year}–${end.year}`
  }
  const crossesEra = start.year < 0 && end.year > 0
  const left = formatDate(start)
  const right = formatDate(end, { era: crossesEra ? 'always' : 'auto' })
  return `${left} – ${right}`
}

export function spanFrom(start: string | number, end?: string | number): HSpan {
  return end === undefined || end === null ? { start: parseDate(start) } : { start: parseDate(start), end: parseDate(end) }
}

/** Überschneidet der Zeitraum das Intervall [from, to] (astronomische Jahre)? */
export function overlaps(span: HSpan, from: number, to: number): boolean {
  const s = astro(span.start)
  const e = span.end ? astro(span.end) : s
  return s <= to && e >= from
}

/**
 * Erkennt Jahresangaben in Suchanfragen: „1789“, „44 v. Chr.“, „3. Jh. v. Chr.“, „12. Jahrhundert“.
 * Gibt das Intervall in astronomischen Jahren zurück.
 */
export function parseYearQuery(query: string): { from: number; to: number; label: string; rest: string } | null {
  const q = query.toLowerCase()
  const century = /(\d{1,2})\s*\.?\s*(?:jh\.?|jahrhundert)\s*(v\.?\s*chr\.?|n\.?\s*chr\.?)?/.exec(q)
  if (century) {
    const n = Number(century[1])
    const bce = !!century[2]?.startsWith('v')
    const from = bce ? -(n * 100) + 1 : (n - 1) * 100 + 1
    const to = bce ? -((n - 1) * 100) : n * 100
    return {
      from,
      to,
      label: `${n}. Jahrhundert${bce ? ' v. Chr.' : ''}`,
      rest: (q.slice(0, century.index) + q.slice(century.index + century[0].length)).trim(),
    }
  }
  const year = /(?:^|\s)(\d{1,4})\s*(v\.?\s*chr\.?|n\.?\s*chr\.?)?(?=\s|$)/.exec(q)
  if (year) {
    const n = Number(year[1])
    const bce = !!year[2]?.startsWith('v')
    const explicit = !!year[2]
    // Eine nackte, kurze Zahl (z. B. „2“) ist meistens keine Jahresangabe
    if (!explicit && n < 100) return null
    const hist = bce ? -n : n
    const a = hist < 0 ? hist + 1 : hist
    return {
      from: a,
      to: a,
      label: formatYear(hist, { era: bce ? 'auto' : 'always' }),
      rest: (q.slice(0, year.index) + q.slice(year.index + year[0].length)).trim(),
    }
  }
  return null
}
