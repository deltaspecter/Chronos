/**
 * Typen der generierten Inhaltsdaten (public/data/*.json).
 * Erzeugt von scripts/build-content.ts aus den Dateien in content/.
 * Die UI liest ausschließlich diese Strukturen – nie die Rohdateien.
 */
import type { HSpan } from './dates.ts'

export type EntityKind =
  | 'article'
  | 'epoch'
  | 'theme'
  | 'person'
  | 'place'
  | 'event'
  | 'polity'
  | 'culture'
  | 'term'
  | 'source'
  | 'region'
  | 'route'

/** Redaktioneller Status – ehrliche Kennzeichnung des Prüfstands */
export type ReviewStatus = 'entwurf' | 'erstfassung' | 'geprueft' | 'begutachtet'

export type Certainty = 'gesichert' | 'wahrscheinlich' | 'umstritten' | 'unsicher'

export interface Ref {
  kind: EntityKind
  id: string
}

export interface ArticleMeta {
  id: string
  slug: string
  title: string
  subtitle?: string
  /** Art des Artikels – bestimmt die Gliederungsvorlage */
  type: 'ueberblick' | 'ereignis' | 'person' | 'epoche' | 'thema' | 'ort' | 'staat' | 'kultur'
  summary: string
  span?: HSpan
  spanNote?: string
  epochs: string[]
  themes: string[]
  regions: string[]
  aliases: string[]
  status: ReviewStatus
  version: number
  updated: string
  readingMinutes: number
  words: number
  image?: string
  series?: { id: string; title: string; order: number }
  /** Pfad der Artikeldatei inkl. Inhalts-Hash */
  file: string
  hash: string
}

export interface TocEntry {
  id: string
  title: string
  level: 2 | 3
}

export interface Citation {
  /** Laufende Nummer im Artikel */
  n: number
  source: string
  locator?: string
}

export interface ArticleBody {
  id: string
  html: string
  toc: TocEntry[]
  citations: Citation[]
  /** Literatur/Quellen der Artikel-Bibliografie (zusätzlich zu den zitierten) */
  bibliography: string[]
  persons: string[]
  places: string[]
  events: string[]
  polities: string[]
  cultures: string[]
  terms: string[]
  related: string[]
  /** Artikel, die auf diesen Artikel verweisen (berechnet) */
  backlinks: string[]
  /** Vorheriger/nächster Artikel der Reihe */
  prev?: string
  next?: string
  history: { version: number; date: string; note: string }[]
  media: string[]
}

export interface EpochNode {
  id: string
  title: string
  span?: HSpan
  spanNote?: string
  /** Für welche Regionen diese Periodisierung gilt */
  regions: string[]
  summary: string
  html: string
  parent?: string
  children: string[]
  /** Geplante, noch nicht verfasste Artikel (Redaktionsplan) */
  planned: string[]
  articles: string[]
  order: number
}

export interface ThemeNode {
  id: string
  title: string
  summary: string
  html: string
  parent?: string
  children: string[]
  articles: string[]
  icon?: string
  planned: string[]
}

export interface Region {
  id: string
  name: string
  parent?: string
  aliases: string[]
  /** Reihenfolge der Spuren in der Zeitleiste */
  lane?: string
}

export interface Person {
  id: string
  name: string
  aliases: string[]
  span?: HSpan
  roles: string[]
  summary: string
  regions: string[]
  themes: string[]
  articles: string[]
  places: string[]
  events: string[]
  related: string[]
  certainty?: Certainty
}

export interface Place {
  id: string
  name: string
  aliases: string[]
  /** [Längengrad, Breitengrad] (WGS84) */
  coords: [number, number]
  /** Genauigkeit der Lokalisierung */
  location: 'exakt' | 'ungefaehr' | 'umstritten'
  categories: ('stadt' | 'fundstaette' | 'schlachtfeld' | 'kulturzentrum' | 'hauptstadt' | 'heiligtum' | 'hafen' | 'region')[]
  span?: HSpan
  summary: string
  modernName?: string
  regions: string[]
  themes: string[]
  articles: string[]
  events: string[]
  persons: string[]
}

