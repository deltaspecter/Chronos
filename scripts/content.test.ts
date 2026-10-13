/**
 * Prüft den gesamten Inhaltsbestand (Schema, Verweise, Belege) und die erzeugten Daten.
 * Läuft gegen die echten Dateien in content/ – ein fehlerhafter Inhalt lässt den Test scheitern.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import type { ArticleBody, ArticleMeta, Entities, Manifest, Taxonomy } from '../src/shared/types.ts'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const read = <T>(url: string): T => JSON.parse(readFileSync(join(ROOT, 'public', url), 'utf8')) as T

let manifest: Manifest
let articles: ArticleMeta[]
let taxonomy: Taxonomy

beforeAll(() => {
  const result = spawnSync(process.execPath, ['scripts/build-content.ts'], { cwd: ROOT, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`Inhalts-Build fehlgeschlagen:\n${result.stderr}`)
  manifest = JSON.parse(readFileSync(join(ROOT, 'public/data/manifest.json'), 'utf8'))
  articles = read<{ articles: ArticleMeta[] }>(manifest.files.catalog).articles
  taxonomy = read<Taxonomy>(manifest.files.taxonomy)
}, 60_000)

describe('Inhaltsbestand', () => {
  it('enthält ausführliche, belegte Artikel', () => {
    expect(articles.length).toBeGreaterThanOrEqual(15)
    for (const a of articles) {
      expect(a.words, a.id).toBeGreaterThan(1000)
      const body = read<ArticleBody>(a.file)
      expect(body.bibliography.length, a.id).toBeGreaterThanOrEqual(5)
      expect(body.citations.length, a.id).toBeGreaterThan(3)
    }
  })
  it('schreibt jede Artikeldatei mit Hash', () => {
    for (const a of articles) {
      expect(a.file).toMatch(/^\/data\/a\/[a-z0-9-]+\.[0-9a-f]{10}\.json$/)
      expect(existsSync(join(ROOT, 'public', a.file))).toBe(true)
    }
  })
  it('deckt alle Weltregionen ab', () => {
    const regions = new Set(articles.flatMap((a) => a.regions))
    for (const r of ['italien', 'mesopotamien', 'aegypten', 'nubien', 'westafrika', 'china', 'suedasien', 'iran', 'deutschland', 'frankreich', 'mesoamerika', 'andenraum', 'britische-inseln', 'suedliches-afrika', 'ostafrika', 'suedostasien', 'japan', 'griechenland', 'russland', 'ozeanien']) {
      expect(regions.has(r), r).toBe(true)
    }
  })
  it('hat für alle Abbildungen Lizenzangaben', () => {
    const entities = read<Entities>(manifest.files.entities)
    for (const m of entities.media) {
      expect(m.license, m.id).toBeTruthy()
      expect(m.sourceUrl, m.id).toMatch(/^https:\/\/commons\.wikimedia\.org\//)
      expect(existsSync(join(ROOT, 'public/media', m.file)), m.id).toBe(true)
    }
  })
})

describe('Inhaltsverzeichnis', () => {
  // Die App hat keine Suche: Jeder Artikel muss über das Inhaltsverzeichnis (Epochenbaum) erreichbar sein
  it('führt jeden Artikel unter mindestens einer Epoche', () => {
    const listed = new Set(taxonomy.epochs.flatMap((e) => e.articles))
    for (const a of articles) expect(listed.has(a.id), a.id).toBe(true)
  })
  it('verbindet alle Epochen zu einem Baum ohne Waisen', () => {
    const ids = new Set(taxonomy.epochs.map((e) => e.id))
    for (const e of taxonomy.epochs) {
      if (e.parent) expect(ids.has(e.parent), e.id).toBe(true)
      for (const c of e.children) expect(ids.has(c), `${e.id} → ${c}`).toBe(true)
    }
    expect(taxonomy.epochs.some((e) => !e.parent)).toBe(true)
  })
  it('gibt allen Registereinträgen einen Titel', () => {
    const entities = read<Entities>(manifest.files.entities)
    const named = [...entities.persons, ...entities.places, ...entities.polities, ...entities.cultures, ...entities.terms, ...entities.routes] as { id: string; name: string }[]
    for (const e of named) expect(e.name?.trim(), e.id).toBeTruthy()
    for (const e of entities.events) expect(e.title?.trim(), e.id).toBeTruthy()
    for (const s of entities.sources) expect(s.title?.trim(), s.id).toBeTruthy()
  })
})

