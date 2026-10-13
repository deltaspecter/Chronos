/** Einheitlicher Zugriff auf alle Eintragsarten des Wissensnetzes */
import type { Indexed } from '@/data/index.ts'
import type { HSpan } from '@/shared/dates.ts'
import { entityHref } from '@/shared/routes.ts'
import type { EntityKind } from '@/shared/types.ts'

export interface EntityInfo {
  kind: EntityKind
  id: string
  title: string
  summary: string
  href: string
  span?: HSpan
  regions: string[]
}

export function entityInfo(index: Indexed, kind: EntityKind, id: string): EntityInfo | null {
  switch (kind) {
    case 'article': {
      const a = index.articleById.get(id) ?? index.articleBySlug.get(id)
      return a ? { kind, id: a.id, title: a.title, summary: a.summary, href: entityHref('article', a.slug), span: a.span, regions: a.regions } : null
    }
    case 'epoch': {
      const e = index.epochById.get(id)
      return e ? { kind, id, title: e.title, summary: e.summary, href: entityHref(kind, id), span: e.span, regions: e.regions } : null
    }
    case 'theme': {
      const t = index.themeById.get(id)
      return t ? { kind, id, title: t.title, summary: t.summary, href: entityHref(kind, id), regions: [] } : null
    }
    case 'person': {
      const p = index.personById.get(id)
      return p ? { kind, id, title: p.name, summary: p.summary, href: entityHref(kind, id), span: p.span, regions: p.regions } : null
    }
    case 'place': {
      const p = index.placeById.get(id)
      return p ? { kind, id, title: p.name, summary: p.summary, href: entityHref(kind, id), span: p.span, regions: p.regions } : null
    }
    case 'event': {
      const e = index.eventById.get(id)
      return e ? { kind, id, title: e.title, summary: e.summary, href: entityHref(kind, id), span: e.span, regions: e.regions } : null
    }
    case 'polity': {
      const p = index.polityById.get(id)
      return p ? { kind, id, title: p.name, summary: p.summary, href: entityHref(kind, id), span: p.span, regions: p.regions } : null
    }
    case 'culture': {
      const c = index.cultureById.get(id)
      return c ? { kind, id, title: c.name, summary: c.summary, href: entityHref(kind, id), span: c.span, regions: c.regions } : null
    }
    case 'term': {
      const t = index.termById.get(id)
      return t ? { kind, id, title: t.name, summary: t.definition, href: entityHref(kind, id), regions: [] } : null
    }
    case 'source': {
      const s = index.sourceById.get(id)
      return s ? { kind, id, title: s.title, summary: s.formatted, href: entityHref(kind, id), regions: [] } : null
    }
    case 'route': {
      const r = index.routeById.get(id)
      return r ? { kind, id, title: r.name, summary: r.summary, href: entityHref(kind, id), span: r.span, regions: r.regions } : null
    }
    case 'region': {
      const r = index.regionById.get(id)
      return r ? { kind, id, title: r.name, summary: '', href: `/inhalt?region=${id}`, regions: [id] } : null
    }
  }
}

export function regionName(index: Indexed, id: string): string {
  return index.regionById.get(id)?.name ?? id
}
