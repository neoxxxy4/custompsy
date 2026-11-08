import { useMemo, useRef, useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { useLS } from '../views/practice/store'
import { valueHex, wrapText } from './mapLogic'
import { NEED_CATEGORIES, allNeeds, type NeedRef } from './needsData'

// Инструмент «Потребности»: значимость и удовлетворённость каждой потребности (0–10).
// Дефицит = значимость − удовлетворённость — то, что сейчас болит и мотивирует.
// Хранение: aod4-needs-v1 {id: {imp, sat}}, свои потребности: aod4-needs-custom {catIndex: [тексты]}

export interface NeedVal {
  imp: number
  sat: number
}

const clamp10 = (v: number) => Math.max(0, Math.min(10, Math.round(v)))
const deficitOf = (v?: NeedVal) => (v ? Math.max(0, v.imp - v.sat) : 0)
const satColor = (sat: number) => valueHex(false, sat * 1.2) // 0=красный … 10=фиолетовый

// ─── компактный слайдер 0–10 ───
function MiniSlider({
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
    const next = clamp10(((clientX - rect.left) / rect.width) * 10)
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
      className="relative select-none flex-1"
      style={{ height: 16, cursor: 'pointer', touchAction: 'none' }}
    >
      <div className="absolute left-0 right-0 rounded-md" style={{ top: 6, bottom: 6, background: 'var(--surface-2)' }} />
      <div
        className="absolute left-0 rounded-md"
        style={{ top: 6, bottom: 6, width: `${value * 10}%`, background: color, opacity: 0.35 }}
      />
      <div
        className="absolute rounded-full"
        style={{
          top: 1,
          width: 14,
          height: 14,
          left: `${value * 10}%`,
          transform: 'translateX(-50%)',
          background: color,
          border: '2px solid var(--surface)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
        }}
      />
    </div>
  )
}

export default function NeedsView() {
  const [vals, setVals] = useLS<Record<string, NeedVal>>('aod4-needs-v1', {})
  const [custom, setCustom] = useLS<Record<number, string[]>>('aod4-needs-custom', {})
  const [tab, setTab] = useState<'list' | 'map'>('list')
  const [openCats, setOpenCats] = useState<Set<number>>(() => new Set(NEED_CATEGORIES.map((_, i) => i)))
  const [selected, setSelected] = useState<NeedRef | null>(null)
  const [addCat, setAddCat] = useState<number | null>(null)
  const [addText, setAddText] = useState('')

  const needs = useMemo(() => allNeeds(custom), [custom])
  const valOf = (id: string): NeedVal => vals[id] ?? { imp: 0, sat: 0 }
  const setVal = (id: string, patch: Partial<NeedVal>) =>
    setVals((v) => {
      const cur = v[id] ?? { imp: 0, sat: 0 }
      const next = { imp: clamp10(patch.imp ?? cur.imp), sat: clamp10(patch.sat ?? cur.sat) }
      const out = { ...v }
      if (next.imp === 0 && next.sat === 0) delete out[id]
      else out[id] = next
      return out
    })

  // топ дефицитов по всему каталогу
  const deficits = useMemo(
    () =>
      needs
        .map((n) => ({ n, v: vals[n.id], d: deficitOf(vals[n.id]) }))
        .filter((x) => x.d > 0)
        .sort((a, b) => b.d - a.d),
    [needs, vals],
  )

  const toggleCat = (i: number) =>
    setOpenCats((s) => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  const addCustom = (ci: number) => {
    const text = addText.trim()
    if (!text) return
    setCustom((c) => ({ ...c, [ci]: [...(c[ci] ?? []), text] }))
    setAddText('')
    setAddCat(null)
  }

  // ─── строка потребности: два слайдера ───
  const renderNeed = (n: NeedRef) => {
    const v = valOf(n.id)
    const d = deficitOf(v)
    return (
      <div key={n.id} className="px-3 py-2" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0" style={{ fontSize: 12.5, color: 'var(--text)' }}>{n.text}</span>
          {d > 0 && (
            <span
              className="flex-none rounded-md px-1.5 py-0.5"
              style={{ fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
            >
              дефицит {d}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="flex-none" style={{ fontSize: 10, color: 'var(--muted)', width: 68 }}>значимость</span>
          <MiniSlider value={v.imp} color={n.color} aria={`${n.text} — значимость`} onChange={(nv) => setVal(n.id, { imp: nv })} />
          <span className="flex-none text-right" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: n.color, width: 16 }}>{v.imp}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="flex-none" style={{ fontSize: 10, color: 'var(--muted)', width: 68 }}>удовлетвор.</span>
          <MiniSlider value={v.sat} color={satColor(v.sat)} aria={`${n.text} — удовлетворённость`} onChange={(nv) => setVal(n.id, { sat: nv })} />
          <span className="flex-none text-right" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: satColor(v.sat), width: 16 }}>{v.sat}</span>
        </div>
      </div>
    )
  }

  // ─── список ───
  const renderList = () => (
    <div>
      {deficits.length > 0 && (
        <section className="rounded-2xl mb-3 px-3 py-2.5" style={{ background: 'var(--surface)', border: '1px solid rgba(239,68,68,0.35)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: 0.3 }}>ЗОНА ДЕФИЦИТА</p>
          <p className="mt-0.5" style={{ fontSize: 11, color: 'var(--muted)' }}>
            важно, но не закрыто — отсюда растут эмоции и напряжение
          </p>
          {deficits.slice(0, 3).map(({ n, v, d }) => (
            <div key={n.id} className="flex items-center gap-2 mt-1.5">
              <span className="flex-none w-2 h-2 rounded-full" style={{ background: n.color }} />
              <span className="flex-1 min-w-0 truncate" style={{ fontSize: 12, color: 'var(--text)' }}>{n.text}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                {v.sat}/{v.imp}
              </span>
              <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#ef4444' }}>−{d}</span>
            </div>
          ))}
        </section>
      )}

      {NEED_CATEGORIES.map((cat, ci) => {
        const open = openCats.has(ci)
        const catNeeds = needs.filter((n) => n.catIndex === ci)
        const touched = catNeeds.filter((n) => vals[n.id]).length
        const catDeficit = catNeeds.reduce((a, n) => a + deficitOf(vals[n.id]), 0)
        return (
          <section key={ci} className="rounded-2xl mb-2 overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <button className="w-full flex items-center gap-2 px-3 py-2.5" onClick={() => toggleCat(ci)}>
              <ChevronDown
                size={15}
                strokeWidth={1.8}
                className="flex-none transition-transform"
                style={{ color: 'var(--muted)', transform: open ? 'rotate(180deg)' : 'none' }}
              />
              <span className="flex-1 min-w-0 text-left" style={{ fontSize: 13, fontWeight: 600, color: cat.color }}>
                {cat.name}
              </span>
              {catDeficit > 0 && (
                <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
                  −{catDeficit}
                </span>
              )}
              <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                {touched}/{catNeeds.length}
              </span>
            </button>
            {open && (
              <>
                {catNeeds.map(renderNeed)}
                {/* своя потребность */}
                <div className="px-3 py-2" style={{ borderTop: '1px solid var(--line)' }}>
                  {addCat === ci ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={addText}
                        onChange={(e) => setAddText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addCustom(ci) }}
                        placeholder="Название потребности"
                        className="flex-1 min-w-0 rounded-lg px-2 outline-none"
                        style={{ height: 30, background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 12 }}
                      />
                      <button onClick={() => addCustom(ci)} className="flex-none grid place-items-center rounded-lg" style={{ width: 30, height: 30, background: 'var(--accent)', color: 'var(--on-fill)' }} aria-label="Добавить">
                        <Plus size={14} strokeWidth={2.2} />
                      </button>
                      <button onClick={() => { setAddCat(null); setAddText('') }} className="flex-none grid place-items-center rounded-lg" style={{ width: 30, height: 30, background: 'var(--surface-2)', color: 'var(--muted)' }} aria-label="Отмена">
                        <X size={14} strokeWidth={2} />
                      </button>
                    </div>
                  ) : (
                    <button className="flex items-center gap-1.5" onClick={() => setAddCat(ci)} style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      <Plus size={13} strokeWidth={2} /> своя потребность
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        )
      })}
    </div>
  )

  // ─── карта: значимость (вертикаль) × удовлетворённость (горизонталь) ───
  const SIZE = 460
  const PAD = 46
  const plot = (imp: number, sat: number) => ({
    x: PAD + (sat / 10) * (SIZE - PAD * 2),
    y: SIZE - PAD - (imp / 10) * (SIZE - PAD * 2),
  })

  const renderMap = () => {
    const marked = needs.filter((n) => vals[n.id])
    return (
      <section className="rounded-2xl p-2" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-auto block">
          {/* квадранты */}
          <rect x={PAD} y={PAD} width={(SIZE - PAD * 2) / 2} height={(SIZE - PAD * 2) / 2} fill="rgba(239,68,68,0.06)" />
          <rect x={SIZE / 2} y={PAD} width={(SIZE - PAD * 2) / 2} height={(SIZE - PAD * 2) / 2} fill="rgba(168,85,247,0.07)" />
          {/* сетка */}
          {[0, 2, 4, 6, 8, 10].map((t) => {
            const x = PAD + (t / 10) * (SIZE - PAD * 2)
            const y = SIZE - PAD - (t / 10) * (SIZE - PAD * 2)
            return (
              <g key={t}>
                <line x1={x} y1={PAD} x2={x} y2={SIZE - PAD} stroke="var(--line)" strokeWidth={0.6} opacity={0.6} />
                <line x1={PAD} y1={y} x2={SIZE - PAD} y2={y} stroke="var(--line)" strokeWidth={0.6} opacity={0.6} />
                <text x={x} y={SIZE - PAD + 14} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{t}</text>
                <text x={PAD - 8} y={y + 3} textAnchor="end" style={{ fontSize: 9, fill: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{t}</text>
              </g>
            )
          })}
          {/* подписи осей и квадрантов */}
          <text x={SIZE / 2} y={SIZE - 8} textAnchor="middle" style={{ fontSize: 11, fontWeight: 600, fill: 'var(--muted)' }}>удовлетворённость →</text>
          <text x={14} y={SIZE / 2} textAnchor="middle" transform={`rotate(-90 14 ${SIZE / 2})`} style={{ fontSize: 11, fontWeight: 600, fill: 'var(--muted)' }}>значимость →</text>
          <text x={PAD + 6} y={PAD + 14} style={{ fontSize: 10.5, fontWeight: 700, fill: '#ef4444', opacity: 0.8 }}>ДЕФИЦИТ</text>
          <text x={SIZE - PAD - 6} y={PAD + 14} textAnchor="end" style={{ fontSize: 10.5, fontWeight: 700, fill: '#a855f7', opacity: 0.8 }}>РЕСУРС</text>

          {/* точки потребностей */}
          {marked.map((n) => {
            const v = valOf(n.id)
            const p = plot(v.imp, v.sat)
            const d = deficitOf(v)
            const r = 6 + d * 1.2
            const isSel = selected?.id === n.id
            return (
              <g key={n.id} onClick={() => setSelected(isSel ? null : n)} style={{ cursor: 'pointer' }}>
                <circle cx={p.x} cy={p.y} r={Math.max(r, 14)} fill="transparent" />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={n.color}
                  opacity={0.85}
                  stroke={isSel ? 'var(--light)' : 'var(--bg)'}
                  strokeWidth={isSel ? 2 : 1.2}
                />
                <text x={p.x} y={p.y + r + 9} textAnchor="middle" pointerEvents="none" style={{ fontSize: 8.5, fill: 'var(--muted)' }}>
                  {wrapText(n.text, 12).slice(0, 2).map((line, li, arr) => (
                    <tspan key={li} x={p.x} dy={li === 0 ? (arr.length - 1) * -5 : 10}>{line}</tspan>
                  ))}
                </text>
              </g>
            )
          })}
          {marked.length === 0 && (
            <text x={SIZE / 2} y={SIZE / 2} textAnchor="middle" style={{ fontSize: 12, fill: 'var(--muted)' }}>
              отметь потребности в списке — они появятся на карте
            </text>
          )}
        </svg>

        {/* выбранная точка */}
        {selected && vals[selected.id] && (
          <div className="mt-2 rounded-xl px-3 py-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2">
              <span className="flex-none w-2.5 h-2.5 rounded-full" style={{ background: selected.color }} />
              <p className="flex-1 min-w-0" style={{ fontSize: 12, color: 'var(--light)' }}>{selected.text}</p>
              {deficitOf(valOf(selected.id)) > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444' }}>дефицит {deficitOf(valOf(selected.id))}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex-none" style={{ fontSize: 10, color: 'var(--muted)', width: 68 }}>значимость</span>
              <MiniSlider value={valOf(selected.id).imp} color={selected.color} aria="значимость" onChange={(nv) => setVal(selected.id, { imp: nv })} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: selected.color, width: 16 }}>{valOf(selected.id).imp}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex-none" style={{ fontSize: 10, color: 'var(--muted)', width: 68 }}>удовлетвор.</span>
              <MiniSlider value={valOf(selected.id).sat} color={satColor(valOf(selected.id).sat)} aria="удовлетворённость" onChange={(nv) => setVal(selected.id, { sat: nv })} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: satColor(valOf(selected.id).sat), width: 16 }}>{valOf(selected.id).sat}</span>
            </div>
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="px-4 pt-5 pb-24">
      <div className="grid grid-cols-2 gap-1 rounded-xl p-1 mb-3" style={{ background: 'var(--surface-2)' }}>
        {(
          [
            { id: 'list', label: 'Список' },
            { id: 'map', label: 'Карта' },
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
      {tab === 'list' ? renderList() : renderMap()}
    </div>
  )
}
