/**
 * Wandelt den Artikeltext (Markdown + CHRONOS-Erweiterungen) in HTML um.
 *
 * Erweiterungen:
 *   [[artikel-id]]  [[artikel-id|Linktext]]       Querverweis auf einen Artikel
 *   [[person:id|Text]]  [[ort:id]]  [[ereignis:id]]  [[staat:id]]  [[kultur:id]]
 *   [[begriff:id]]  [[epoche:id]]  [[thema:id]]  [[quelle:id]]  [[route:id]]   Verweis auf Wissensnetz-Einträge
 *   [@quelle-id]  [@a; @b, Buch 6]                Beleg (nummerierte Fußnote zur Literaturliste)
 *   ![[medien-id]]                                Abbildung mit Bildunterschrift und Lizenz
 *   :::befund Titel … :::                         Gesicherter Forschungsbefund
 *   :::deutung Titel … :::                        Interpretation / Forschungsposition
 *   :::offen Titel … :::                          Offene Forschungsfrage
 *   :::quelle Titel … :::                         Auszug aus einer Primärquelle
 *   :::perspektive Titel … :::                    Regionale oder gesellschaftliche Perspektive
 */
import { Marked, type Tokens } from 'marked'
import type { Citation, TocEntry } from '../../src/shared/types.ts'

export const LINK_PREFIXES = {
  person: 'person',
  ort: 'place',
  ereignis: 'event',
  staat: 'polity',
  kultur: 'culture',
  begriff: 'term',
  epoche: 'epoch',
  thema: 'theme',
  quelle: 'source',
  route: 'route',
} as const

export type LinkKind = (typeof LINK_PREFIXES)[keyof typeof LINK_PREFIXES] | 'article'

export interface Resolver {
  /** Liefert URL und Standard-Linktext oder null, wenn das Ziel nicht existiert */
  link(kind: LinkKind, id: string): { href: string; label: string } | null
  media(id: string): { html: string } | null
  sourceExists(id: string): boolean
}

export interface RenderResult {
  html: string
  toc: TocEntry[]
  citations: Citation[]
  links: { kind: LinkKind; id: string }[]
  media: string[]
  text: string
  errors: string[]
}

