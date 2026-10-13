/**
 * Prüft den gesamten Inhaltsbestand (Schema, Verweise, Belege) und die erzeugten Daten.
 * Läuft gegen die echten Dateien in content/ – ein fehlerhafter Inhalt lässt den Test scheitern.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { createEngine, runSearch, type Engine } from '../src/lib/searchEngine.ts'
import type { ArticleBody, ArticleMeta, Entities, Manifest } from '../src/shared/types.ts'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const read = <T>(url: string): T => JSON.parse(readFileSync(join(ROOT, 'public', url), 'utf8')) as T

let manifest: Manifest
let articles: ArticleMeta[]
let engine: Engine

beforeAll(() => {
  const result = spawnSync(process.execPath, ['scripts/build-content.ts'], { cwd: ROOT, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`Inhalts-Build fehlgeschlagen:\n${result.stderr}`)
  manifest = JSON.parse(readFileSync(join(ROOT, 'public/data/manifest.json'), 'utf8'))
  articles = read<{ articles: ArticleMeta[] }>(manifest.files.catalog).articles
  engine = createEngine(read(manifest.files.search))
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
    for (const r of ['italien', 'mesopotamien', 'aegypten', 'nubien', 'westafrika', 'china', 'suedasien', 'iran', 'deutschland', 'frankreich', 'mesoamerika', 'andenraum', 'britische-inseln', 'suedliches-afrika', 'ostafrika', 'suedostasien', 'japan']) {
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

describe('Suche', () => {
  const titles = (q: string) => runSearch(engine, q).hits.map((h) => h.ref)
  it('findet Schreibvarianten', () => {
    expect(titles('Cäsar')).toContain('caesar')
    expect(titles('Pompejus')).toContain('pompeius')
  })
  it('toleriert Tippfehler', () => {
    expect(titles('Hanibal')).toContain('hannibal')
  })
  it('nutzt Synonyme', () => {
    const out = runSearch(engine, 'Shoah')
    expect(out.hits.some((h) => h.ref === 'holocaust')).toBe(true)
  })
  it('sucht nach Jahren und Jahrhunderten', () => {
    expect(titles('216 v. Chr.')).toContain('schlacht-von-cannae')
    expect(titles('1789')).toContain('sturm-auf-die-bastille')
  })
  it('findet Volltext in Artikeln', () => {
    const out = runSearch(engine, 'Tagebuch des Merer')
    expect(out.hits.slice(0, 3).map((h) => h.ref)).toContain('altes-reich-aegypten')
  })
  it('findet Begriffe in anderer Sprache und Schreibweise', () => {
    expect(titles('Charlemagne')).toContain('karl-der-grosse')
    expect(titles('Tahuantinsuyo')).toContain('inka-reich')
    expect(titles('Harun al-Rashid')).toContain('harun-ar-raschid')
    expect(titles('Genghis Khan')).toContain('dschingis-khan')
    expect(titles('Montezuma')).toContain('moctezuma-ii')
    expect(titles('Great Zimbabwe')).toContain('gross-simbabwe-swahili')
    expect(titles('Kyoto')).toContain('heian-kyo')
  })
  it('findet Volltext in neuen Artikeln', () => {
    expect(titles('Spinning Jenny').slice(0, 3)).toContain('spinning-jenny')
    expect(titles('Algebra')).toContain('abbasiden-bagdad')
    expect(titles('Middle Passage')).toContain('transatlantischer-sklavenhandel')
    expect(titles('Konstantinopel 1453').slice(0, 5)).toContain('eroberung-konstantinopels')
    expect(titles('Angkor Wat')).toContain('angkor-wat')
  })
})
