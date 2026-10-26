import { useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLS } from '../views/practice/store'
import { wrapText } from './mapLogic'
import { ALL_BELIEFS, BELIEF_CATEGORIES, type BeliefRef } from './beliefsData'

// ─── геометрия графа ───
const VIEWBOX = 800
const CX = VIEWBOX / 2
const CY = VIEWBOX / 2
const R_MAX = 330 // сила 0 — внешний край
const R_MIN = 70 // сила 10 — почти центр
const radiusFor = (strength: number) => R_MAX - (strength / 10) * (R_MAX - R_MIN)

// узлы раскладываются дугой внутри сектора своей категории
function nodeAngle(ref: BeliefRef): number {
  const sector = (Math.PI * 2) / BELIEF_CATEGORIES.length
  const start = -Math.PI / 2 + ref.catIndex * sector
  const n = ref.category.beliefs.length
  const pad = sector * 0.14
  return start + pad + ((ref.beliefIndex + 0.5) / n) * (sector - pad * 2)
}

// ─── слайдер силы 0–10 ───
function StrengthSlider({
  value,
  color,
  aria,
  onChange,
}: {
  value: number
  color: string
  aria: string
  onChange: (v: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const updateFromClientX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = (clientX - rect.left) / rect.width
    const next = Math.max(0, Math.min(10, Math.round(ratio * 10)))
    if (next !== value) onChange(next)
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label={aria}
      aria-valuemin={0}
      aria-valuemax={10}
      aria-valuenow={value}
      onPointerDown={(e) => {
        e.preventDefault()
        setDragging(true)
        updateFromClientX(e.clientX)
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (dragging) {
          e.preventDefault()
          updateFromClientX(e.clientX)
        }
      }}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setDragging(false)}
      className="relative select-none"
      style={{ height: 18, cursor: 'pointer', touchAction: 'none' }}
    >
      <div
        className="absolute left-0 right-0 rounded-md"
        style={{ top: 7, bottom: 7, background: 'var(--surface-2)' }}
      />
      <div
        className="absolute left-0 rounded-md"
        style={{ top: 7, bottom: 7, width: `${(value / 10) * 100}%`, background: color, opacity: 0.35 }}
      />
      <div
        className="absolute rounded-full"
        style={{
          top: 0,
          width: 18,
          height: 18,
          left: `${(value / 10) * 100}%`,
          transform: 'translateX(-50%)',
          background: value > 0 ? color : 'var(--surface-2)',
          border: '2px solid var(--surface)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
        }}
      />
    </div>
  )
}

