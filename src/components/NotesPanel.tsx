import { Pencil, StickyNote, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { EntityKind, TocEntry } from '@/shared/types.ts'
import { useLibrary, type Note } from '@/store/library.ts'

/** Persönliche Notizen zu einem Artikel oder Eintrag – nur auf diesem Gerät gespeichert. */
export function NotesPanel({ target, sections = [], currentSection }: { target: { kind: EntityKind; id: string; title: string }; sections?: TocEntry[]; currentSection?: string }) {
  // Rohliste auswählen und erst danach filtern: Selektoren müssen stabile Referenzen liefern
  const allNotes = useLibrary((s) => s.notes)
  const notes = useMemo(() => allNotes.filter((n) => n.target.kind === target.kind && n.target.id === target.id), [allNotes, target.kind, target.id])
  const saveNote = useLibrary((s) => s.saveNote)
  const deleteNote = useLibrary((s) => s.deleteNote)
  const [editing, setEditing] = useState<Note | null>(null)
  const [text, setText] = useState('')
  const [section, setSection] = useState<string>('')
  const [open, setOpen] = useState(false)

  const start = (note?: Note) => {
    setEditing(note ?? null)
    setText(note?.text ?? '')
    setSection(note?.section?.id ?? currentSection ?? '')
    setOpen(true)
  }

  const submit = () => {
    if (!text.trim()) return
    const sec = sections.find((s) => s.id === section)
    saveNote({ id: editing?.id, target, text: text.trim(), section: sec ? { id: sec.id, title: sec.title } : undefined })
    setOpen(false)
    setText('')
    setEditing(null)
  }

  return (
    <section aria-labelledby="notizen" className="mt-14">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 id="notizen" className="section-title">
          Meine Notizen
        </h2>
        {!open && (
          <button className="btn" onClick={() => start()}>
            <StickyNote size={16} aria-hidden /> Notiz hinzufügen
          </button>
        )}
      </div>
      <p className="text-xs muted mb-4">Notizen werden nur auf diesem Gerät gespeichert und lassen sich in den Einstellungen exportieren.</p>
      {open && (
        <form
          className="card p-4 flex flex-col gap-3 mb-4 fade-in"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          {sections.length > 0 && (
            <label className="text-sm flex flex-col gap-1.5">
              <span className="muted">Bezug (optional)</span>
              <select className="input" value={section} onChange={(e) => setSection(e.target.value)}>
                <option value="">Ganzer Artikel</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.level === 3 ? '— ' : ''}
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm flex flex-col gap-1.5">
            <span className="muted">Notiz</span>
            <textarea className="input min-h-28 font-[family-name:var(--reading-font)]" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
          </label>
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Abbrechen
            </button>
            <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
              Speichern
            </button>
          </div>
        </form>
      )}
      {notes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {notes.map((n) => (
            <li key={n.id} className="card p-4">
              {n.section && (
                <a href={`#${n.section.id}`} className="text-xs text-[var(--gold)]">
                  § {n.section.title}
                </a>
              )}
              <p className="whitespace-pre-wrap font-[family-name:var(--reading-font)] mt-1">{n.text}</p>
              <div className="flex items-center gap-2 mt-2 text-xs muted">
                <span>{new Date(n.updated).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                <span className="flex-1" />
                <button className="icon-btn w-8 h-8" aria-label="Notiz bearbeiten" onClick={() => start(n)}>
                  <Pencil size={15} />
                </button>
                <button
                  className="icon-btn w-8 h-8"
                  aria-label="Notiz löschen"
                  onClick={() => {
                    if (confirm('Diese Notiz löschen?')) deleteNote(n.id)
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
