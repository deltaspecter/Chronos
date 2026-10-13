/**
 * Validierungsschemata für alle redaktionellen Inhalte in content/.
 * Ein Fehler hier bricht den Build ab – lieber kein Inhalt als ein fehlerhafter.
 */
import { z } from 'zod'

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'IDs bestehen aus Kleinbuchstaben, Ziffern und Bindestrichen')
const date = z.union([z.string(), z.number()]).transform(String)
const ids = z.array(id).default([])
// Zahlen wie „1917“ oder „1453“ in Namenslisten werden als Text übernommen (YAML liest sie sonst als Zahl);
// ein leerer Schlüssel („planned:“ ohne Einträge) liest YAML als null – das gilt als leere Liste
const strings = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.array(z.union([z.string(), z.number()]).transform(String)).default([]),
)
const certainty = z.enum(['gesichert', 'wahrscheinlich', 'umstritten', 'unsicher'])

export const regionSchema = z.object({
  id,
  name: z.string(),
  parent: id.optional(),
  aliases: strings,
})

export const laneSchema = z.object({ id, name: z.string(), regions: z.array(id).min(1) })

export const epochSchema = z.object({
  id,
  title: z.string(),
  start: date.optional(),
  end: date.optional(),
  spanNote: z.string().optional(),
  regions: ids,
  parent: id.optional(),
  order: z.number().default(0),
  summary: z.string(),
  body: z.string().default(''),
  planned: strings,
})

export const themeSchema = z.object({
  id,
  title: z.string(),
  parent: id.optional(),
  icon: z.string().optional(),
  summary: z.string(),
  body: z.string().default(''),
  planned: strings,
})

export const seriesSchema = z.object({ id, title: z.string() })

export const personSchema = z.object({
  id,
  name: z.string(),
  aliases: strings,
  born: date.optional(),
  died: date.optional(),
  roles: strings,
  summary: z.string(),
  regions: ids,
  themes: ids,
  places: ids,
  related: ids,
  certainty: certainty.optional(),
})

export const placeSchema = z.object({
  id,
  name: z.string(),
  aliases: strings,
  coords: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  location: z.enum(['exakt', 'ungefaehr', 'umstritten']).default('exakt'),
  categories: z.array(z.enum(['stadt', 'fundstaette', 'schlachtfeld', 'kulturzentrum', 'hauptstadt', 'heiligtum', 'hafen', 'region'])).min(1),
  start: date.optional(),
  end: date.optional(),
  modernName: z.string().optional(),
  summary: z.string(),
  regions: ids,
  themes: ids,
})

export const eventSchema = z.object({
  id,
  title: z.string(),
  aliases: strings,
  date: date.optional(),
  start: date.optional(),
  end: date.optional(),
  certainty: certainty.default('gesichert'),
  dateNote: z.string().optional(),
  weight: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  kind: z
    .enum(['ereignis', 'krieg', 'schlacht', 'gruendung', 'vertrag', 'revolution', 'entdeckung', 'herrschaft', 'entwicklung', 'katastrophe', 'gesetz'])
    .default('ereignis'),
  summary: z.string(),
  regions: ids,
  themes: ids,
  places: ids,
  persons: ids,
  polities: ids,
})

export const politySchema = z.object({
  id,
  name: z.string(),
  aliases: strings,
  start: date,
  end: date.optional(),
  spanNote: z.string().optional(),
  capital: id.optional(),
  summary: z.string(),
  regions: ids,
  themes: ids,
  predecessors: ids,
  successors: ids,
  weight: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
})

export const cultureSchema = z.object({
  id,
  name: z.string(),
  aliases: strings,
  start: date.optional(),
  end: date.optional(),
  summary: z.string(),
  regions: ids,
  places: ids,
})

export const termSchema = z.object({
  id,
  name: z.string(),
  aliases: strings,
  definition: z.string(),
  themes: ids,
})

export const sourceSchema = z.object({
  id,
  kind: z.enum(['primaer', 'sekundaer', 'edition', 'institution']),
  authors: strings,
  editors: strings,
  title: z.string(),
  subtitle: z.string().optional(),
  container: z.string().optional(),
  volume: z.union([z.string(), z.number()]).transform(String).optional(),
  pages: z.string().optional(),
  year: z.union([z.string(), z.number()]).transform(String).optional(),
  place: z.string().optional(),
  publisher: z.string().optional(),
  edition: z.string().optional(),
  series: z.string().optional(),
  url: z.string().url().optional(),
  written: z.union([z.string(), z.number()]).transform(String).optional(),
  note: z.string().optional(),
})

export const routeSchema = z.object({
  id,
  name: z.string(),
  aliases: strings,
  start: date,
  end: date.optional(),
  kind: z.enum(['handel', 'feldzug', 'migration', 'pilger', 'expedition']),
  path: z.array(z.tuple([z.number(), z.number()])).min(2),
  schematic: z.boolean().default(true),
  summary: z.string(),
  themes: ids,
  regions: ids,
})

export const territorySchema = z.object({
  id,
  polity: id,
  name: z.string(),
  start: date,
  end: date.optional(),
  certainty,
  rings: z.array(z.array(z.tuple([z.number(), z.number()])).min(4)).min(1),
  basis: z.string(),
  note: z.string(),
})

export const mediaSchema = z.object({
  id,
  commons: z.string().startsWith('File:'),
  title: z.string(),
  caption: z.string(),
  alt: z.string(),
  author: z.string().optional(),
  reconstruction: z.boolean().default(false),
})

export const synonymSchema = z.object({ terms: z.array(z.string()).min(2) })

export const articleSchema = z.object({
  id,
  slug: id.optional(),
  formerSlugs: ids,
  title: z.string(),
  subtitle: z.string().optional(),
  type: z.enum(['ueberblick', 'ereignis', 'person', 'epoche', 'thema', 'ort', 'staat', 'kultur']),
  summary: z.string().min(40, 'Die Zusammenfassung soll mindestens einen vollständigen Satz umfassen'),
  start: date.optional(),
  end: date.optional(),
  spanNote: z.string().optional(),
  epochs: z.array(id).min(1),
  themes: ids,
  regions: z.array(id).min(1),
  aliases: strings,
  persons: ids,
  places: ids,
  events: ids,
  polities: ids,
  cultures: ids,
  terms: ids,
  related: ids,
  bibliography: ids,
  image: id.optional(),
  series: id.optional(),
  seriesOrder: z.number().optional(),
  status: z.enum(['entwurf', 'erstfassung', 'geprueft', 'begutachtet']),
  version: z.number().int().positive(),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  history: z.array(z.object({ version: z.number(), date: z.string(), note: z.string() })).default([]),
})

export type ArticleFront = z.infer<typeof articleSchema>
