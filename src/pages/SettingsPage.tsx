import { Download, HardDrive, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { TextSettingsControls } from '@/components/TextSettings.tsx'
import { PageContainer } from '@/components/ui.tsx'
import { manifest } from '@/data/load.ts'
import { useTitle } from '@/lib/useTitle.ts'
import { formatBytes, requestPersistence, storageEstimate } from '@/offline/offline.ts'
import { useLibrary } from '@/store/library.ts'
import { useSettings } from '@/store/settings.ts'

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer py-2">
      <input type="checkbox" className="mt-1 w-5 h-5 accent-[var(--gold)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs muted mt-0.5">{hint}</span>}
      </span>
    </label>
  )
}

export function SettingsPage() {
  useTitle('Einstellungen')
  const s = useSettings()
  const library = useLibrary()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [estimate, setEstimate] = useState<Awaited<ReturnType<typeof storageEstimate>>>(null)

  useEffect(() => {
    storageEstimate().then(setEstimate)
  }, [])

  const exportData = () => {
    const data = {
      format: 'chronos-library',
      version: 1,
      exported: new Date().toISOString(),
      bookmarks: library.bookmarks,
      notes: library.notes,
      history: library.history,
      positions: library.positions,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chronos-bibliothek-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text())
      if (data.format !== 'chronos-library') throw new Error('Keine CHRONOS-Sicherungsdatei.')
      library.importData(data)
      setMessage(`Importiert: ${data.bookmarks?.length ?? 0} Lesezeichen, ${data.notes?.length ?? 0} Notizen.`)
    } catch (e) {
      setMessage(`Import fehlgeschlagen: ${(e as Error).message}`)
    }
  }

  return (
    <PageContainer className="pt-8 lg:pt-12 max-w-3xl">
      <p className="eyebrow mb-3">Einstellungen</p>
      <h1 className="page-title">Lesen nach Ihren Wünschen</h1>

      <section className="card p-5 sm:p-6 mt-8" aria-labelledby="s-text">
        <h2 id="s-text" className="font-display text-2xl mb-5">
          Text und Darstellung
        </h2>
        <TextSettingsControls />
        <div className="prose prose-compact mt-6 p-4 rounded-lg bg-[var(--bg-sunken)]" aria-label="Vorschau">
          <p>
            Die Römer selbst nannten ihr Gemeinwesen <em>res publica</em> – „die öffentliche Sache“ – und verstanden darunter weniger eine Staatsform im modernen Sinn als die gemeinsamen
            Angelegenheiten der Bürgerschaft.
          </p>
        </div>
      </section>

      <section className="card p-5 sm:p-6 mt-4" aria-labelledby="s-lesen">
        <h2 id="s-lesen" className="font-display text-2xl mb-3">
          Lesen
        </h2>
        <Toggle label="Weiterlesen anbieten" hint="Beim erneuten Öffnen eines Artikels die letzte Leseposition vorschlagen." checked={s.resumeReading} onChange={(v) => s.set({ resumeReading: v })} />
        <Toggle label="Lesefortschritt anzeigen" hint="Dünner Balken am oberen Bildschirmrand in Artikeln." checked={s.showProgress} onChange={(v) => s.set({ showProgress: v })} />
        <Toggle label="Bewegungen reduzieren" hint="Animationen und weiches Scrollen abschalten." checked={s.reduceMotion} onChange={(v) => s.set({ reduceMotion: v })} />
        <button className="btn btn-ghost text-sm mt-2" onClick={s.reset}>
          Auf Standard zurücksetzen
        </button>
      </section>

      <section className="card p-5 sm:p-6 mt-4" aria-labelledby="s-daten">
        <h2 id="s-daten" className="font-display text-2xl mb-2">
          Meine Daten
        </h2>
        <p className="text-sm soft mb-4">
          {library.bookmarks.length} Lesezeichen · {library.notes.length} Notizen · {library.history.length} Einträge im Verlauf · {Object.keys(library.offline).length} Artikel offline. Alles bleibt
          auf diesem Gerät. Zum Übertragen auf ein anderes Gerät exportieren Sie eine Sicherungsdatei und importieren sie dort.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={exportData}>
            <Download size={16} aria-hidden /> Exportieren
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Upload size={16} aria-hidden /> Importieren
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          <button
            className="btn btn-ghost text-[var(--danger)]"
            onClick={() => {
              if (confirm('Alle Lesezeichen, Notizen, den Verlauf und die Lesestände auf diesem Gerät löschen?')) {
                library.clearAll()
                setMessage('Persönliche Daten gelöscht.')
              }
            }}
          >
            <Trash2 size={16} aria-hidden /> Alles löschen
          </button>
        </div>
        {message && (
          <p className="text-sm mt-3" role="status">
            {message}
          </p>
        )}
      </section>

      <section className="card p-5 sm:p-6 mt-4" aria-labelledby="s-offline">
        <h2 id="s-offline" className="font-display text-2xl mb-2">
          Offline und Speicher
        </h2>
        {estimate ? (
          <p className="text-sm soft">
            Diese Website belegt derzeit etwa {formatBytes(estimate.usage)}
            {estimate.quota ? ` (verfügbar: ca. ${formatBytes(estimate.quota)})` : ''}.{' '}
            {estimate.persisted ? 'Der Browser hat dauerhafte Speicherung zugesagt.' : 'Der Browser darf gespeicherte Daten bei Speichermangel entfernen.'}
          </p>
        ) : (
          <p className="text-sm soft">Der Speicherverbrauch kann in diesem Browser nicht ermittelt werden.</p>
        )}
        <div className="flex flex-wrap gap-2 mt-4">
          <Link to="/lesezeichen?tab=offline" className="btn">
            <HardDrive size={16} aria-hidden /> Offline-Artikel verwalten
          </Link>
          {estimate && !estimate.persisted && (
            <button
              className="btn btn-ghost"
              onClick={async () => {
                const ok = await requestPersistence()
                setEstimate(await storageEstimate())
                setMessage(ok ? 'Dauerhafte Speicherung aktiviert.' : 'Der Browser hat die dauerhafte Speicherung nicht gewährt.')
              }}
            >
              Dauerhafte Speicherung anfragen
            </button>
          )}
        </div>
      </section>

      <p className="text-xs muted mt-8">
        Datenstand {new Date(manifest.generated).toLocaleString('de-DE')} · Version {manifest.version} ·{' '}
        <Link to="/info" className="link">
          Über CHRONOS
        </Link>
      </p>
    </PageContainer>
  )
}
