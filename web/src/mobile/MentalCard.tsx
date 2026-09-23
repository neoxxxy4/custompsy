import { useMemo, useState } from 'react'
import { Brain, CloudRain, Flame, Plus, Smile, Zap } from 'lucide-react'
import {
  awardXp,
  bumpStreak,
  dayKey,
  readXp,
  seedPractices,
  uid,
  useLS,
  type CheckIn,
  type Practice,
} from '../views/practice/store'
import CheckInSheet from './CheckInSheet'
import { MCheck } from './ui'
import { useLongPress } from './useLongPress'
import { useToast } from './utils'

// ментальный блок «Сегодня»: утренний чек-ин (сводка + спарклайн недели) + практики дня
export default function MentalCard({ dateKey, readOnly }: { dateKey: string; readOnly: boolean }) {
  const [checkin, setCheckin] = useLS<CheckIn | null>(`aod2-checkin-${dateKey}`, null)
  const [practices, setPractices] = useLS<Practice[]>('aod2-mental-practices', seedPractices())
  const [doneIds, setDoneIds] = useLS<string[]>(`aod2-mental-done-${dateKey}`, [])

  const [checkinOpen, setCheckinOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [xpTick, setXpTick] = useState(0)
  const toast = useToast()

  const streak = useMemo(() => readXp().streak, [xpTick])

  // спарклайн настроения за 7 дней (читаем ключи чек-инов напрямую)
  const weekMood = useMemo(() => {
    const pts: (number | null)[] = []
    for (let i = -6; i <= 0; i++) {
      try {
        const s = localStorage.getItem(`aod2-checkin-${dayKey(i)}`)
        pts.push(s ? ((JSON.parse(s) as CheckIn).mood ?? null) : null)
      } catch {
        pts.push(null)
      }
    }
    return pts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkin, dateKey])

  const spark = useMemo(() => {
    const vals = weekMood.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null)
    if (vals.length < 2) return null
    const W = 72
    const H = 22
    const pts = vals
      .map((p) => `${(p.i / 6) * W},${H - ((p.v - 1) / 9) * (H - 3) - 1.5}`)
      .join(' ')
    return (
      <svg width={W} height={H} className="flex-none">
        <polyline points={pts} fill="none" stroke="var(--f-metacog)" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    )
  }, [weekMood])

  const togglePractice = (id: string) => {
    if (readOnly) return
    const isDone = doneIds.includes(id)
    setDoneIds((ds) => (isDone ? ds.filter((d) => d !== id) : [...ds, id]))
    if (!isDone) {
      awardXp(10)
      setXpTick((t) => t + 1)
      toast.show('+10 XP')
    }
  }

  const removePractice = (id: string) => {
    if (readOnly) return
    if (!window.confirm('Убрать практику из списка?')) return
    setPractices((ps) => ps.filter((p) => p.id !== id))
    setDoneIds((ds) => ds.filter((d) => d !== id))
  }

  const addPractice = () => {
    const t = newTitle.trim()
    if (!t) return
    setPractices((ps) => [...ps, { id: uid(), title: t }])
    setNewTitle('')
    setAdding(false)
  }

  const doneCount = practices.filter((p) => doneIds.includes(p.id)).length

  return (
    <section
      className="rounded-2xl p-4 mb-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--f-metacog)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2
          className="flex items-center gap-2"
          style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--light)' }}
        >
          <Brain size={17} strokeWidth={1.8} style={{ color: 'var(--f-metacog)' }} />
          Ментальное
        </h2>
        {streak > 0 && (
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ border: '1px solid var(--line-strong)', fontSize: 11.5, color: 'var(--em-streak, #ff9f43)' }}
          >
            <Flame size={12} strokeWidth={2} />
            {streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'}
          </span>
        )}
      </div>

      {/* чек-ин */}
      {checkin ? (
        <div className="flex items-center gap-2 mb-3">
          {[
            { Icon: Smile, v: checkin.mood, color: '#4FAE4E' },
            { Icon: Zap, v: checkin.energy, color: '#eab308' },
            { Icon: CloudRain, v: checkin.anxiety, color: '#e05555' },
          ].map(({ Icon, v, color }, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--surface-2)', fontFamily: 'var(--font-mono)', fontSize: 13, color }}
            >
              <Icon size={13} strokeWidth={2} />
              {v}
            </span>
          ))}
          {checkin.word && (
            <span className="truncate" style={{ fontSize: 12, color: 'var(--muted)' }}>
              «{checkin.word}»
            </span>
          )}
          <span className="flex-1" />
          {spark}
        </div>
      ) : (
        !readOnly && (
          <button
            onClick={() => setCheckinOpen(true)}
            className="w-full mb-3 py-2.5 rounded-xl"
            style={{
              border: '1px dashed var(--f-metacog)',
              color: 'var(--f-metacog)',
              fontSize: 13.5,
              fontWeight: 500,
            }}
          >
            Пройти чек-ин · 10 сек
          </button>
        )
      )}

      {/* практики */}
      <div className="space-y-1">
        {practices.map((p) => (
          <PracticeRow
            key={p.id}
            practice={p}
            done={doneIds.includes(p.id)}
            onToggle={() => togglePractice(p.id)}
            onRemove={() => removePractice(p.id)}
          />
        ))}
      </div>

      {!readOnly &&
        (adding ? (
          <div className="flex items-center gap-2 mt-1.5">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addPractice()
                if (e.key === 'Escape') setAdding(false)
              }}
              onBlur={() => !newTitle.trim() && setAdding(false)}
              placeholder="Название практики"
              className="flex-1 bg-transparent outline-none rounded-lg px-3 py-2"
              style={{ border: '1px solid var(--line-strong)', fontSize: 13.5, color: 'var(--light)' }}
            />
            <button
              onClick={addPractice}
              className="px-3 py-2 rounded-lg"
              style={{ background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600 }}
            >
              Ок
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-1.5 flex w-full items-center gap-2 rounded-xl border border-dashed px-3 py-2"
            style={{ borderColor: 'var(--line-strong)', color: 'var(--muted)', fontSize: 13 }}
          >
            <Plus size={14} strokeWidth={1.8} />
            добавить практику
          </button>
        ))}

      {practices.length > 0 && (
        <p className="mt-2 text-right" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)' }}>
          {doneCount}/{practices.length}
        </p>
      )}

      {checkinOpen && (
        <CheckInSheet
          initial={checkin}
          onSave={(ci) => {
            setCheckin(ci)
            bumpStreak()
            awardXp(5)
            setXpTick((t) => t + 1)
            toast.show('+5 XP')
          }}
          onClose={() => setCheckinOpen(false)}
        />
      )}
      {toast.node}
    </section>
  )
}

// строка практики: чекбокс + название; long-press — удалить из списка
function PracticeRow({
  practice,
  done,
  onToggle,
  onRemove,
}: {
  practice: Practice
  done: boolean
  onToggle: () => void
  onRemove: () => void
}) {
  const lp = useLongPress(onRemove)
  return (
    <div className="flex items-center gap-2.5 py-2 px-1 rounded-xl select-none" {...lp}>
      <button onClick={onToggle} className="flex-none" title="Отметить">
        <MCheck done={done} color="var(--f-metacog)" size={18} />
      </button>
      <span
        className="flex-1 min-w-0 truncate"
        style={{
          fontSize: 14,
          color: done ? 'var(--muted)' : 'var(--text-2)',
          textDecoration: done ? 'line-through' : 'none',
          textDecorationColor: 'var(--line-strong)',
        }}
      >
        {practice.title}
        {practice.minutes ? ` · ${practice.minutes} мин` : ''}
      </span>
    </div>
  )
}
