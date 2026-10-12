/** URL-Schema – stabil halten! Geänderte Pfade brechen Lesezeichen und Verweise. */
import type { EntityKind } from './types.ts'

export const ENTITY_PATH: Record<EntityKind, string> = {
  article: 'artikel',
  epoch: 'epochen',
  theme: 'themen',
  person: 'person',
  place: 'ort',
  event: 'ereignis',
  polity: 'staat',
  culture: 'kultur',
  term: 'begriff',
  source: 'quelle',
  region: 'region',
  route: 'route',
}

export const KIND_LABEL: Record<EntityKind, string> = {
  article: 'Artikel',
  epoch: 'Epoche',
  theme: 'Thema',
  person: 'Person',
  place: 'Ort',
  event: 'Ereignis',
  polity: 'Staat / Reich',
  culture: 'Kultur',
  term: 'Begriff',
  source: 'Quelle / Literatur',
  region: 'Region',
  route: 'Route',
}

export const KIND_LABEL_PLURAL: Record<EntityKind, string> = {
  article: 'Artikel',
  epoch: 'Epochen',
  theme: 'Themen',
  person: 'Persönlichkeiten',
  place: 'Orte',
  event: 'Ereignisse',
  polity: 'Staaten und Reiche',
  culture: 'Kulturen',
  term: 'Begriffe',
  source: 'Quellen und Literatur',
  region: 'Regionen',
  route: 'Routen',
}

/** Artikel werden über den Slug adressiert, alle anderen Einträge über ihre ID */
export function entityHref(kind: EntityKind, idOrSlug: string): string {
  return `/${ENTITY_PATH[kind]}/${idOrSlug}`
}
