import { describe, expect, it } from 'vitest'
import { renderArticle, slugify, type Resolver } from './markup.ts'

const resolver: Resolver = {
  link: (kind, id) => (id === 'fehlt' ? null : { href: `/${kind}/${id}`, label: `Titel ${id}` }),
  media: (id) => (id === 'bild' ? { html: '<figure class="figure">BILD</figure>' } : null),
  sourceExists: (id) => id !== 'unbekannt',
}

describe('renderArticle', () => {
  it('erzeugt Inhaltsverzeichnis und Anker', () => {
    const r = renderArticle('## Erster Teil\n\nText\n\n### Unterpunkt\n\nMehr', resolver, 'test')
    expect(r.toc).toEqual([
      { id: 'erster-teil', title: 'Erster Teil', level: 2 },
      { id: 'unterpunkt', title: 'Unterpunkt', level: 3 },
    ])
    expect(r.html).toContain('id="erster-teil"')
  })
  it('löst Querverweise auf und meldet fehlende Ziele', () => {
    const r = renderArticle('Siehe [[roemische-republik]] und [[person:caesar|Caesar]] und [[fehlt]].', resolver, 'test')
    expect(r.html).toContain('href="/article/roemische-republik"')
    expect(r.html).toContain('>Caesar</a>')
    expect(r.links).toContainEqual({ kind: 'person', id: 'caesar' })
    expect(r.errors.some((e) => e.includes('fehlt'))).toBe(true)
  })
  it('nummeriert Belege fortlaufend', () => {
    const r = renderArticle('Satz.[@a] Noch einer.[@b, Buch 6; @c]', resolver, 'test')
    expect(r.citations).toEqual([
      { n: 1, source: 'a', locator: undefined },
      { n: 2, source: 'b', locator: 'Buch 6' },
      { n: 3, source: 'c', locator: undefined },
    ])
    expect(r.html).toContain('href="#beleg-2"')
  })
  it('meldet unbekannte Quellen', () => {
    const r = renderArticle('Satz.[@unbekannt]', resolver, 'test')
    expect(r.errors[0]).toContain('unbekannt')
  })
  it('rendert Kästen mit Markdown-Inhalt', () => {
    const r = renderArticle(':::offen Eine Frage\nIst *das* so?\n:::', resolver, 'test')
    expect(r.html).toContain('callout-offen')
    expect(r.html).toContain('<em>das</em>')
    expect(r.html).toContain('Eine Frage')
  })
  it('bindet Abbildungen ein', () => {
    const r = renderArticle('Text\n\n![[bild]]\n\nWeiter', resolver, 'test')
    expect(r.media).toEqual(['bild'])
    expect(r.html).toContain('BILD')
  })
  it('erzeugt lesbare Anker-IDs', () => {
    expect(slugify('Die „Uruk-Expansion“ – Überblick')).toBe('die-uruk-expansion-ueberblick')
  })
})
