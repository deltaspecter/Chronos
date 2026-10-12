/**
 * Prüft alle externen URLs in den Quellenangaben (content/sources) auf Erreichbarkeit.
 *   node scripts/check-links.ts
 * Meldet nicht erreichbare Adressen, damit tote Links früh auffallen.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'

const DIR = fileURLToPath(new URL('../content/sources/', import.meta.url))
const urls: { id: string; url: string }[] = []
for (const f of readdirSync(DIR).filter((n) => n.endsWith('.yaml'))) {
  for (const s of YAML.parse(readFileSync(join(DIR, f), 'utf8')) ?? []) if (s.url) urls.push({ id: s.id, url: s.url })
}

let bad = 0
for (const { id, url } of urls) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (CHRONOS link check)' }, signal: AbortSignal.timeout(15000) })
    const ok = res.status < 400 || res.status === 403
    console.log(`${ok ? '✓' : '✖'} ${res.status} ${id} ${url}${res.status === 403 ? ' (Zugriff für Skripte gesperrt – manuell prüfen)' : ''}`)
    if (!ok) bad++
  } catch (error) {
    console.log(`✖ --- ${id} ${url} (${(error as Error).message})`)
    bad++
  }
}
console.log(bad ? `\n${bad} Adressen nicht erreichbar` : '\n✓ Alle Adressen erreichbar')
process.exit(bad ? 1 : 0)