export default function BeliefsView() {
  const [strengths, setStrengths] = useLS<Record<string, number>>('aod4-beliefs-v1', {})
  const [tab, setTab] = useState<'list' | 'graph'>('list')
  const [openCats, setOpenCats] = useState<Set<number>>(() => new Set(BELIEF_CATEGORIES.map((_, i) => i)))
  const [selected, setSelected] = useState<BeliefRef | null>(null)

  const strengthOf = (id: string) => strengths[id] ?? 0
  const setStrength = (id: string, v: number) =>
    setStrengths((s) => {
      const next = { ...s }
      if (v > 0) next[id] = v
      else delete next[id]
      return next
    })

  const overall = useMemo(() => {
    const vals = ALL_BELIEFS.map((b) => strengthOf(b.id))
    const sum = vals.reduce((a, x) => a + x, 0)
    return Math.round((sum / vals.length) * 10) / 10
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strengths])

  const toggleCat = (i: number) =>
    setOpenCats((s) => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  // ─── граф ───
  const sector = (Math.PI * 2) / BELIEF_CATEGORIES.length
  const rings = [2, 4, 6, 8, 10]

  const renderGraph = () => (
    <section className="rounded-2xl p-2" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} preserveAspectRatio="xMidYMid meet" className="w-full h-auto block">
        {/* кольца силы */}
        {rings.map((s) => (
          <g key={s}>
            <circle
              cx={CX}
              cy={CY}
              r={radiusFor(s)}
              fill="none"
              stroke="var(--line)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={CX + 4}
              y={CY - radiusFor(s) + 12}
              style={{ fontSize: 10, fill: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
            >
              {s}
            </text>
          </g>
        ))}
        <circle cx={CX} cy={CY} r={R_MAX} fill="none" stroke="var(--line)" strokeWidth={1} />

        {/* границы секторов и подписи категорий */}
        {BELIEF_CATEGORIES.map((cat, ci) => {
          const start = -Math.PI / 2 + ci * sector
          const x = CX + Math.cos(start) * R_MAX
          const y = CY + Math.sin(start) * R_MAX
          const mid = start + sector / 2
          const cos = Math.cos(mid)
          const sin = Math.sin(mid)
          // подпись внутрь от края: у крайних секторов прижимаем к стороне
          const anchor = cos > 0.4 ? 'start' : cos < -0.4 ? 'end' : 'middle'
          const lr = R_MAX - 4
          const lx = CX + cos * lr + (anchor === 'start' ? 6 : anchor === 'end' ? -6 : 0)
          const ly = CY + sin * lr + (sin > 0.4 ? -6 : sin < -0.4 ? 14 : 4)
          return (
            <g key={ci}>
              <line x1={CX} y1={CY} x2={x} y2={y} stroke="var(--line)" strokeWidth={1} opacity={0.6} />
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                style={{ fontSize: 13, fontWeight: 600, fill: cat.color, fontFamily: 'var(--font-body)', opacity: 0.9 }}
              >
                {wrapText(cat.name, 10).map((line, li, arr) => (
                  <tspan key={li} x={lx} dy={li === 0 ? (arr.length - 1) * -7 : 14}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          )
        })}

        {/* линии центр → узел */}
        {ALL_BELIEFS.map((ref) => {
          const s = strengthOf(ref.id)
          if (s === 0) return null
          const a = nodeAngle(ref)
          const r = radiusFor(s)
          return (
            <line
              key={`l-${ref.id}`}
              x1={CX}
              y1={CY}
              x2={CX + Math.cos(a) * r}
              y2={CY + Math.sin(a) * r}
              stroke={ref.category.color}
              strokeWidth={1.2}
              opacity={0.12 + (s / 10) * 0.35}
            />
          )
        })}

        {/* центр — средняя сила */}
        <circle cx={CX} cy={CY} r={34} fill="var(--surface-2)" stroke="var(--line)" strokeWidth={1.5} />
        <text
          x={CX}
          y={CY + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: 18, fontWeight: 700, fill: 'var(--light)', fontFamily: 'var(--font-mono)' }}
        >
          {overall}
        </text>

        {/* узлы убеждений */}
        {ALL_BELIEFS.map((ref) => {
          const s = strengthOf(ref.id)
          const a = nodeAngle(ref)
          const r = radiusFor(s)
          const x = CX + Math.cos(a) * r
          const y = CY + Math.sin(a) * r
          const nodeR = 6 + s * 1.5
          const isSel = selected?.id === ref.id
          return (
            <g key={ref.id} onClick={() => setSelected(isSel ? null : ref)} style={{ cursor: 'pointer' }}>
              <circle
                cx={x}
                cy={y}
                r={Math.max(nodeR, 14)}
                fill="transparent"
              />
              <circle
                cx={x}
                cy={y}
                r={nodeR}
                fill={ref.category.color}
                opacity={s === 0 ? 0.22 : 0.55 + (s / 10) * 0.45}
                stroke={isSel ? 'var(--light)' : 'var(--bg)'}
                strokeWidth={isSel ? 2.5 : 1.5}
              />
              {s >= 6 && (
                <text
                  x={x + Math.cos(a) * (nodeR + 8)}
                  y={y + Math.sin(a) * (nodeR + 8)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  pointerEvents="none"
                  style={{ fontSize: 10.5, fill: 'var(--muted)', fontFamily: 'var(--font-body)' }}
                >
                  {wrapText(ref.belief.short, 14).map((line, li) => (
                    <tspan key={li} x={x + Math.cos(a) * (nodeR + 8)} dy={li === 0 ? (wrapText(ref.belief.short, 14).length - 1) * -6 : 12}>
                      {line}
                    </tspan>
                  ))}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* выбранный узел: название + быстрая правка силы */}
      {selected && (
        <div className="mt-2 rounded-xl px-3 py-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2">
            <span className="flex-none w-2.5 h-2.5 rounded-full" style={{ background: selected.category.color }} />
            <p className="flex-1 min-w-0" style={{ fontSize: 12, color: 'var(--light)' }}>
              {selected.belief.text}
            </p>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: selected.category.color }}>
              {strengthOf(selected.id)}
            </span>
          </div>
          <div className="mt-1">
            <StrengthSlider
              value={strengthOf(selected.id)}
              color={selected.category.color}
              aria={selected.belief.text}
              onChange={(v) => setStrength(selected.id, v)}
            />
          </div>
        </div>
      )}
    </section>
  )

  // ─── список ───
  const renderList = () => (
    <div>
      {BELIEF_CATEGORIES.map((cat, catIndex) => {
        const open = openCats.has(catIndex)
        const vals = cat.beliefs.map((_, bi) => strengthOf(`b${catIndex}-${bi}`))
        const avg = Math.round((vals.reduce((a, x) => a + x, 0) / vals.length) * 10) / 10
        return (
          <section
            key={catIndex}
            className="rounded-2xl mb-2 overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
          >
            <button className="w-full flex items-center gap-2 px-3 py-2.5" onClick={() => toggleCat(catIndex)}>
              <ChevronDown
                size={15}
                strokeWidth={1.8}
                className="flex-none transition-transform"
                style={{ color: 'var(--muted)', transform: open ? 'rotate(180deg)' : 'none' }}
              />
              <span className="flex-1 min-w-0 text-left" style={{ fontSize: 13, fontWeight: 600, color: cat.color }}>
                {cat.name}
              </span>
              <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: cat.color }}>
                {avg}
              </span>
            </button>
            {open &&
              cat.beliefs.map((belief, beliefIndex) => {
                const id = `b${catIndex}-${beliefIndex}`
                const v = strengthOf(id)
                return (
                  <div key={beliefIndex} className="px-3 py-2" style={{ borderTop: '1px solid var(--line)' }}>
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span style={{ fontSize: 12, color: 'var(--text)' }}>{belief.text}</span>
                      <span
                        className="flex-none"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: v > 0 ? cat.color : 'var(--muted)' }}
                      >
                        {v}
                      </span>
                    </div>
                    <StrengthSlider value={v} color={cat.color} aria={belief.text} onChange={(nv) => setStrength(id, nv)} />
                  </div>
                )
              })}
          </section>
        )
      })}
    </div>
  )

  return (
    <div className="px-4 pt-5 pb-24">
      {/* сегмент вкладок */}
      <div className="grid grid-cols-2 gap-1 rounded-xl p-1 mb-3" style={{ background: 'var(--surface-2)' }}>
        {(
          [
            { id: 'list', label: 'Список убеждений' },
            { id: 'graph', label: 'Граф' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="rounded-lg py-1.5 transition-colors"
            style={{
              fontSize: 12,
              fontWeight: 600,
              background: tab === t.id ? 'var(--accent)' : 'transparent',
              color: tab === t.id ? 'var(--on-fill)' : 'var(--muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'list' ? renderList() : renderGraph()}
    </div>
  )
}
