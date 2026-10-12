/**
 * Lädt Abbildungen aus Wikimedia Commons – nur mit geprüfter, freier Lizenz.
 *
 *   node scripts/fetch-media.ts            fehlende Bilder laden
 *   node scripts/fetch-media.ts --refresh  alle Bilder neu prüfen und laden
 *
 * Ablauf je Eintrag in content/media/*.yaml:
 *  1. Metadaten über die Commons-API abrufen (Urheber, Lizenz, Lizenz-URL)
 *  2. Lizenz gegen eine Positivliste prüfen (gemeinfrei, CC0, CC BY, CC BY-SA) – sonst Abbruch für dieses Bild
 *  3. Eine verkleinerte Fassung (max. 1280 px breit) nach public/media/ laden
 *  4. Ergebnis in content/media/_commons.lock.json festhalten (wird versioniert)
 *
 * Der Inhalts-Build verweigert Abbildungen ohne Eintrag in der Lock-Datei.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const MEDIA_DIR = join(ROOT, 'content', 'media')
const OUT_DIR = join(ROOT, 'public', 'media')
const LOCK = join(MEDIA_DIR, '_commons.lock.json')
const WIDTH = 1280
const UA = 'ChronosEncyclopedia/0.1 (Bildlizenzprüfung; https://github.com/deltaspecter/Chronos)'
const REFRESH = process.argv.includes('--refresh')

const ALLOWED = [/^public domain/i, /^pd/i, /^cc0/i, /^cc by(-sa)? \d/i, /^cc-by(-sa)?-\d/i, /^attribution$/i]

interface Entry {
  id: string
  commons: string
}
type Lock = Record<string, { file: string; width: number; height: number; author: string; license: string; licenseUrl?: string; sourceUrl: string }>

const entries: Entry[] = []
for (const name of readdirSync(MEDIA_DIR).filter((n) => n.endsWith('.yaml'))) {
  entries.push(...(YAML.parse(readFileSync(join(MEDIA_DIR, name), 'utf8')) ?? []))
}
const lock: Lock = existsSync(LOCK) ? JSON.parse(readFileSync(LOCK, 'utf8')) : {}
mkdirSync(OUT_DIR, { recursive: true })

const strip = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

function cleanAuthor(author: string): string {
  let a = author.replace(/^(.+?)\1$/, '$1')
  a = a.replace(/Unknown (author|artist|photographer)/g, 'Urheber unbekannt').replace('attributed to', 'zugeschrieben:').replace('the Elder', 'd. Ä.')
  return a.length > 140 ? `${a.slice(0, 137)}…` : a
}

let failed = 0
for (const entry of entries) {
  if (lock[entry.id] && !REFRESH) continue
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=${WIDTH}&titles=${encodeURIComponent(entry.commons)}`
  const res = await fetch(api, { headers: { 'User-Agent': UA } })
  if (!res.ok) {
    console.error(`✖ ${entry.id}: API-Fehler ${res.status}`)
    failed++
    continue
  }
  const data = (await res.json()) as { query: { pages: Record<string, { missing?: string; imageinfo?: { thumburl: string; thumbwidth: number; thumbheight: number; descriptionurl: string; mime: string; extmetadata: Record<string, { value: string }> }[] }> } }
  const page = Object.values(data.query.pages)[0]
  if (!page || page.missing !== undefined || !page.imageinfo) {
    console.error(`✖ ${entry.id}: ${entry.commons} nicht gefunden`)
    failed++
    continue
  }
  const info = page.imageinfo[0]
  const meta = info.extmetadata
  const license = strip(meta.LicenseShortName?.value ?? '')
  if (!ALLOWED.some((re) => re.test(license))) {
    console.error(`✖ ${entry.id}: Lizenz „${license}“ nicht auf der Positivliste – Bild wird nicht verwendet`)
    failed++
    continue
  }
  const author = strip(meta.Artist?.value ?? '') || 'unbekannt'
  const ext = info.mime === 'image/png' ? 'png' : 'jpg'
  const file = `${entry.id}.${ext}`
  const img = await fetch(info.thumburl, { headers: { 'User-Agent': UA } })
  if (!img.ok) {
    console.error(`✖ ${entry.id}: Download fehlgeschlagen (${img.status})`)
    failed++
    continue
  }
  writeFileSync(join(OUT_DIR, file), Buffer.from(await img.arrayBuffer()))
  // Optional mit ImageMagick verkleinern und komprimieren (schnelleres Laden auf Mobilgeräten)
  let width = info.thumbwidth
  let height = info.thumbheight
  try {
    const path = join(OUT_DIR, file)
    execFileSync('convert', [path, '-resize', '1200x1200>', '-strip', '-interlace', 'Plane', '-quality', '78', path])
    ;[width, height] = execFileSync('identify', ['-format', '%w %h', path]).toString().split(' ').map(Number)
  } catch {
    /* ImageMagick nicht installiert – Originalgröße von Commons verwenden */
  }
  lock[entry.id] = {
    file,
    width,
    height,
    author: cleanAuthor(author),
    license,
    licenseUrl: meta.LicenseUrl?.value,
    sourceUrl: info.descriptionurl,
  }
  console.log(`✓ ${entry.id}: ${license} – ${lock[entry.id].author}`)
  await new Promise((r) => setTimeout(r, 2500))
}

writeFileSync(LOCK, JSON.stringify(lock, null, 2) + '\n')
console.log(failed ? `\n${failed} Bilder konnten nicht übernommen werden.` : '\n✓ Alle Bilder geprüft.')
