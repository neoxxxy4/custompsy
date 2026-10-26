import { useMemo, useRef, useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { uid, useLS } from '../views/practice/store'
import { valueHex, wrapText } from './mapLogic'

// ─── эмоции (как в «Терапии») ───
const EMO = [
  { id: 'trauma', label: 'Травма', color: '#ef4444' },
  { id: 'offense', label: 'Обида', color: '#f97316' },
  { id: 'shame', label: 'Стыд', color: '#eab308' },
  { id: 'guilt', label: 'Вина', color: '#8b5cf6' },
  { id: 'fear', label: 'Страх', color: '#06b6d4' },
  { id: 'anger', label: 'Гнев', color: '#ec4899' },
] as const
type EmoId = (typeof EMO)[number]['id']
const emoById = (id: EmoId) => EMO.find((e) => e.id === id) ?? EMO[0]

interface Situation {
  id: string
  text: string
  emo: EmoId
  sign: number // значимость 0–12
}
interface Person {
  id: string
  name: string
  situations: Situation[]
}

// вес личности = сумма значимостей всех ситуаций
const weightOf = (p: Person) => p.situations.reduce((a, s) => a + s.sign, 0)
// доминирующая эмоция = категория с макс. суммой значимостей
const dominantEmo = (p: Person) => {
  let best: EmoId | null = null
  let bestSum = 0
  for (const e of EMO) {
    const sum = p.situations.filter((s) => s.emo === e.id).reduce((a, s) => a + s.sign, 0)
    if (sum > bestSum) {
      bestSum = sum
      best = e.id
    }
  }
  return best ? emoById(best) : null
}
// цвет веса по делениям самооценки, инвертировано: 0 = фиолетовый, 12+ = красный
const weightColor = (w: number) => (w <= 0 ? 'var(--muted)' : valueHex(false, 12 - Math.min(12, Math.round(w))))

// ─── геометрия графа ───
const VIEWBOX = 800
const CX = VIEWBOX / 2
const CY = VIEWBOX / 2
const polar = (a: number, r: number) => ({ x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r })

// ─── слайдер значимости 0–12 ───
function SignSlider({ value, color, onChange }: { value: number; color: string; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const updateFromClientX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const next = Math.max(0, Math.min(12, Math.round(((clientX - rect.left) / rect.width) * 12)))
    if (next !== value) onChange(next)
  }
  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Значимость"
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

// ─── форма добавления ситуации ───
function SituationForm({ onAdd }: { onAdd: (text: string, emo: EmoId, sign: number) => void }) {
  const [text, setText] = useState('')
  const [emo, setEmo] = useState<EmoId>('trauma')
  const [sign, setSign] = useState(6)
  const emoMeta = emoById(emo)
  const submit = () => {
    const t = text.trim()
    if (!t) return
    onAdd(t, emo, sign)
    setText('')
  }
  return (
    <div className="rounded-xl p-2" style={{ background: 'var(--surface-2)' }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Новая ситуация..."
        className="w-full rounded-lg px-2.5 py-2 outline-none"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)', fontSize: 13, color: 'var(--text)' }}
      />
      <div className="flex flex-wrap gap-1 mt-2">
        {EMO.map((e) => (
          <button
            key={e.id}
            onClick={() => setEmo(e.id)}
            className="rounded-lg px-2 py-1"
            style={{
              fontSize: 11,
              fontWeight: 600,
              background: emo === e.id ? e.color : 'var(--surface)',
              color: emo === e.id ? '#fff' : 'var(--muted)',
              border: `1px solid ${emo === e.id ? e.color : 'var(--line)'}`,
            }}
          >
            {e.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1">
          <SignSlider value={sign} color={emoMeta.color} onChange={setSign} />
        </div>
        <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: emoMeta.color }}>
          {sign}
        </span>
      </div>
      <button
        onClick={submit}
        className="w-full mt-2 rounded-lg py-2 grid place-items-center"
        style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 12, fontWeight: 600 }}
      >
        Добавить ситуацию
      </button>
    </div>
  )
}

function SituationRow({ s, onDelete }: { s: Situation; onDelete: () => void }) {
  const emo = emoById(s.emo)
  return (
    <div className="flex items-center gap-2 py-1.5" style={{ borderTop: '1px solid var(--line)' }}>
      <span className="flex-none w-2 h-2 rounded-full" style={{ background: emo.color }} />
      <span className="flex-1 min-w-0" style={{ fontSize: 12, color: 'var(--text)' }}>{s.text}</span>
      <span className="flex-none" style={{ fontSize: 10, color: 'var(--muted)' }}>{emo.label}</span>
      <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: emo.color }}>
        {s.sign}
      </span>
      <button onClick={onDelete} className="flex-none grid place-items-center rounded-lg" style={{ width: 24, height: 24, color: 'var(--muted)' }} aria-label="Удалить ситуацию">
        <Trash2 size={13} strokeWidth={1.8} />
      </button>
    </div>
  )
}

