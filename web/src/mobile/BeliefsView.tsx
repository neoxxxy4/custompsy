import { useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLS } from '../views/practice/store'
import { rainbowColor, round2, wrapText } from './mapLogic'
import { ALL_BELIEFS, BELIEF_CATEGORIES, type BeliefRef } from './beliefsData'

// ─── геометрия графа (как в карте самооценки): центр → острова-категории → убеждения ───
const VIEWBOX = 800
const CX = VIEWBOX / 2
const CY = VIEWBOX / 2
const R_CATEGORY = 250
const R_BELIEF = 345

const SECTOR = (Math.PI * 2) / BELIEF_CATEGORIES.length
const catAngle = (ci: number) => -Math.PI / 2 + ci * SECTOR + SECTOR / 2
const beliefAngle = (ref: BeliefRef) => {
  const mid = catAngle(ref.catIndex)
  const n = ref.category.beliefs.length
  const spread = SECTOR * 0.76
  return mid - spread / 2 + ((ref.beliefIndex + 0.5) / n) * spread
}
const polar = (a: number, r: number) => ({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r })

type GraphKind = 'v1' | 'v2'

// ─── слайдер силы 0–12 ───
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
    const next = Math.max(0, Math.min(12, Math.round(ratio * 12)))
    if (next !== value) onChange(next)
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label={aria}
      aria-valuemin={0}
      aria-valuemax={12}
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
        style={{ top: 7, bottom: 7, width: `${(value / 12) * 100}%`, background: color, opacity: 0.35 }}
      />
      <div
        className="absolute rounded-full"
        style={{
          top: 0,
          width: 18,
          height: 18,
          left: `${(value / 12) * 100}%`,
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
  const [graphKind, setGraphKind] = useState<GraphKind>('v1')
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

  const catAvgs = useMemo(
    () =>
      BELIEF_CATEGORIES.map((cat, ci) =>
        round2(cat.beliefs.reduce((a, _, bi) => a + strengthOf(`b${ci}-${bi}`), 0) / cat.beliefs.length),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [strengths],
  )
  const overall = round2(catAvgs.reduce((a, x) => a + x, 0) / catAvgs.length)

  const toggleCat = (i: number) =>
    setOpenCats((s) => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  // цвет узла: v1 — радуга по силе (красный→фиолетовый), v2 — цвет категории
  const nodeColor = (ref: BeliefRef, s: number) =>
    graphKind === 'v1' ? rainbowColor(s) : ref.category.color
  const nodeOpacity = (s: number) => (graphKind === 'v1' ? 0.9 : s === 0 ? 0.15 : 0.2 + (s / 12) * 0.8)

  // ─── граф ───
  const renderGraph = () => (
    <section className="rounded-2xl p-2" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} preserveAspectRatio="xMidYMid meet" className="w-full h-auto block">
        {/* линии центр → остров */}
        {BELIEF_CATEGORIES.map((cat, ci) => {
          const a = catAngle(ci)
          const p = polar(a, R_CATEGORY)
          const color = graphKind === 'v1' ? rainbowColor(catAvgs[ci]) : cat.color
          return (
            <line
              key={`lc-${ci}`}
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
              stroke={color}
              strokeWidth={1.5}
              opacity={0.45}
            />
          )
        })}

        {/* линии остров → убеждение */}
        {ALL_BELIEFS.map((ref) => {
          const s = strengthOf(ref.id)
          const pa = polar(catAngle(ref.catIndex), R_CATEGORY)
          const pb = polar(beliefAngle(ref), R_BELIEF)
          return (
            <line
              key={`lb-${ref.id}`}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke={nodeColor(ref, s)}
              strokeWidth={1}
              opacity={graphKind === 'v1' ? 0.3 : 0.1 + (s / 12) * 0.35}
            />
          )
        })}

        {/* центр — средняя сила */}
        <circle
          cx={CX}
          cy={CY}
          r={30 + overall * 1.2}
          fill={graphKind === 'v1' ? rainbowColor(overall) : 'var(--surface-2)'}
          stroke="var(--bg)"
          strokeWidth={2}
          opacity={graphKind === 'v1' ? 0.9 : 1}
        />
        <text
          x={CX}
          y={CY + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          pointerEvents="none"
          style={{ fontSize: 18, fontWeight: 700, fill: 'var(--bg)', fontFamily: 'var(--font-mono)' }}
        >
          {overall}
        </text>

        {/* острова-категории */}
        {BELIEF_CATEGORIES.map((cat, ci) => {
          const a = catAngle(ci)
          const p = polar(a, R_CATEGORY)
          const avg = catAvgs[ci]
          const r = 14 + avg * 1.3
          const color = graphKind === 'v1' ? rainbowColor(avg) : cat.color
          const lines = wrapText(cat.name, 12)
          return (
            <g key={ci}>
              <circle cx={p.x} cy={p.y} r={r} fill={color} stroke="var(--bg)" strokeWidth={2} />
              <text
                x={p.x}
                y={p.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                pointerEvents="none"
                style={{ fontSize: 12, fontWeight: 700, fill: 'var(--bg)', fontFamily: 'var(--font-mono)' }}
              >
                {avg}
              </text>
              <text
                x={p.x}
                y={p.y + r + 12}
                textAnchor="middle"
                pointerEvents="none"
                style={{ fontSize: 11, fontWeight: 600, fill: color, fontFamily: 'var(--font-body)' }}
              >
                {lines.map((line, li, arr) => (
                  <tspan key={li} x={p.x} dy={li === 0 ? (arr.length - 1) * -6 : 13}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          )
        })}

        {/* узлы убеждений */}
        {ALL_BELIEFS.map((ref) => {
          const s = strengthOf(ref.id)
          const a = beliefAngle(ref)
          const p = polar(a, R_BELIEF)
          const r = 5 + s * 1.1
          const isSel = selected?.id === ref.id
          const color = nodeColor(ref, s)
          return (
            <g key={ref.id} onClick={() => setSelected(isSel ? null : ref)} style={{ cursor: 'pointer' }}>
              <circle cx={p.x} cy={p.y} r={Math.max(r, 13)} fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={color}
                opacity={nodeOpacity(s)}
                stroke={isSel ? 'var(--light)' : 'var(--bg)'}
                strokeWidth={isSel ? 2 : 1.2}
              />
              {s > 0 && (
                <text
                  x={p.x}
                  y={p.y + r + 9}
                  textAnchor="middle"
                  pointerEvents="none"
                  style={{ fontSize: 9.5, fill: 'var(--muted)', fontFamily: 'var(--font-body)' }}
                >
                  {wrapText(ref.belief.short, 12).map((line, li, arr) => (
                    <tspan key={li} x={p.x} dy={li === 0 ? (arr.length - 1) * -5 : 11}>
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
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: rainbowColor(strengthOf(selected.id)) }}>
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
                {catAvgs[catIndex]}
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
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: v > 0 ? rainbowColor(v) : 'var(--muted)' }}
                      >
                        {v}
                      </span>
                    </div>
                    <StrengthSlider value={v} color={rainbowColor(v)} aria={belief.text} onChange={(nv) => setStrength(id, nv)} />
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

      {tab === 'graph' && (
        <div className="grid grid-cols-2 gap-1 rounded-xl p-1 mb-3" style={{ background: 'var(--surface-2)' }}>
          {(
            [
              { id: 'v1', label: 'Убеждения 1' },
              { id: 'v2', label: 'Убеждения 2' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setGraphKind(t.id)}
              className="rounded-lg py-1 transition-colors"
              style={{
                fontSize: 11,
                fontWeight: 600,
                background: graphKind === t.id ? 'var(--active-bg)' : 'transparent',
                color: graphKind === t.id ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'list' ? renderList() : renderGraph()}
    </div>
  )
}
