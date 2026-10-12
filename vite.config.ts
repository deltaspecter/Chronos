/// <reference types="vitest/config" />
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

/**
 * Schreibt nach dem Build dist/sw.js: die Vorlage sw/service-worker.js mit
 *  – VERSION: Hash über alle ausgelieferten Dateien (jede Änderung → neuer Service Worker)
 *  – PRECACHE: App-Hülle + Kerndaten (Katalog, Taxonomie, Wissensnetz, Suchindex, Karte, Schriften)
 * Artikeltexte (/data/a/*) und Bilder (/media/*) werden bewusst NICHT vorab geladen:
 * Sie landen nur im Speicher, wenn sie gelesen oder ausdrücklich offline gespeichert werden.
 */
function serviceWorkerPlugin(): Plugin {
  let outDir = 'dist'
  return {
    name: 'chronos-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const files: string[] = []
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const path = join(dir, name)
          if (statSync(path).isDirectory()) walk(path)
          else files.push(path)
        }
      }
      walk(outDir)
      const hash = createHash('sha256')
      const precache: string[] = []
      for (const file of files.sort()) {
        const url = '/' + relative(outDir, file).split(sep).join('/')
        if (url === '/sw.js') continue
        hash.update(url).update(readFileSync(file))
        if (url.startsWith('/data/a/') || url.startsWith('/media/')) continue
        if (url === '/data/manifest.json') continue
        if (url.endsWith('.woff') || url.endsWith('.map') || url === '/_redirects' || url === '/_headers') continue
        // Schriften nur für lateinische Schrift vorab speichern (andere Zeichensätze lädt der Browser bei Bedarf)
        if (url.endsWith('.woff2') && /(cyrillic|greek|vietnamese)/.test(url)) continue
        if (url.startsWith('/icons/') && url.endsWith('.svg') && url !== '/icons/favicon.svg') continue
        precache.push(url)
      }
      const template = readFileSync(fileURLToPath(new URL('./sw/service-worker.js', import.meta.url)), 'utf8')
      const sw = template.replaceAll('__VERSION__', hash.digest('hex').slice(0, 12)).replaceAll('__PRECACHE__', JSON.stringify(precache))
      writeFileSync(join(outDir, 'sw.js'), sw)
      console.log(`[chronos] sw.js geschrieben (${precache.length} Dateien vorab gespeichert)`)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorkerPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
