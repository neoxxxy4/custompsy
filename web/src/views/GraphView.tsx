import { useMemo, useState } from 'react'
import { GRAPH_NODES, GRAPH_EDGES, type GraphNode } from '../data/system'

const nodeById = (id: string) => GRAPH_NODES.find((n) => n.id === id)!

function edgePath(a: GraphNode, b: GraphNode) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const k = Math.min(40, len * 0.12)
  const cx = mx - (dy / len) * k
  const cy = my + (dx / len) * k
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`
}

export default function GraphView() {
  const [selected, setSelected] = useState<GraphNode | null>(nodeById('meaning'))
  const [hovered, setHovered] = useState<string | null>(null)

  const neighborIds = useMemo(() => {
    if (!selected) return new Set<string>()
    const s = new Set<string>([selected.id])
    GRAPH_EDGES.forEach((e) => {
      if (e.from === selected.id) s.add(e.to)
      if (e.to === selected.id) s.add(e.from)
    })
    return s
  }, [selected])

  return (
    <div className="max-w-6xl mx-auto px-6 pt-28 pb-10">
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono-label mb-2">Модуль 02</p>
          <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>Граф архитектуры</h2>
        </div>
        <p className="mono-label max-w-xs" style={{ lineHeight: 1.8 }}>
          Управляя тремя источниками — Мы, Среда, Люди — я управляю собой. Клик по узлу — описание.
        </p>
      </div>

      <div className="rise mt-8 flex flex-col lg:flex-row gap-3 items-start" style={{ animationDelay: '100ms' }}>
        <div className="panel rounded-md overflow-hidden relative flex-1 w-full">
          <svg viewBox="0 0 1200 860" className="w-full h-auto block" style={{ minHeight: 420 }}>
            <defs>
              <radialGradient id="halo" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style={{ stopColor: 'var(--halo)' }} />
                <stop offset="100%" style={{ stopColor: 'transparent' }} />
              </radialGradient>
            </defs>

            {/* edges */}
            {GRAPH_EDGES.map((e) => {
              const a = nodeById(e.from)
              const b = nodeById(e.to)
              const lit = selected && (e.from === selected.id || e.to === selected.id)
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  d={edgePath(a, b)}
                  className="edge-line"
                  style={{
                    stroke: lit ? (selected?.color ?? 'var(--accent)') : 'var(--line-strong)',
                    strokeWidth: lit ? 1.6 : 1,
                    opacity: selected ? (lit ? 0.95 : 0.25) : 0.7,
                    transition: 'opacity .3s ease, stroke .3s ease',
                  }}
                />
              )
            })}

            {/* nodes */}
            {GRAPH_NODES.map((n) => {
              const isSel = selected?.id === n.id
              const dim = selected && !neighborIds.has(n.id)
              const hov = hovered === n.id
              return (
                <g
                  key={n.id}
                  className="graph-node"
                  transform={`translate(${n.x}, ${n.y})`}
                  onClick={() => setSelected(n)}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ opacity: dim ? 0.3 : 1, transition: 'opacity .3s ease' }}
                >
                  <circle r={n.r * 2.1} fill="url(#halo)" className="node-halo" style={{ animationDelay: `${n.x * 7}ms` }} />
                  <circle
                    className="core"
                    r={isSel || hov ? n.r + 3 : n.r}
                    fill="var(--surface)"
                    stroke={n.color}
                    strokeWidth={isSel ? 2.4 : 1.4}
                    style={isSel ? { filter: `drop-shadow(0 0 14px ${n.color})` } : undefined}
                  />
                  <circle r={4} fill={n.color} />
                  <text
                    y={n.r + 20}
                    textAnchor="middle"
                    fill="var(--light)"
                    style={{ fontFamily: 'var(--font-body)', fontSize: n.kind === 'core' ? 19 : 15, fontWeight: 500 }}
                  >
                    {n.label}
                  </text>
                  {n.sub && (
                    <text
                      y={n.r + 37}
                      textAnchor="middle"
                      fill="var(--muted)"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}
                    >
                      {n.sub}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>

          {/* legend */}
          <div className="px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2" style={{ borderTop: '1px solid var(--line)' }}>
            <span className="mono-label">Легенда</span>
            {[
              ['Смысл / опоры', 'var(--light)'],
              ['Источники', 'var(--text)'],
              ['Силы', 'var(--f-neuro)'],
              ['Связь узла', 'var(--accent)'],
            ].map(([label, c]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="tag-dot" style={{ background: c }} />
                <span className="mono-label" style={{ fontSize: 9 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* side panel */}
        <div className="panel rounded-md p-6 w-full lg:w-[340px] lg:flex-none lg:sticky lg:top-24">
          {selected ? (
            <div className="fadein" key={selected.id}>
              <div className="flex items-center gap-2.5">
                <span className="tag-dot" style={{ background: selected.color }} />
                <span className="mono-label">
                  {selected.kind === 'core' && 'ядро'}
                  {selected.kind === 'pillar' && 'опора'}
                  {selected.kind === 'force' && 'сила'}
                  {selected.kind === 'source' && 'источник'}
                  {selected.kind === 'leaf' && 'инструмент'}
                </span>
              </div>
              <h3 className="display mt-3" style={{ fontSize: 30 }}>{selected.label}</h3>
              {selected.sub && <p className="mono-label mt-1">{selected.sub}</p>}
              <p className="mt-4 text-[13.5px] leading-relaxed" style={{ color: 'var(--text)' }}>
                {selected.desc}
              </p>
            </div>
          ) : (
            <p className="mono-label" style={{ lineHeight: 2 }}>Выбери узел графа</p>
          )}
        </div>
      </div>
    </div>
  )
}
