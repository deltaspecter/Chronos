/**
 * Liefert den Produktions-Build (dist/) lokal aus – mit denselben Headern wie in der Produktion
 * (aus public/_headers) und Single-Page-Fallback. So lassen sich Content-Security-Policy,
 * Cache-Header und Service Worker vor der Veröffentlichung prüfen.
 *
 *   npm run build && node scripts/serve-dist.ts [--port 4173]
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../dist/', import.meta.url))
const portIdx = process.argv.indexOf('--port')
const PORT = portIdx > 0 ? Number(process.argv[portIdx + 1]) : 4173

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
}

/** Einfache Auswertung des _headers-Formats (Pfadmuster mit * am Ende) */
function parseHeaders(): { pattern: string; headers: [string, string][] }[] {
  const file = join(ROOT, '_headers')
  if (!existsSync(file)) return []
  const rules: { pattern: string; headers: [string, string][] }[] = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (!line.startsWith(' ')) rules.push({ pattern: line.trim(), headers: [] })
    else {
      const i = line.indexOf(':')
      rules[rules.length - 1]?.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()])
    }
  }
  return rules
}
const RULES = parseHeaders()
const matches = (pattern: string, path: string) => (pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : path === pattern)

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  let path = decodeURIComponent(url.pathname)
  let file = normalize(join(ROOT, path))
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end()
    return
  }
  if (!existsSync(file) || statSync(file).isDirectory()) {
    // Fehlende Daten- und Asset-Dateien sind echte 404, alles andere ist eine App-Route
    if (path.startsWith('/assets/') || path.startsWith('/data/') || path.startsWith('/media/')) {
      res.writeHead(404).end('Not found')
      return
    }
    path = '/index.html'
    file = join(ROOT, 'index.html')
  }
  for (const rule of RULES) if (matches(rule.pattern, path)) for (const [k, v] of rule.headers) res.setHeader(k, v)
  res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream')
  createReadStream(file).pipe(res)
}).listen(PORT, () => console.log(`CHRONOS läuft auf http://localhost:${PORT}`))
