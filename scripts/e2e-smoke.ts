/**
 * Rauchtest der gebauten App im echten Browser (Chromium über playwright-core).
 *   npm run build && node scripts/e2e-smoke.ts [--shots <ordner>]
 *
 * Prüft für alle Hauptbereiche: Seite lädt, Überschrift vorhanden, keine Konsolenfehler.
 * Zusätzlich: Suche liefert Treffer, Artikel zeigt Belege, Lesezeichen bleibt nach Neuladen erhalten,
 * Service Worker wird registriert und die App funktioniert danach offline.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { chromium, type Page } from 'playwright-core'

const PORT = 4173
const BASE = `http://localhost:${PORT}`
const shotsIdx = process.argv.indexOf('--shots')
const SHOTS = shotsIdx > 0 ? process.argv[shotsIdx + 1] : null
if (SHOTS && !existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true })
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined)

const server = spawn(process.execPath, ['scripts/serve-dist.ts', '--port', String(PORT)], { stdio: 'pipe' })
await new Promise<void>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Vorschau-Server startet nicht')), 15000)
  server.stdout.on('data', (d) => {
    if (String(d).includes(String(PORT))) {
      clearTimeout(timer)
      resolve()
    }
  })
})

let failures = 0
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? '✓' : '✖'} ${label}`)
  if (!ok) failures++
}

const browser = await chromium.launch({ executablePath })
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'allow' })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))
  // Verstöße gegen die Content-Security-Policy erscheinen als Konsolenfehler und lassen den Test scheitern
  page.on('pageerror', (err) => errors.push(String(err)))

  const visit = async (path: string, name: string, p: Page = page) => {
    errors.length = 0
    await p.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    const h1 = await p.locator('h1').first().textContent({ timeout: 5000 }).catch(() => null)
    check(!!h1 && errors.length === 0, `${name} (${path}) – „${h1?.trim().slice(0, 50)}“${errors.length ? ` – Fehler: ${errors.join(' | ')}` : ''}`)
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false })
  }

  await visit('/', 'start')
  await visit('/epochen', 'epochen')
  await visit('/epochen/roemische-geschichte', 'epoche')
  await visit('/themen', 'themen')
  await visit('/themen/politik', 'thema')
  await visit('/artikel/roemische-republik', 'artikel')
  check((await page.locator('section[aria-labelledby="belege"] li').count()) > 3, 'Artikel hat Belege')
  check((await page.locator('.prose a.xref').count()) > 5, 'Artikel hat Querverweise')
  await visit('/artikel/punische-kriege#die-gegner', 'artikel-anker')
  await visit('/person/caesar', 'person')
  await visit('/ort/karthago', 'ort')
  await visit('/ereignis/schlacht-von-cannae', 'ereignis')
  await visit('/quelle/q-polybios', 'quelle')
  await visit('/verzeichnis/ereignisse', 'verzeichnis')
  await visit('/zeitleiste', 'zeitleiste')
  check((await page.locator('.tl-item').count()) > 10, 'Zeitleiste zeigt Einträge')
  await visit('/atlas', 'atlas')
  check((await page.locator('.atlas-place').count()) > 5, 'Atlas zeigt Orte')
  await visit('/suche?q=C%C3%A4sar', 'suche')
  check((await page.locator('main ol li').count()) > 0, 'Suche „Cäsar“ findet Treffer')
  await visit('/suche?q=216%20v.%20Chr.', 'suche-jahr')
  check((await page.getByText('Schlacht von Cannae').count()) > 0, 'Jahressuche „216 v. Chr.“ findet Cannae')
  await visit('/lesezeichen', 'lesezeichen')
  await visit('/einstellungen', 'einstellungen')
  await visit('/info', 'info')
  await visit('/gibt-es-nicht', 'nicht-gefunden')
  await visit('/artikel/qin-und-han', 'artikel-bild')
  check((await page.locator('figure img').count()) > 0, 'Artikel zeigt Abbildung mit Bildnachweis')
  await visit('/atlas?staat=roemisches-kaiserreich', 'atlas-reich')
  await visit('/route/seidenstrasse', 'route')
  const res = await page.request.get(`${BASE}/sw.js`)
  check(res.headers()['cache-control'] === 'no-cache', 'sw.js wird nicht gecacht (Cache-Control: no-cache)')
  const html = await page.request.get(`${BASE}/`)
  check((html.headers()['content-security-policy'] ?? '').includes("script-src 'self'"), 'Content-Security-Policy ist gesetzt')

  // Lesezeichen setzen und nach Neuladen prüfen
  await page.goto(`${BASE}/artikel/julius-caesar`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Lesezeichen setzen' }).click()
  await page.goto(`${BASE}/lesezeichen`, { waitUntil: 'networkidle' })
  check((await page.getByText('Gaius Iulius Caesar').count()) > 0, 'Lesezeichen bleibt gespeichert')

  // Mobile Ansicht
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const mp = await mobile.newPage()
  mp.on('pageerror', (err) => errors.push(String(err)))
  await visit('/', 'mobil-start', mp)
  await visit('/artikel/augustus', 'mobil-artikel', mp)
  await visit('/zeitleiste', 'mobil-zeitleiste', mp)
  await visit('/atlas', 'mobil-atlas', mp)
  check((await mp.locator('.bottom-nav').isVisible()) === true, 'Mobile Navigation sichtbar')
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  check(overflow <= 1, `Kein horizontales Überlaufen auf dem Smartphone (${overflow}px)`)

  // Service Worker und Offline
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  const swReady = await page.evaluate(async () => {
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 8000))])
    return !!reg
  })
  check(swReady, 'Service Worker aktiv')
  if (swReady) {
    await page.reload({ waitUntil: 'networkidle' })
    await page.goto(`${BASE}/artikel/punische-kriege`, { waitUntil: 'networkidle' })
    await context.setOffline(true)
    await page.goto(`${BASE}/epochen`, { waitUntil: 'domcontentloaded' })
    check((await page.locator('h1').first().textContent()) === 'Zeiträume der Menschheitsgeschichte', 'Offline: Epochenseite lädt')
    await page.goto(`${BASE}/artikel/punische-kriege`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.prose', { timeout: 5000 }).catch(() => {})
    check((await page.locator('.article-body').count()) > 0, 'Offline: zuletzt gelesener Artikel lesbar')
    await page.goto(`${BASE}/artikel/reformation`, { waitUntil: 'domcontentloaded' }).catch(() => {})
    await context.setOffline(false)
  }
} finally {
  await browser.close()
  server.kill()
}

console.log(failures ? `\n✖ ${failures} Prüfungen fehlgeschlagen` : '\n✓ Alle Prüfungen bestanden')
process.exit(failures ? 1 : 0)
