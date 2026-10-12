/**
 * Kleines, radiales Wissensnetz: der aktuelle Eintrag in der Mitte, verknüpfte Einträge
 * ringsum, nach Art gruppiert. Jeder Knoten ist ein Link. Die gleichen Verknüpfungen stehen
 * zusätzlich als Listen unter der Grafik (Barrierefreiheit, kleine Bildschirme).
 */
import { useNavigate } from 'react-router'
import type { EntityInfo } from '@/lib/entities.ts'
import { KIND_LABEL_PLURAL } from '@/shared/routes.ts'
import type { EntityKind } from '@/shared/types.ts'

const KIND_COLOR: Partial<Record<EntityKind, string>> = {
  article: 'var(--gold)',
  person: 'var(--c-deutung)',
  place: 'var(--c-perspektive)',
  event: 'var(--c-offen)',
  polity: 'var(--c-quelle)',
  culture: 'var(--c-befund)',
  term: 'var(--text-muted)',
  epoch: 'var(--gold-soft)',
}

const ORDER: EntityKind[] = ['article', 'event', 'person', 'place', 'polity', 'culture', 'term', 'epoch']
const MAX_NODES = 26

function truncate(text: string, max = 22) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export function KnowledgeGraph({ center, nodes }: { center: { title: string; kind: EntityKind }; nodes: EntityInfo[] }) {
  const navigate = useNavigate()
  const sorted = [...nodes].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)).slice(0, MAX_NODES)
  if (sorted.length === 0) return null
  const W = 640
  const H = 460
  const cx = W / 2
  const cy = H / 2
  const rx = 230
  const ry = 170
  const kinds = [...new Set(sorted.map((n) => n.kind))]
  return (
    <figure className="card p-2 sm:p-4 overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Wissensnetz zu ${center.title}: ${sorted.length} verknüpfte Einträge`}>
        {sorted.map((node, i) => {
          const angle = (i / sorted.length) * Math.PI * 2 - Math.PI / 2
          const x = cx + Math.cos(angle) * rx
          const y = cy + Math.sin(angle) * ry
          return <line key={`l-${node.kind}-${node.id}`} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line-strong)" strokeWidth={1} />
        })}
        <circle cx={cx} cy={cy} r={34} fill="var(--bg-elev-2)" stroke="var(--gold)" strokeWidth={1.5} />
        <foreignObject x={cx - 80} y={cy + 38} width={160} height={44}>
          <p style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, lineHeight: 1.1, color: 'var(--text)' }}>{truncate(center.title, 40)}</p>
        </foreignObject>
        <circle cx={cx} cy={cy} r={5} fill="var(--gold)" />
        {sorted.map((node, i) => {
          const angle = (i / sorted.length) * Math.PI * 2 - Math.PI / 2
          const x = cx + Math.cos(angle) * rx
          const y = cy + Math.sin(angle) * ry
          const right = Math.cos(angle) >= 0
          const color = KIND_COLOR[node.kind] ?? 'var(--text-muted)'
          return (
            <a
              key={`${node.kind}-${node.id}`}
              href={node.href}
              onClick={(e) => {
                e.preventDefault()
                navigate(node.href)
              }}
              className="graph-node"
            >
              <title>{`${node.title}${node.summary ? ` – ${node.summary}` : ''}`}</title>
              <circle cx={x} cy={y} r={node.kind === 'article' ? 8 : 6} fill={color} stroke="var(--bg)" strokeWidth={2} />
              <text
                x={x + (right ? 12 : -12)}
                y={y + 4}
                textAnchor={right ? 'start' : 'end'}
                fontSize={13}
                fontFamily="var(--font-sans)"
                fill="var(--text-soft)"
                style={{ paintOrder: 'stroke', stroke: 'var(--bg-elev)', strokeWidth: 4 }}
              >
                {truncate(node.title)}
              </text>
            </a>
          )
        })}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 px-2 pb-1 text-xs muted">
        {kinds.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: KIND_COLOR[k] ?? 'var(--text-muted)' }} />
            {KIND_LABEL_PLURAL[k]}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