export interface HEvent {
  id: string
  title: string
  aliases: string[]
  span: HSpan
  certainty: Certainty
  dateNote?: string
  /** 1 = global bedeutsam (grobe Skala), 2 = wichtig, 3 = Detail */
  weight: 1 | 2 | 3
  kind: 'ereignis' | 'krieg' | 'gesetz' | 'schlacht' | 'gruendung' | 'vertrag' | 'revolution' | 'entdeckung' | 'herrschaft' | 'entwicklung' | 'katastrophe'
  summary: string
  regions: string[]
  themes: string[]
  places: string[]
  persons: string[]
  articles: string[]
  polities: string[]
}

export interface Polity {
  id: string
  name: string
  aliases: string[]
  span: HSpan
  spanNote?: string
  capital?: string
  summary: string
  regions: string[]
  themes: string[]
  articles: string[]
  predecessors: string[]
  successors: string[]
  weight: 1 | 2 | 3
}

export interface Culture {
  id: string
  name: string
  aliases: string[]
  span?: HSpan
  summary: string
  regions: string[]
  articles: string[]
  places: string[]
}

export interface Term {
  id: string
  name: string
  aliases: string[]
  definition: string
  articles: string[]
  themes: string[]
}

export interface Source {
  id: string
  /** primaer = historische Quelle; sekundaer = Forschungsliteratur; edition = Quellenedition/Übersetzung; institution = Museum/Archiv/Datenbank */
  kind: 'primaer' | 'sekundaer' | 'edition' | 'institution'
  authors: string[]
  editors: string[]
  title: string
  subtitle?: string
  /** Bei Aufsätzen: Zeitschrift oder Sammelband */
  container?: string
  volume?: string
  pages?: string
  year?: string
  place?: string
  publisher?: string
  edition?: string
  series?: string
  url?: string
  /** Entstehungszeit einer Primärquelle */
  written?: string
  note?: string
  articles: string[]
  /** Fertig formatierte Literaturangabe */
  formatted: string
}

export interface Route {
  id: string
  name: string
  aliases: string[]
  span: HSpan
  kind: 'handel' | 'feldzug' | 'migration' | 'pilger' | 'expedition'
  /** Wegpunkte [lon, lat] */
  path: [number, number][]
  schematic: boolean
  summary: string
  articles: string[]
  themes: string[]
  regions: string[]
}

export interface Territory {
  id: string
  polity: string
  name: string
  /** Stichjahr oder Zeitraum der Rekonstruktion */
  span: HSpan
  certainty: Certainty
  /** Ringe aus [lon, lat] (Polygon), stark vereinfacht */
  rings: [number, number][][]
  basis: string
  note: string
}

export interface Media {
  id: string
  title: string
  caption: string
  /** Bildpfad relativ zu /media */
  file: string
  width: number
  height: number
  author: string
  license: string
  licenseUrl?: string
  sourceUrl: string
  /** Rekonstruktion/Modell statt Originalbefund */
  reconstruction: boolean
  alt: string
}

export interface Entities {
  persons: Person[]
  places: Place[]
  events: HEvent[]
  polities: Polity[]
  cultures: Culture[]
  terms: Term[]
  sources: Source[]
  routes: Route[]
  territories: Territory[]
  media: Media[]
}

export interface Taxonomy {
  epochs: EpochNode[]
  themes: ThemeNode[]
  regions: Region[]
  /** Spuren der Zeitleiste in fester Reihenfolge */
  lanes: { id: string; name: string; regions: string[] }[]
}

export interface Manifest {
  version: string
  generated: string
  files: {
    catalog: string
    taxonomy: string
    entities: string
  }
  counts: Record<string, number>
}