const CALLOUTS: Record<string, string> = {
  befund: 'Gesicherter Befund',
  deutung: 'Deutung und Forschungsposition',
  offen: 'Offene Forschungsfrage',
  quelle: 'Aus den Quellen',
  perspektive: 'Perspektive',
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function renderArticle(markdown: string, resolver: Resolver, context: string): RenderResult {
  const errors: string[] = []
  const toc: TocEntry[] = []
  const citations: Citation[] = []
  const links: { kind: LinkKind; id: string }[] = []
  const media: string[] = []
  const usedIds = new Set<string>()

  const inline = (src: string): string => {
    // Abbildungen
    src = src.replace(/!\[\[([a-z0-9-]+)\]\]/g, (_m, mediaId: string) => {
      const found = resolver.media(mediaId)
      if (!found) {
        errors.push(`${context}: Abbildung "${mediaId}" ist nicht in content/media verzeichnet`)
        return ''
      }
      media.push(mediaId)
      return `\n\n${found.html}\n\n`
    })
    // Querverweise
    src = src.replace(/\[\[(?:([a-z]+):)?([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_m, prefix: string | undefined, targetId: string, label?: string) => {
      let kind: LinkKind = 'article'
      if (prefix) {
        const mapped = LINK_PREFIXES[prefix as keyof typeof LINK_PREFIXES]
        if (!mapped) {
          errors.push(`${context}: Unbekannter Verweistyp "${prefix}:" in [[${prefix}:${targetId}]]`)
          return label ?? targetId
        }
        kind = mapped
      }
      const target = resolver.link(kind, targetId)
      if (!target) {
        errors.push(`${context}: Verweisziel ${prefix ?? 'artikel'}:${targetId} existiert nicht`)
        return label ?? targetId
      }
      links.push({ kind, id: targetId })
      const cls = kind === 'article' ? 'xref xref-article' : `xref xref-entity xref-${kind}`
      return `<a class="${cls}" href="${target.href}" data-ref="${kind}:${targetId}">${label ?? target.label}</a>`
    })
    // Belege
    src = src.replace(/\[@([^\]]+)\]/g, (_m, body: string) => {
      const parts = body.split(';').map((p) => p.trim().replace(/^@/, ''))
      const sups: string[] = []
      for (const part of parts) {
        const [sourceId, ...rest] = part.split(',')
        const sid = sourceId.trim()
        if (!resolver.sourceExists(sid)) {
          errors.push(`${context}: Beleg "@${sid}" ist nicht in content/sources verzeichnet`)
          continue
        }
        const locator = rest.join(',').trim() || undefined
        const n = citations.length + 1
        citations.push({ n, source: sid, locator })
        sups.push(`<a href="#beleg-${n}" id="ref-${n}" class="cite" data-source="${sid}" aria-label="Beleg ${n}">${n}</a>`)
      }
      return sups.length ? `<sup class="cites">${sups.join('<span class="cite-sep">,</span>')}</sup>` : ''
    })
    return src
  }

  const marked = new Marked({ gfm: true, breaks: false })
  marked.use({
    renderer: {
      heading(this: { parser: { parseInline(tokens: Tokens.Generic[]): string } }, token: Tokens.Heading) {
        const html = this.parser.parseInline(token.tokens)
        const level = token.depth
        if (level === 1) {
          errors.push(`${context}: Überschrift erster Ordnung (#) ist dem Artikeltitel vorbehalten`)
        }
        if (level === 2 || level === 3) {
          const plain = html.replace(/<[^>]+>/g, '')
          let anchor = slugify(plain) || `abschnitt-${toc.length + 1}`
          while (usedIds.has(anchor)) anchor += '-2'
          usedIds.add(anchor)
          toc.push({ id: anchor, title: plain, level })
          return `<h${level} id="${anchor}"><a class="anchor" href="#${anchor}" aria-hidden="true" tabindex="-1">§</a>${html}</h${level}>\n`
        }
        return `<h${level}>${html}</h${level}>\n`
      },
      link(this: { parser: { parseInline(tokens: Tokens.Generic[]): string } }, token: Tokens.Link) {
        const text = this.parser.parseInline(token.tokens)
        const external = /^https?:\/\//.test(token.href)
        const title = token.title ? ` title="${escapeHtml(token.title)}"` : ''
        return external
          ? `<a href="${escapeHtml(token.href)}"${title} class="external" target="_blank" rel="noopener noreferrer">${text}</a>`
          : `<a href="${escapeHtml(token.href)}"${title}>${text}</a>`
      },
      table(this: unknown, token: Tokens.Table) {
        // Tabellen scrollbar einbetten (schmale Bildschirme)
        const self = this as { parser: { parseInline(tokens: Tokens.Generic[]): string } }
        const head = token.header.map((c) => `<th${c.align ? ` style="text-align:${c.align}"` : ''}>${self.parser.parseInline(c.tokens)}</th>`).join('')
        const rows = token.rows
          .map((row) => `<tr>${row.map((c) => `<td${c.align ? ` style="text-align:${c.align}"` : ''}>${self.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`)
          .join('')
        return `<div class="table-wrap" tabindex="0"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>\n`
      },
    },
  })

  // Container (:::typ Titel … :::) blockweise verarbeiten, Inneres rekursiv als Markdown
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const open = /^:::([a-z]+)\s*(.*)$/.exec(lines[i])
    if (!open) {
      out.push(lines[i])
      continue
    }
    const [, type, title] = open
    if (!CALLOUTS[type]) {
      errors.push(`${context}: Unbekannter Kasten ":::${type}"`)
    }
    const inner: string[] = []
    i++
    while (i < lines.length && lines[i].trim() !== ':::') inner.push(lines[i++])
    if (i >= lines.length) errors.push(`${context}: Kasten ":::${type}" wird nicht mit ::: geschlossen`)
    const innerHtml = marked.parse(inline(inner.join('\n'))) as string
    const label = CALLOUTS[type] ?? type
    out.push(
      '',
      `<aside class="callout callout-${type}" role="note"><p class="callout-label">${label}</p>${title ? `<p class="callout-title">${escapeHtml(title)}</p>` : ''}${innerHtml}</aside>`,
      '',
    )
  }

  const html = marked.parse(inline(out.join('\n'))) as string
  const text = html
    .replace(/<sup class="cites">.*?<\/sup>/g, '')
    .replace(/<figure[\s\S]*?<\/figure>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/g, ' ')
    .replace(/§/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return { html, toc, citations, links, media, text, errors }
}

/** Kurzer Markdown-Text (z. B. Epochenbeschreibung) ohne Belege/Inhaltsverzeichnis */
export function renderSimple(markdown: string, resolver: Resolver, context: string): { html: string; errors: string[]; links: { kind: LinkKind; id: string }[] } {
  const result = renderArticle(markdown, resolver, context)
  return { html: result.html, errors: result.errors, links: result.links }
}
