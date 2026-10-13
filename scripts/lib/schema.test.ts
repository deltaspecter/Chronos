import { describe, expect, it } from 'vitest'
import { articleSchema, epochSchema, eventSchema } from './schema.ts'

const article = {
  id: 'test',
  title: 'Test',
  type: 'ereignis',
  summary: 'Eine ausreichend lange Zusammenfassung für den Test des Schemas.',
  epochs: ['antike-welten'],
  regions: ['welt'],
  status: 'erstfassung',
  version: 1,
  updated: '2026-10-13',
}

describe('Inhaltsschema', () => {
  it('übernimmt Jahreszahlen in Namenslisten als Text', () => {
    const parsed = articleSchema.parse({ ...article, aliases: ['Oktoberrevolution', 1917] })
    expect(parsed.aliases).toEqual(['Oktoberrevolution', '1917'])
  })
  it('übernimmt Datierungen als Zahl oder Text', () => {
    const parsed = eventSchema.parse({ id: 'e', title: 'E', date: -490, summary: 'Test' })
    expect(parsed.date).toBe('-490')
  })
  it('liest eine leere Liste als leere Liste', () => {
    const parsed = epochSchema.parse({ id: 'ep', title: 'Epoche', summary: 'Test', planned: null })
    expect(parsed.planned).toEqual([])
  })
  it('weist ungültige IDs zurück', () => {
    expect(() => articleSchema.parse({ ...article, id: 'Mit Leerzeichen' })).toThrow()
  })
})
