/**
 * Erzeugt die PNG-App-Icons aus den SVG-Vorlagen in public/icons (einmalig bzw. nach Designänderungen).
 *   node scripts/render-icons.ts
 * Verwendet Chromium über playwright-core (Pfad über CHROMIUM_PATH oder Standard /opt/pw-browsers).
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const dir = fileURLToPath(new URL('../public/icons/', import.meta.url))
const executablePath = process.env.CHROMIUM_PATH ?? findChromium()

function findChromium(): string | undefined {
  const candidate = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  return existsSync(candidate) ? candidate : undefined
}

const jobs = [
  { src: 'icon-source.svg', out: 'icon-192.png', size: 192 },
  { src: 'icon-source.svg', out: 'icon-512.png', size: 512 },
  { src: 'icon-source.svg', out: 'apple-touch-icon.png', size: 180 },
  { src: 'maskable-source.svg', out: 'maskable-512.png', size: 512 },
]

const browser = await chromium.launch({ executablePath })
const page = await browser.newPage()
for (const job of jobs) {
  const svg = readFileSync(join(dir, job.src), 'utf8')
  await page.setViewportSize({ width: job.size, height: job.size })
  await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${job.size}" height="${job.size}" `)}</body></html>`)
  await page.screenshot({ path: join(dir, job.out), clip: { x: 0, y: 0, width: job.size, height: job.size } })
  console.log(`✓ ${job.out}`)
}
await browser.close()
