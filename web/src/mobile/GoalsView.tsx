import { useMemo, useRef, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { uid, useLS } from '../views/practice/store'
import { round2, valueHex, wrapText } from './mapLogic'
import { DEFAULT_GOALS, GOAL_PALETTE, GOALS_STRUCTURE_KEY, GOALS_VALS_KEY, type GoalArea } from './goalsData'

// Инструмент «Цели»: круг областей развития (как граф убеждений).
// Узел области = средний уровень её подпунктов (0-12, цвет по делениям самооценки:
// 0 красный → 12 фиолетовый). Тап по узлу — подпункты со слайдерами, добавление/удаление.

const VIEWBOX = 700
const CX = VIEWBOX / 2
const CY = VIEWBOX / 2
const R_AREA = 240

const polar = (a: number, r: number) => ({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r })

// ─── слайдер уровня 0–12 (как в убеждениях) ───
function LevelSlider({
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
      <div className="absolute left-0 right-0 rounded-md" style={{ top: 7, bottom: 7, background: 'var(--surface-2)' }} />
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
          background: color,
          border: '2px solid var(--surface)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
        }}
      />
    </div>
  )
}

export default function GoalsView() {
  const [areas, setAreas] = useLS<GoalArea[]>(GOALS_STRUCTURE_KEY, DEFAULT_GOALS)
  const [vals, setVals] = useLS<Record<string, number>>(GOALS_VALS_KEY, {})
  const [selArea, setSelArea] = useState<string | null>(null)
  const [newParam, setNewParam] = useState('')
  const [newArea, setNewArea] = useState('')
  const [addAreaOpen, setAddAreaOpen] = useState(false)

  const valOf = (paramId: string) => vals[paramId] ?? 0
  const setVal = (paramId: string, v: number) =>
    setVals((s) => {
      const next = { ...s }
      if (v > 0) next[paramId] = v
      else delete next[paramId]
      return next
    })

  const levelOf = (a: GoalArea) =>
    a.params.length ? round2(a.params.reduce((s, p) => s + valOf(p.id), 0) / a.params.length) : 0

  const levels = useMemo(() => areas.map(levelOf), [areas, vals]) // eslint-disable-line react-hooks/exhaustive-deps
  const overall = areas.length ? round2(levels.reduce((a, x) => a + x, 0) / areas.length) : 0

  const angleOf = (i: number) => -Math.PI / 2 + (i * Math.PI * 2) / Math.max(areas.length, 1) + Math.PI / Math.max(areas.length, 1)

  const addParam = () => {
    const text = newParam.trim()
    if (!text || !selArea) return
    setAreas((as) => as.map((a) => (a.id === selArea ? { ...a, params: [...a.params, { id: uid(), text }] } : a)))
    setNewParam('')
  }

  const removeParam = (areaId: string, paramId: string) => {
    setAreas((as) => as.map((a) => (a.id === areaId ? { ...a, params: a.params.filter((p) => p.id !== paramId) } : a)))
    setVals((s) => {
      const next = { ...s }
      delete next[paramId]
      return next
    })
  }

  const addArea = () => {
    const name = newArea.trim()
    if (!name) return
    const color = GOAL_PALETTE[areas.length % GOAL_PALETTE.length]
    const a: GoalArea = { id: uid(), name, color, params: [] }
    setAreas((as) => [...as, a])
    setNewArea('')
    setAddAreaOpen(false)
    setSelArea(a.id)
  }

  const removeArea = (id: string) => {
    const area = areas.find((a) => a.id === id)
    setAreas((as) => as.filter((a) => a.id !== id))
    if (area) {
      setVals((s) => {
        const next = { ...s }
        area.params.forEach((p) => delete next[p.id])
        return next
      })
    }
    if (selArea === id) setSelArea(null)
  }

  const sel = areas.find((a) => a.id === selArea) ?? null

  return (
    <div className="px-4 pt-5 pb-24">
      {/* круг областей */}
      <section className="rounded-2xl p-2" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} preserveAspectRatio="xMidYMid meet" className="w-full h-auto block">
          {/* линии центр → область */}
          {areas.map((a, i) => {
            const p = polar(angleOf(i), R_AREA)
            return (
              <line key={`l-${a.id}`} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke={a.color} strokeWidth={1.5} opacity={0.4} />
            )
          })}
          {/* центр — общий уровень */}
          <circle cx={CX} cy={CY} r={30 + overall * 1.2} fill={valueHex(false, overall)} stroke="var(--bg)" strokeWidth={2} opacity={0.9} />
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
          {/* узлы областей */}
          {areas.map((a, i) => {
            const level = levels[i]
            const p = polar(angleOf(i), R_AREA)
            const r = 16 + level * 1.6
            const isSel = selArea === a.id
            const lines = wrapText(a.name, 12)
            return (
              <g key={a.id} onClick={() => setSelArea(isSel ? null : a.id)} style={{ cursor: 'pointer' }}>
                <circle cx={p.x} cy={p.y} r={r + 12} fill="transparent" />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={valueHex(false, level)}
                  opacity={level > 0 ? 0.9 : 0.35}
                  stroke={isSel ? 'var(--light)' : 'var(--bg)'}
                  strokeWidth={isSel ? 2.5 : 2}
                />
                <text
                  x={p.x}
                  y={p.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  pointerEvents="none"
                  style={{ fontSize: 12, fontWeight: 700, fill: 'var(--bg)', fontFamily: 'var(--font-mono)' }}
                >
                  {level || ''}
                </text>
                <text
                  x={p.x}
                  y={p.y + r + 13}
                  textAnchor="middle"
                  pointerEvents="none"
                  style={{ fontSize: 11, fontWeight: 600, fill: a.color, fontFamily: 'var(--font-body)' }}
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
        </svg>
      </section>

      {/* выбранная область: подпункты */}
      {sel && (
        <section className="rounded-2xl mt-2 px-3 py-2.5" style={{ background: 'var(--surface)', border: `1px solid ${sel.color}55` }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex-none w-2.5 h-2.5 rounded-full" style={{ background: sel.color }} />
            <p className="flex-1 min-w-0" style={{ fontSize: 13, fontWeight: 700, color: sel.color }}>
              {sel.name}
            </p>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: valueHex(false, levelOf(sel)) }}>
              {levelOf(sel)}
            </span>
            <button
              onClick={() => removeArea(sel.id)}
              className="flex-none grid place-items-center rounded-lg"
              style={{ width: 26, height: 26, color: 'var(--muted)' }}
              aria-label="Удалить область"
            >
              <Trash2 size={13} strokeWidth={1.8} />
            </button>
          </div>
          {sel.params.length === 0 && (
            <p className="mt-1" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              Подпунктов нет — добавь первый ниже. Уровень области = среднее по подпунктам.
            </p>
          )}
          {sel.params.map((p) => {
            const v = valOf(p.id)
            return (
              <div key={p.id} className="py-1.5" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="flex-1 min-w-0" style={{ fontSize: 12, color: 'var(--text)' }}>
                    {p.text}
                  </span>
                  <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: valueHex(false, v) }}>
                    {v}
                  </span>
                  <button
                    onClick={() => removeParam(sel.id, p.id)}
                    className="flex-none grid place-items-center rounded-md"
                    style={{ width: 22, height: 22, color: 'var(--muted)' }}
                    aria-label="Удалить подпункт"
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                </div>
                <LevelSlider value={v} color={valueHex(false, v)} aria={p.text} onChange={(nv) => setVal(p.id, nv)} />
              </div>
            )
          })}
          <div className="flex gap-1.5 mt-2">
            <input
              value={newParam}
              onChange={(e) => setNewParam(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addParam()}
              placeholder="Новый подпункт…"
              className="flex-1 rounded-xl px-2.5 outline-none"
              style={{ height: 34, background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 12 }}
            />
            <button
              onClick={addParam}
              className="flex-none grid place-items-center rounded-xl"
              style={{ width: 34, height: 34, background: 'var(--accent)', color: 'var(--on-fill)' }}
              aria-label="Добавить подпункт"
            >
              <Plus size={15} strokeWidth={2.4} />
            </button>
          </div>
        </section>
      )}

      {/* список областей */}
      <section className="rounded-2xl mt-2 overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        {areas.map((a, i) => (
          <button
            key={a.id}
            className="w-full flex items-center gap-2 px-3 py-2.5"
            style={{ borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}
            onClick={() => setSelArea(selArea === a.id ? null : a.id)}
          >
            <span className="flex-none w-2.5 h-2.5 rounded-full" style={{ background: a.color }} />
            <span className="flex-1 min-w-0 text-left" style={{ fontSize: 12.5, color: 'var(--text)' }}>
              {a.name}
            </span>
            <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{a.params.length} пунктов</span>
            <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: valueHex(false, levels[i]) }}>
              {levels[i]}
            </span>
          </button>
        ))}
      </section>

      {/* добавить область */}
      {!addAreaOpen ? (
        <button
          onClick={() => setAddAreaOpen(true)}
          className="w-full rounded-2xl mt-2 py-3 flex items-center justify-center gap-1.5"
          style={{ background: 'var(--surface)', border: '1px dashed var(--line)', color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}
        >
          <Plus size={15} strokeWidth={2.2} /> Область
        </button>
      ) : (
        <div className="flex gap-1.5 mt-2">
          <input
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addArea()}
            placeholder="Название новой области…"
            className="flex-1 rounded-xl px-3 outline-none"
            style={{ height: 38, background: 'var(--surface)', border: '1px solid var(--accent)', color: 'var(--light)', fontSize: 13 }}
          />
          <button
            onClick={addArea}
            className="flex-none rounded-xl px-3"
            style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 12, fontWeight: 700 }}
          >
            ОК
          </button>
          <button
            onClick={() => setAddAreaOpen(false)}
            className="flex-none grid place-items-center rounded-xl px-2"
            style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
            aria-label="Отмена"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}
