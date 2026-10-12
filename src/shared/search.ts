/**
 * Gemeinsame Suchkonfiguration für Index-Aufbau (Build) und Suche (Browser).
 * Beide Seiten MÜSSEN dieselben Optionen verwenden, sonst passt der serialisierte Index nicht.
 */
import type { Options, SearchOptions } from 'minisearch'
import type { SearchDoc } from './types.ts'

/**
 * Normalisiert deutsche und fremdsprachige Schreibweisen:
 * Kleinschreibung, Umlaute/ß als Grundbuchstaben, Diakritika entfernt (Ḫammurapi → hammurapi),
 * typische Transliterationsvarianten vereinheitlicht.
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ʾʿ'’‘`´]/g, '')
    // Transliterationsvarianten: ae/oe/ue (Caesar ↔ Cäsar), ph/f, th/t, c/k am Wortanfang, y/i, j/i (Pompejus ↔ Pompeius)
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/(^|\s)c(?=[aou])/g, '$1k')
    .replace(/y/g, 'i')
    .replace(/j/g, 'i')
}

/** Häufige deutsche Füllwörter – tragen nichts zur Treffergenauigkeit bei */
export const STOP_WORDS = new Set(
  'der die das den dem des ein eine einer eines einem einen und oder in im ins am an auf aus bei mit nach von vom zu zum zur fur uber unter als auch es sich sie er wie wo was wer ist sind war waren wird werden wurde wurden hat haben nicht noch nur so um bis dass da'.split(' '),
)

export function tokenize(text: string): string[] {
  return text.split(/[\s\-–—/.,;:!?()[\]{}"„“”«»]+/u).filter(Boolean)
}

export function processTerm(term: string): string | null {
  const t = normalize(term)
  if (t.length < 2 && !/\d/.test(t)) return null
  if (STOP_WORDS.has(t)) return null
  return t
}

export const SEARCH_FIELDS = ['title', 'aliases', 'summary', 'text'] as const
export const STORE_FIELDS = ['kind', 'ref', 'title', 'summary', 'from', 'to', 'regions', 'themes'] as const

export const MINISEARCH_OPTIONS: Options<SearchDoc> = {
  idField: 'id',
  fields: [...SEARCH_FIELDS],
  storeFields: [...STORE_FIELDS],
  tokenize,
  processTerm,
}

export const DEFAULT_SEARCH: SearchOptions = {
  boost: { title: 6, aliases: 4, summary: 2, text: 1 },
  prefix: (term) => term.length >= 3,
  fuzzy: (term) => (term.length >= 5 ? 0.2 : term.length >= 4 ? 1 : false),
  combineWith: 'AND',
}

/** Rangfolge der Ergebnistypen bei Gleichstand: ausführliche Artikel zuerst */
export const KIND_WEIGHT: Record<string, number> = {
  article: 1.6,
  epoch: 1.3,
  theme: 1.2,
  event: 1.1,
  person: 1.1,
  polity: 1.05,
  place: 1,
  culture: 1,
  term: 0.95,
  route: 0.95,
  source: 0.6,
  region: 0.9,
}
