/**
 * Abgeleitete Nachschlage-Strukturen über den Kerndaten (einmal pro Sitzung berechnet).
 */
import { astro } from '@/shared/dates.ts'
import type { ArticleMeta, Culture, EpochNode, HEvent, Person, Place, Polity, Region, Route, Source, Term, ThemeNode } from '@/shared/types.ts'
import type { CoreData } from './load.ts'

export interface Indexed extends CoreData {
  articleById: Map<string, ArticleMeta>
  articleBySlug: Map<string, ArticleMeta>
  epochById: Map<string, EpochNode>
  themeById: Map<string, ThemeNode>
  regionById: Map<string, Region>
  personById: Map<string, Person>
  placeById: Map<string, Place>
  eventById: Map<string, HEvent>
  polityById: Map<string, Polity>
  cultureById: Map<string, Culture>
  termById: Map<string, Term>
  sourceById: Map<string, Source>
  routeById: Map<string, Route>
  /** Region → alle Unterregionen (inkl. sich selbst) */
  regionDescendants: Map<string, Set<string>>
  /** Region → alle Oberregionen (inkl. sich selbst) */
  regionAncestors: Map<string, string[]>
  rootEpochs: EpochNode[]
  rootThemes: ThemeNode[]
}

function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]))
}

export function buildIndex(core: CoreData): Indexed {
  const regionById = byId(core.taxonomy.regions)
  const regionDescendants = new Map<string, Set<string>>()
  const regionAncestors = new Map<string, string[]>()
  for (const region of core.taxonomy.regions) {
    const chain: string[] = []
    let cur: Region | undefined = region
    while (cur) {
      chain.push(cur.id)
      if (!regionDescendants.has(cur.id)) regionDescendants.set(cur.id, new Set())
      regionDescendants.get(cur.id)!.add(region.id)
      cur = cur.parent ? regionById.get(cur.parent) : undefined
    }
    regionAncestors.set(region.id, chain)
  }
  const articleBySlug = new Map<string, ArticleMeta>()
  const articleById = byId(core.articles)
  for (const [slug, id] of Object.entries(core.slugs)) {
    const meta = articleById.get(id)
    if (meta) articleBySlug.set(slug, meta)
  }
  const epochs = [...core.taxonomy.epochs].sort((a, b) => a.order - b.order)
  return {
    ...core,
    articleById,
    articleBySlug,
    epochById: byId(epochs),
    themeById: byId(core.taxonomy.themes),
    regionById,
    personById: byId(core.entities.persons),
    placeById: byId(core.entities.places),
    eventById: byId(core.entities.events),
    polityById: byId(core.entities.polities),
    cultureById: byId(core.entities.cultures),
    termById: byId(core.entities.terms),
    sourceById: byId(core.entities.sources),
    routeById: byId(core.entities.routes),
    regionDescendants,
    regionAncestors,
    rootEpochs: epochs.filter((e) => !e.parent),
    rootThemes: core.taxonomy.themes.filter((t) => !t.parent),
  }
}

/** Liegt eine der Regionen innerhalb des Filters (unter Berücksichtigung der Hierarchie)? */
export function matchesRegion(index: Indexed, regions: string[], filter: string | null): boolean {
  if (!filter) return true
  const scope = index.regionDescendants.get(filter)
  if (!scope) return false
  return regions.some((r) => scope.has(r))
}

/** Pfad vom Wurzelknoten bis zur Epoche */
export function epochPath(index: Indexed, id: string): EpochNode[] {
  const path: EpochNode[] = []
  let cur = index.epochById.get(id)
  while (cur) {
    path.unshift(cur)
    cur = cur.parent ? index.epochById.get(cur.parent) : undefined
  }
  return path
}

export function themePath(index: Indexed, id: string): ThemeNode[] {
  const path: ThemeNode[] = []
  let cur = index.themeById.get(id)
  while (cur) {
    path.unshift(cur)
    cur = cur.parent ? index.themeById.get(cur.parent) : undefined
  }
  return path
}

/** Alle Artikel einer Epoche einschließlich ihrer Unterepochen */
export function articlesInEpoch(index: Indexed, id: string): ArticleMeta[] {
  const ids = new Set<string>()
  const visit = (eid: string) => {
    const node = index.epochById.get(eid)
    if (!node) return
    node.articles.forEach((a) => ids.add(a))
    node.children.forEach(visit)
  }
  visit(id)
  return [...ids].map((a) => index.articleById.get(a)!).filter(Boolean)
}

export function articlesInTheme(index: Indexed, id: string): ArticleMeta[] {
  const ids = new Set<string>()
  const visit = (tid: string) => {
    const node = index.themeById.get(tid)
    if (!node) return
    node.articles.forEach((a) => ids.add(a))
    node.children.forEach(visit)
  }
  visit(id)
  return [...ids].map((a) => index.articleById.get(a)!).filter(Boolean)
}

/** Sortierschlüssel (astronomisches Startjahr) für chronologische Listen */
export function startYear(span?: { start: { year: number } }): number {
  return span ? astro(span.start as never) : Number.POSITIVE_INFINITY
}
