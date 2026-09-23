import { useMemo, useState } from 'react'
import { Flame, RefreshCw, Sparkles } from 'lucide-react'
import {
  awardXp,
  effScore,
  GRAPH_NODES,
  QUEST_TITLES,
  readXp,
  todayKey,
  useLS,
  type GraphMeasure,
  type Quest,
} from '../views/practice/store'
import { ScreenHeader } from './ui'
import { useToast } from './utils'

// экран «Граф»: узлы самооценки с дельтами, перезамер, динамика, квест недели
export default function GraphViewMobile() {
  const [history, setHistory] = useLS<GraphMeasure[]>('aod2-graph-history', [])
  const [quest, setQuest] = useLS<Quest | null>('aod2-quest', null)
  const [measureOpen, setMeasureOpen] = useState(false)
  const [xpTick, setXpTick] = useState(0)
  const toast = useToast()

  const xp = useMemo(() => readXp(), [xpTick])
  const current = history.length > 0 ? history[history.length - 1] : null
  const prev = history.length > 1 ? history[history.length - 2] : null

  const eff = (id: string) => effScore(id, current?.values[id] ?? 5)
  const delta = (id: string) =>
    prev ? effScore(id, current?.values[id] ?? 5) - effScore(id, prev.values[id] ?? 5) : 0

  // самый слабый узел — кандидат в квест
  const weakest = useMemo(() => {
    if (!current) return null
    return GRAPH_NODES.reduce((a, b) => (eff(a.id) <= eff(b.id) ? a : b))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  // раскладка узлов по кругу
  const layout = useMemo(() => {
    const CX = 180
    const CY = 168
    const R = 118
    return GRAPH_NODES.map((n, i) => {
      const a = ((-90 + i * 45) * Math.PI) / 180
      return { ...n, x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) }
    })
  }, [])

  const nodeColor = (id: string) => {
    const e = eff(id)
    if (e <= 4) return '#e05555'
    if (e <= 6) return 'var(--accent)'
    return '#4FAE4E'
  }

  const createQuest = (excludeId?: string) => {
    if (!current) {
      toast.show('Сначала сделай замер')
      return
    }
    const sorted = [...GRAPH_NODES].sort((a, b) => eff(a.id) - eff(b.id))
    const node = sorted.find((n) => n.id !== excludeId) ?? sorted[0]
    setQuest({ nodeId: node.id, title: QUEST_TITLES[node.id] ?? 'Практика дня', days: [], created: todayKey() })
  }

  const markQuestToday = () => {
    if (!quest) return
    const tk = todayKey()
    if (quest.days.includes(tk)) return
    const days = [...quest.days, tk]
    awardXp(20)
    if (days.length >= 7) {
      awardXp(140)
      setQuest(null)
      toast.show('Квест закрыт! +160 XP')
    } else {
      setQuest({ ...quest, days })
      toast.show('+20 XP')
    }
    setXpTick((t) => t + 1)
  }

  const saveMeasure = (values: Record<string, number>) => {
    const tk = todayKey()
    setHistory((h) => {
      const rest = h.filter((m) => m.date !== tk)
      return [...rest, { date: tk, values }]
    })
    awardXp(15)
    setXpTick((t) => t + 1)
    toast.show('Замер сохранён · +15 XP')
  }

  const questNode = quest ? GRAPH_NODES.find((n) => n.id === quest.nodeId) : null

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <ScreenHeader
        title="Мой граф"
        sub={current ? `замер ${current.date.split('-').reverse().slice(0, 2).join('.')}` : 'ещё без замеров'}
        right={
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1 px-2.5 py-1 rounded-full"
              style={{ border: '1px solid var(--line-strong)', fontSize: 12, color: 'var(--f-discipline)' }}
            >
              <Sparkles size={12} strokeWidth={2} />
              {xp.total} XP
            </span>
            <button
              onClick={() => setMeasureOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 600 }}
            >
              <RefreshCw size={13} strokeWidth={2} />
              Перезамер
            </button>
          </div>
        }
      />

      {!current ? (
        <section
          className="rounded-2xl p-6 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          <p style={{ fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
            Граф самооценки — это пульс по 8 узлам: сон, тревога, энергия и т.д. Сделай первый замер, раз в неделю —
            перезамер, а слабый узел превратится в квест.
          </p>
          <button
            onClick={() => setMeasureOpen(true)}
            className="mt-4 px-5 py-2.5 rounded-xl"
            style={{ background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600 }}
          >
            Первый замер
          </button>
        </section>
      ) : (
        <>
          {/* граф */}
          <section
            className="rounded-2xl mb-3 overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
          >
            <svg viewBox="0 0 360 336" className="w-full block">
              {layout.map((n, i) => {
                const next = layout[(i + 1) % layout.length]
                return (
                  <g key={`l-${n.id}`}>
                    <line x1={180} y1={168} x2={n.x} y2={n.y} stroke="var(--line)" strokeWidth={1} />
                    <line x1={n.x} y1={n.y} x2={next.x} y2={next.y} stroke="var(--line)" strokeWidth={0.8} />
                  </g>
                )
              })}
              <circle cx={180} cy={168} r={14} fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth={1} />
              <text x={180} y={172} textAnchor="middle" fontSize={10} fill="var(--muted)">
                Я
              </text>
              {layout.map((n) => {
                const v = current.values[n.id] ?? 5
                const e = eff(n.id)
                const d = delta(n.id)
                const r = 17 + e * 2
                const weak = weakest?.id === n.id
                return (
                  <g key={n.id}>
                    {weak && <circle cx={n.x} cy={n.y} r={r + 5} fill="none" stroke="#e05555" strokeWidth={1} opacity={0.6} />}
                    <circle cx={n.x} cy={n.y} r={r} fill="var(--surface-2)" stroke={nodeColor(n.id)} strokeWidth={1.6} />
                    <text x={n.x} y={n.y + 1} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--light)">
                      {v}
                    </text>
                    <text x={n.x} y={n.y + r + 12} textAnchor="middle" fontSize={9.5} fill="var(--muted)">
                      {n.label}
                    </text>
                    {d !== 0 && (
                      <text
                        x={n.x}
                        y={n.y + r + 23}
                        textAnchor="middle"
                        fontSize={9}
                        fontWeight={700}
                        fill={d > 0 ? '#4FAE4E' : '#e05555'}
                      >
                        {d > 0 ? `+${d}` : d}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          </section>

          {/* динамика */}
          <section
            className="rounded-2xl p-4 mb-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
          >
            <h3 className="mb-2" style={{ fontSize: 14, fontWeight: 600, color: 'var(--light)' }}>
              Динамика замеров
            </h3>
            {GRAPH_NODES.map((n) => (
              <div key={n.id} className="flex items-center gap-2.5 py-1.5">
                <span className="w-20 truncate" style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                  {n.label}
                </span>
                <Spark history={history} nodeId={n.id} color={nodeColor(n.id)} />
                <span
                  className="w-6 text-right"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--light)' }}
                >
                  {current.values[n.id] ?? '—'}
                </span>
                <DeltaChip d={delta(n.id)} />
              </div>
            ))}
            {history.length < 2 && (
              <p className="pt-1" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                Дельты появятся после второго замера
              </p>
            )}
          </section>

          {/* квест недели */}
          <section
            className="rounded-2xl p-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--f-metacog)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="flex items-center gap-1.5" style={{ fontSize: 14, fontWeight: 600, color: 'var(--light)' }}>
                <Flame size={15} strokeWidth={2} style={{ color: '#ff9f43' }} />
                Квест недели
              </h3>
              {quest && (
                <button onClick={() => createQuest(quest.nodeId)} style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Другой квест
                </button>
              )}
            </div>
            {quest ? (
              <>
                <p style={{ fontSize: 12, color: '#e05555' }}>
                  Просел узел: {questNode?.label ?? quest.nodeId}
                </p>
                <p className="mt-1" style={{ fontSize: 18, fontWeight: 700, color: 'var(--light)' }}>
                  {quest.title}
                </p>
                <div className="flex items-center gap-1.5 my-3">
                  {Array.from({ length: 7 }, (_, i) => (
                    <span
                      key={i}
                      className="w-6 h-6 rounded-full grid place-items-center"
                      style={{
                        background: i < quest.days.length ? '#4FAE4E' : 'transparent',
                        border: `1.5px solid ${i < quest.days.length ? '#4FAE4E' : 'var(--line-strong)'}`,
                        color: '#fff',
                        fontSize: 11,
                      }}
                    >
                      {i < quest.days.length ? '✓' : ''}
                    </span>
                  ))}
                  <span className="ml-1" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#4FAE4E' }}>
                    {quest.days.length}/7
                  </span>
                </div>
                <button
                  onClick={markQuestToday}
                  disabled={quest.days.includes(todayKey())}
                  className="w-full py-3 rounded-xl disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: '#fff', fontSize: 14.5, fontWeight: 600 }}
                >
                  {quest.days.includes(todayKey()) ? 'Сегодня отмечено' : 'Отметить сегодня · +20 XP'}
                </button>
              </>
            ) : (
              <button
                onClick={() => createQuest()}
                className="w-full mt-2 py-3 rounded-xl"
                style={{ border: '1px dashed var(--f-metacog)', color: 'var(--f-metacog)', fontSize: 14, fontWeight: 500 }}
              >
                Создать квест из слабого узла{weakest ? `: ${weakest.label}` : ''}
              </button>
            )}
          </section>
        </>
      )}

      {measureOpen && (
        <MeasureSheet initial={current} onSave={saveMeasure} onClose={() => setMeasureOpen(false)} />
      )}
      {toast.node}
    </div>
  )
}

// спарклайн значений узла по истории замеров
function Spark({ history, nodeId, color }: { history: GraphMeasure[]; nodeId: string; color: string }) {
  const vals = history.slice(-8).map((m) => m.values[nodeId]).filter((v): v is number => typeof v === 'number')
  if (vals.length < 2) return <span className="flex-1" />
  const W = 90
  const H = 16
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - ((v - 1) / 9) * (H - 2) - 1}`).join(' ')
  return (
    <svg width={W} height={H} className="flex-1">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  )
}

function DeltaChip({ d }: { d: number }) {
  if (d === 0) return <span className="w-8" />
  return (
    <span
      className="w-8 text-center rounded-md"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10.5,
        fontWeight: 700,
        color: d > 0 ? '#4FAE4E' : '#e05555',
        background: 'var(--surface-2)',
      }}
    >
      {d > 0 ? `+${d}` : d}
    </span>
  )
}

// шторка перезамера: 8 слайдеров по узлам
function MeasureSheet({
  initial,
  onSave,
  onClose,
}: {
  initial: GraphMeasure | null
  onSave: (values: Record<string, number>) => void
  onClose: () => void
}) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(GRAPH_NODES.map((n) => [n.id, initial?.values[n.id] ?? 5]))
  )

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl px-5 pt-3 max-h-[85vh] overflow-y-auto"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderBottom: 'none',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
        }}
      >
        <div className="grid place-items-center pb-2">
          <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
        </div>
        <p className="text-center mb-1" style={{ fontSize: 18, fontWeight: 700, color: 'var(--light)' }}>
          Замер недели
        </p>
        <p className="text-center mb-3" style={{ fontSize: 12, color: 'var(--muted)' }}>
          честно, как есть · 1–10
        </p>
        {GRAPH_NODES.map((n) => (
          <div key={n.id} className="flex items-center gap-3 py-1.5">
            <span className="w-24" style={{ fontSize: 13.5, color: 'var(--text-2)' }}>
              {n.label}
              {n.invert ? ' ↓' : ''}
            </span>
            <input
              type="range"
              min={1}
              max={10}
              value={values[n.id]}
              className="force-slider flex-1"
              style={{ ['--slider-color' as string]: 'var(--accent)' }}
              onChange={(e) => setValues((v) => ({ ...v, [n.id]: Number(e.target.value) }))}
            />
            <span
              className="w-6 text-right"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}
            >
              {values[n.id]}
            </span>
          </div>
        ))}
        <button
          onClick={() => {
            onSave(values)
            onClose()
          }}
          className="w-full mt-3 py-3.5 rounded-xl"
          style={{ background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 600 }}
        >
          Сохранить замер · +15 XP
        </button>
      </div>
    </div>
  )
}
