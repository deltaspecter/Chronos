import { Moon, Sun, Type } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSettings, type ThemeSetting } from '@/store/settings.ts'

export function TextSettingsControls() {
  const s = useSettings()
  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="text-sm font-medium mb-2">Darstellung</legend>
        <div className="flex gap-2 flex-wrap">
          {(
            [
              ['dark', 'Dunkel', Moon],
              ['light', 'Hell', Sun],
              ['system', 'Wie System', null],
            ] as [ThemeSetting, string, typeof Moon | null][]
          ).map(([value, label, Icon]) => (
            <button key={value} className="chip" aria-pressed={s.theme === value} onClick={() => s.set({ theme: value })}>
              {Icon && <Icon size={14} aria-hidden />}
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="text-sm font-medium flex justify-between" htmlFor="font-scale">
          Schriftgröße <span className="muted">{Math.round(s.fontScale * 100)} %</span>
        </label>
        <input
          id="font-scale"
          type="range"
          min={0.85}
          max={1.5}
          step={0.05}
          value={s.fontScale}
          onChange={(e) => s.set({ fontScale: Number(e.target.value) })}
          className="w-full accent-[var(--gold)] mt-2"
        />
      </div>
      <div>
        <label className="text-sm font-medium flex justify-between" htmlFor="line-height">
          Zeilenabstand <span className="muted">{s.lineHeight.toFixed(2).replace('.', ',')}</span>
        </label>
        <input
          id="line-height"
          type="range"
          min={1.4}
          max={2.1}
          step={0.05}
          value={s.lineHeight}
          onChange={(e) => s.set({ lineHeight: Number(e.target.value) })}
          className="w-full accent-[var(--gold)] mt-2"
        />
      </div>
      <fieldset>
        <legend className="text-sm font-medium mb-2">Schriftart im Lesetext</legend>
        <div className="flex gap-2">
          <button className="chip" aria-pressed={s.readingFont === 'serif'} onClick={() => s.set({ readingFont: 'serif' })} style={{ fontFamily: 'var(--font-serif)' }}>
            Serifenschrift
          </button>
          <button className="chip" aria-pressed={s.readingFont === 'sans'} onClick={() => s.set({ readingFont: 'sans' })} style={{ fontFamily: 'var(--font-sans)' }}>
            Serifenlos
          </button>
        </div>
      </fieldset>
    </div>
  )
}

export function TextSettingsButton() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])
  return (
    <div className="relative" ref={ref}>
      <button className="icon-btn" aria-label="Textdarstellung anpassen" aria-expanded={open} onClick={() => setOpen((o) => !o)} title="Textdarstellung">
        <Type size={19} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 w-[min(20rem,calc(100vw-2rem))] card p-5 shadow-[var(--shadow)] fade-in" role="dialog" aria-label="Textdarstellung">
          <TextSettingsControls />
        </div>
      )}
    </div>
  )
}