export default function PsySocialView() {
  const [people, setPeople] = useLS<Person[]>('aod4-psysoc-v1', [])
  const [tab, setTab] = useState<'graph' | 'list'>('graph')
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  const sorted = useMemo(() => [...people].sort((a, b) => weightOf(b) - weightOf(a)), [people])
  const maxW = Math.max(1, ...people.map(weightOf))
  const center = sorted[0] ?? null
  const selected = people.find((p) => p.id === selectedId) ?? null

  const addPerson = () => {
    const name = newName.trim()
    if (!name) return
    setPeople((ps) => [...ps, { id: uid(), name, situations: [] }])
    setNewName('')
  }
  const removePerson = (id: string) => {
    setPeople((ps) => ps.filter((p) => p.id !== id))
    if (selectedId === id) setSelectedId(null)
  }
  const addSituation = (pid: string, text: string, emo: EmoId, sign: number) =>
    setPeople((ps) => ps.map((p) => (p.id === pid ? { ...p, situations: [...p.situations, { id: uid(), text, emo, sign }] } : p)))
  const removeSituation = (pid: string, sid: string) =>
    setPeople((ps) => ps.map((p) => (p.id === pid ? { ...p, situations: p.situations.filter((s) => s.id !== sid) } : p)))
  const toggleOpen = (id: string) =>
    setOpenIds((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // ─── граф: центр = самая тяжёлая личность ───
  const renderGraph = () => {
    if (people.length === 0)
      return (
        <section className="rounded-2xl px-3 py-6 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Добавьте людей во вкладке «Люди»</p>
        </section>
      )
    const others = sorted.slice(1)
    return (
      <section className="rounded-2xl p-2" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} preserveAspectRatio="xMidYMid meet" className="w-full h-auto block">
          {/* линии центр → человек */}
          {others.map((p, i) => {
            const a = -Math.PI / 2 + (i * Math.PI * 2) / others.length
            const norm = weightOf(p) / maxW
            const pos = polar(a, 170 + (1 - norm) * 160)
            const dom = dominantEmo(p)
            return (
              <line
                key={`l-${p.id}`}
                x1={CX}
                y1={CY}
                x2={pos.x}
                y2={pos.y}
                stroke={dom?.color ?? 'var(--muted)'}
                strokeWidth={1.5}
                opacity={0.2 + norm * 0.5}
              />
            )
          })}

          {/* центр — самая тяжёлая личность */}
          {center &&
            (() => {
              const w = weightOf(center)
              const dom = dominantEmo(center)
              const r = 34 + (w / maxW) * 10
              return (
                <g onClick={() => setSelectedId(selectedId === center.id ? null : center.id)} style={{ cursor: 'pointer' }}>
                  <circle cx={CX} cy={CY} r={r} fill={dom?.color ?? 'var(--surface-2)'} stroke="var(--bg)" strokeWidth={2.5} opacity={0.95} />
                  <text x={CX} y={CY - 2} textAnchor="middle" dominantBaseline="middle" pointerEvents="none" style={{ fontSize: 15, fontWeight: 700, fill: '#fff', fontFamily: 'var(--font-mono)' }}>
                    {w}
                  </text>
                  <text x={CX} y={CY + r + 16} textAnchor="middle" pointerEvents="none" style={{ fontSize: 13, fontWeight: 700, fill: 'var(--light)', fontFamily: 'var(--font-body)' }}>
                    {wrapText(center.name, 14).map((line, li, arr) => (
                      <tspan key={li} x={CX} dy={li === 0 ? (arr.length - 1) * -7 : 15}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              )
            })()}

          {/* остальные: ближе к центру = тяжелее */}
          {others.map((p, i) => {
            const a = -Math.PI / 2 + (i * Math.PI * 2) / others.length
            const w = weightOf(p)
            const norm = w / maxW
            const pos = polar(a, 170 + (1 - norm) * 160)
            const dom = dominantEmo(p)
            const r = 15 + norm * 14
            const isSel = selectedId === p.id
            return (
              <g key={p.id} onClick={() => setSelectedId(isSel ? null : p.id)} style={{ cursor: 'pointer' }}>
                <circle cx={pos.x} cy={pos.y} r={Math.max(r, 14)} fill="transparent" />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={dom?.color ?? 'var(--surface-2)'}
                  opacity={w > 0 ? 0.9 : 0.5}
                  stroke={isSel ? 'var(--light)' : 'var(--bg)'}
                  strokeWidth={isSel ? 2 : 1.2}
                />
                <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle" pointerEvents="none" style={{ fontSize: 11, fontWeight: 700, fill: '#fff', fontFamily: 'var(--font-mono)' }}>
                  {w}
                </text>
                <text x={pos.x} y={pos.y + r + 11} textAnchor="middle" pointerEvents="none" style={{ fontSize: 10.5, fill: 'var(--text)', fontFamily: 'var(--font-body)' }}>
                  {wrapText(p.name, 12).map((line, li, arr) => (
                    <tspan key={li} x={pos.x} dy={li === 0 ? (arr.length - 1) * -6 : 12}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            )
          })}
        </svg>

        {/* легенда эмоций */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-2 pb-1">
          {EMO.map((e) => (
            <span key={e.id} className="flex items-center gap-1" style={{ fontSize: 10, color: 'var(--muted)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: e.color }} />
              {e.label}
            </span>
          ))}
        </div>

        {/* выбранный человек */}
        {selected && (
          <div className="mt-2 rounded-xl px-3 py-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex-none w-2.5 h-2.5 rounded-full" style={{ background: dominantEmo(selected)?.color ?? 'var(--muted)' }} />
              <p className="flex-1 min-w-0" style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>{selected.name}</p>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: weightColor(weightOf(selected)) }}>
                {weightOf(selected)}
              </span>
              <button onClick={() => removePerson(selected.id)} className="flex-none grid place-items-center rounded-lg" style={{ width: 26, height: 26, color: '#ef4444' }} aria-label="Удалить человека">
                <Trash2 size={14} strokeWidth={1.8} />
              </button>
            </div>
            {selected.situations.map((s) => (
              <SituationRow key={s.id} s={s} onDelete={() => removeSituation(selected.id, s.id)} />
            ))}
            <div className="mt-2">
              <SituationForm onAdd={(t, e, sn) => addSituation(selected.id, t, e, sn)} />
            </div>
          </div>
        )}
      </section>
    )
  }

  // ─── список людей ───
  const renderList = () => (
    <div>
      <div className="rounded-2xl p-3 mb-3 flex items-center gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addPerson()}
          placeholder="Новый человек..."
          className="flex-1 min-w-0 rounded-lg px-2.5 py-2 outline-none"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 13, color: 'var(--text)' }}
        />
        <button onClick={addPerson} className="flex-none grid place-items-center rounded-xl" style={{ width: 36, height: 36, background: 'var(--accent)', color: 'var(--on-fill)' }} aria-label="Добавить человека">
          <Plus size={18} strokeWidth={2} />
        </button>
      </div>

      {sorted.map((p) => {
        const open = openIds.has(p.id)
        const w = weightOf(p)
        const dom = dominantEmo(p)
        return (
          <section key={p.id} className="rounded-2xl mb-2 overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <button className="w-full flex items-center gap-2 px-3 py-2.5" onClick={() => toggleOpen(p.id)}>
              <ChevronDown size={15} strokeWidth={1.8} className="flex-none transition-transform" style={{ color: 'var(--muted)', transform: open ? 'rotate(180deg)' : 'none' }} />
              <span className="flex-none w-2.5 h-2.5 rounded-full" style={{ background: dom?.color ?? 'var(--surface-2)' }} />
              <span className="flex-1 min-w-0 text-left" style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>{p.name}</span>
              {center?.id === p.id && w > 0 && (
                <span className="flex-none rounded-lg px-1.5 py-0.5" style={{ fontSize: 10, fontWeight: 700, background: 'var(--active-bg)', color: 'var(--accent)' }}>
                  Центр
                </span>
              )}
              <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: weightColor(w) }}>
                {w}
              </span>
            </button>
            {open && (
              <div className="px-3 pb-3" style={{ borderTop: '1px solid var(--line)' }}>
                {p.situations.length === 0 && (
                  <p className="pt-2" style={{ fontSize: 12, color: 'var(--muted)' }}>Ситуаций пока нет</p>
                )}
                {p.situations.map((s) => (
                  <SituationRow key={s.id} s={s} onDelete={() => removeSituation(p.id, s.id)} />
                ))}
                <div className="mt-2">
                  <SituationForm onAdd={(t, e, sn) => addSituation(p.id, t, e, sn)} />
                </div>
                <button
                  onClick={() => removePerson(p.id)}
                  className="w-full mt-2 rounded-lg py-1.5"
                  style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', border: '1px solid var(--line)' }}
                >
                  Удалить человека
                </button>
              </div>
            )}
          </section>
        )
      })}
      {people.length === 0 && (
        <p className="text-center pt-4" style={{ fontSize: 13, color: 'var(--muted)' }}>
          Добавьте первого человека — вес считается как сумма значимостей ситуаций
        </p>
      )}
    </div>
  )

  return (
    <div className="px-4 pt-5 pb-24">
      <div className="grid grid-cols-2 gap-1 rounded-xl p-1 mb-3" style={{ background: 'var(--surface-2)' }}>
        {(
          [
            { id: 'graph', label: 'Граф' },
            { id: 'list', label: 'Люди' },
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
      {tab === 'graph' ? renderGraph() : renderList()}
    </div>
  )
}
