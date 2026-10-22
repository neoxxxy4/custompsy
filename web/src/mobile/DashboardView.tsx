import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Flame,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { useLS } from '../views/practice/store'
import { WD } from '../lib/dayStats'
import { SOCIAL_LAYERS } from './socialTypes'
import ProgressRing from './ProgressRing'
import PathView from './PathView'
import { Card } from './ui'

const todayIso = () => new Date().toISOString().slice(0, 10)
const fmtKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const readLS = <T,>(key: string): T | null => {
  try {
    const s = localStorage.getItem(key)
    return s !== null ? (JSON.parse(s) as T) : null
  } catch {
    return null
  }
}

interface DayStat { done: number; total: number }

const statOfDay = (dateKey: string): DayStat => {
  const data = readLS<Record<string, { items?: { done: boolean }[]; lists?: unknown[] }>>(`aod4-today-data-${dateKey}`)
  if (!data) return { done: 0, total: 0 }
  let done = 0
  let total = 0
  const walkLists = (lists: unknown[]) => {
    for (const l of lists ?? []) {
      const list = l as { items?: { done: boolean }[]; lists?: unknown[] }
      total += list.items?.length ?? 0
      done += list.items?.filter((i) => i.done).length ?? 0
      if (list.lists) walkLists(list.lists)
    }
  }
  Object.values(data).forEach((block) => {
    total += block.items?.length ?? 0
    done += block.items?.filter((i) => i.done).length ?? 0
    if (block.lists) walkLists(block.lists)
  })
  return { done, total }
}

const allTimeStats = () => {
  let done = 0
  let total = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('aod4-today-data-')) continue
    const s = statOfDay(key.slice('aod4-today-data-'.length))
    done += s.done
    total += s.total
  }
  return { done, total }
}

const weekSparkline = () => {
  const days: { key: string; pct: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = fmtKey(d)
    const s = statOfDay(key)
    days.push({ key, pct: s.total ? s.done / s.total : 0 })
  }
  return days
}

const computeStreak = () => {
  let streak = 0
  for (let i = 1; i <= 365; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const s = statOfDay(fmtKey(d))
    if (s.total > 0 && s.done === s.total) streak++
    else if (s.total > 0) break
    // пустые дни не прерывают streak, но и не считаются
  }
  const today = statOfDay(todayIso())
  if (today.total > 0 && today.done === today.total) streak++
  return streak
}

const XP_PER_DONE = 10
const QUEST_REWARDS = { tasks: 50, balance: 30, streak: 100 }

export default function DashboardView() {
  const date = todayIso()
  const wdName = WD[new Date(date + 'T00:00:00').getDay()]
  const [todayData] = useLS<Record<string, { items: { done: boolean }[] }>>(`aod4-today-data-${date}`, {})
  const [people] = useLS<{ layer: string }[]>('aod4-social-people', [])
  const [balance] = useLS<{ values: number[] }>('aod4-balance', { values: [0, 0, 0, 0, 0, 0] })
  const [quests, setQuests] = useLS<Record<string, boolean>>(`aod4-daily-quests-${date}`, {})
  const [claimed, setClaimed] = useState<Record<string, boolean>>({})

  const taskStats = useMemo(() => {
    let done = 0
    let total = 0
    Object.values(todayData).forEach((block) => {
      total += block.items?.length ?? 0
      done += block.items?.filter((i) => i.done).length ?? 0
    })
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
  }, [todayData])

  const { done: allDone } = useMemo(allTimeStats, [todayData, date])
  const xp = allDone * XP_PER_DONE
  const level = Math.floor(xp / 100) + 1
  const xpInto = xp % 100

  const streak = useMemo(computeStreak, [todayData, date])
  const sparkline = useMemo(weekSparkline, [date])

  const peopleByLayer = useMemo(() => {
    const map: Record<string, number> = {}
    people.forEach((p) => { map[p.layer] = (map[p.layer] ?? 0) + 1 })
    return map
  }, [people])

  const balanceDone = balance.values.some((v) => v > 0)

  const questList = useMemo(() => [
    { id: 'tasks', label: 'Выполнить 5 дел', icon: Target, color: 'var(--ring-goals)', goal: 5, current: taskStats.done },
    { id: 'balance', label: 'Отметить самооценку', icon: Zap, color: 'var(--ring-checklists)', goal: 1, current: balanceDone ? 1 : 0 },
    { id: 'streak', label: '3 дня подряд', icon: Flame, color: 'var(--accent)', goal: 3, current: streak },
  ], [taskStats.done, balanceDone, streak])

  const claimQuest = (id: string) => {
    if (quests[id] || claimed[id]) return
    setQuests((q) => ({ ...q, [id]: true }))
    setClaimed((c) => ({ ...c, [id]: true }))
  }

  const claimedToday = useMemo(() => {
    let sum = 0
    questList.forEach((q) => {
      if (quests[q.id] || claimed[q.id]) sum += QUEST_REWARDS[q.id as keyof typeof QUEST_REWARDS]
    })
    return sum
  }, [quests, claimed, questList])

  const maxSpark = Math.max(...sparkline.map((d) => d.pct), 0.1)

  const [dashTab, setDashTab] = useState<'overview' | 'path'>('overview')

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <header className="mb-3">
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
          Дашборд
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          {date} · {wdName}
        </p>
        <div
          className="mt-3 flex gap-1 rounded-xl p-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          {([['overview', 'Обзор'], ['path', 'Путь']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setDashTab(id)}
              className="flex-1 rounded-lg py-1.5"
              style={{
                background: dashTab === id ? 'var(--accent)' : 'transparent',
                color: dashTab === id ? 'var(--on-fill)' : 'var(--muted)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {dashTab === 'path' ? (
        <PathView embedded />
      ) : (
      <div className="space-y-4">

      {/* Герой */}
      <Card title="" right={null}>
        <div className="flex items-center gap-3">
          <div
            className="flex-none grid place-items-center rounded-2xl text-lg font-bold"
            style={{ width: 56, height: 56, background: 'var(--accent)', color: 'var(--on-fill)' }}
          >
            {level}
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--light)' }}>Путник</p>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              Уровень {level} · {xp} XP
            </p>
            <div className="mt-1.5 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${xpInto}%`, background: 'var(--accent)' }}
              />
            </div>
          </div>
          <div className="flex-none text-center">
            <Flame size={22} strokeWidth={1.8} style={{ color: 'var(--accent)', margin: '0 auto' }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--light)' }}>{streak}</p>
            <p style={{ fontSize: 10, color: 'var(--muted)' }}>дней</p>
          </div>
        </div>
      </Card>

      {/* Сегодня */}
      <Card title="Сегодня" right={
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--light)' }}>
          {taskStats.done}/{taskStats.total}
        </span>
      }>
        <div className="flex items-center gap-4">
          <span className="relative flex-none">
            <ProgressRing pct={taskStats.total ? taskStats.done / taskStats.total : 0} color="var(--done)" size={64} />
            <span
              className="absolute inset-0 grid place-items-center"
              style={{ fontSize: 12, fontWeight: 700, color: 'var(--light)' }}
            >
              {taskStats.pct}%
            </span>
          </span>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
              {taskStats.total === 0
                ? 'Добавь первое дело в экран «День»'
                : taskStats.done === taskStats.total && taskStats.total > 0
                  ? 'Отлично, всё сделано! 🔥'
                  : `${taskStats.total - taskStats.done} осталось`}
            </p>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('aod:switch-tab', { detail: 'day' }))}
            className="flex-none grid place-items-center rounded-xl"
            style={{ width: 40, height: 40, background: 'var(--surface-2)' }}
          >
            <ArrowRight size={18} strokeWidth={2} style={{ color: 'var(--accent)' }} />
          </button>
        </div>
      </Card>

      {/* Квесты */}
      <Card title="Квесты дня" right={
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>+{claimedToday} XP</span>
      }>
        <div className="space-y-2">
          {questList.map((q) => {
            const pct = Math.min(q.current / q.goal, 1)
            const complete = q.current >= q.goal
            const isClaimed = quests[q.id] || claimed[q.id]
            return (
              <div key={q.id} className="flex items-center gap-3">
                <div
                  className="flex-none grid place-items-center rounded-xl"
                  style={{ width: 36, height: 36, background: q.color }}
                >
                  <q.icon size={18} strokeWidth={1.8} style={{ color: 'var(--on-fill)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>{q.label}</p>
                  <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: q.color }} />
                  </div>
                </div>
                {complete && !isClaimed ? (
                  <button
                    onClick={() => claimQuest(q.id)}
                    className="flex-none rounded-full px-3 py-1"
                    style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 12, fontWeight: 600 }}
                  >
                    +{QUEST_REWARDS[q.id as keyof typeof QUEST_REWARDS]}
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: complete ? 'var(--done)' : 'var(--muted)' }}>
                    {complete ? '✓' : `${q.current}/${q.goal}`}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Недельный тренд */}
      <Card title="Неделя" right={<TrendingUp size={16} strokeWidth={1.8} style={{ color: 'var(--muted)' }} />}>
        <div className="flex items-end gap-1 h-20 px-1">
          {sparkline.map((d, i) => {
            const h = Math.max(8, (d.pct / maxSpark) * 100)
            const isToday = i === sparkline.length - 1
            return (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md"
                  style={{
                    height: `${h}%`,
                    background: isToday ? 'var(--accent)' : d.pct === 1 ? 'var(--done)' : 'var(--line-strong)',
                    opacity: d.pct === 0 && !isToday ? 0.4 : 1,
                  }}
                />
                <span style={{ fontSize: 9, color: 'var(--muted)' }}>
                  {d.key.slice(8)}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Социум */}
      <Card title="Социум" right={<Users size={16} strokeWidth={1.8} style={{ color: 'var(--muted)' }} />}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex -space-x-2">
            {people.slice(0, 4).map((p, i) => (
              <div
                key={i}
                className="grid place-items-center rounded-full border-2"
                style={{
                  width: 34,
                  height: 34,
                  background: 'var(--surface-2)',
                  borderColor: 'var(--bg)',
                  fontSize: 12,
                  color: 'var(--light)',
                }}
              >
                {(p.layer?.[0] ?? '?').toUpperCase()}
              </div>
            ))}
            {people.length > 4 && (
              <div
                className="grid place-items-center rounded-full border-2"
                style={{ width: 34, height: 34, background: 'var(--accent)', borderColor: 'var(--bg)', fontSize: 11, color: 'var(--on-fill)' }}
              >
                +{people.length - 4}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
              {people.length === 0 ? 'Добавь людей в раздел «Социум»' : `${people.length} человек в круге`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SOCIAL_LAYERS.map((l) => {
            const count = peopleByLayer[l.id] ?? 0
            if (count === 0) return null
            return (
              <span
                key={l.id}
                className="rounded-full px-2 py-0.5"
                style={{ background: 'var(--surface-2)', fontSize: 11, color: 'var(--muted)' }}
              >
                {l.label}: {count}
              </span>
            )
          })}
        </div>
      </Card>

      {/* Призыв к действию */}
      <div
        className="rounded-2xl p-4 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
      >
        <Sparkles size={22} strokeWidth={1.8} style={{ color: 'var(--accent)', margin: '0 auto' }} />
        <p className="mt-2" style={{ fontSize: 13, color: 'var(--text-2)' }}>
          Принадлежность начинается с регулярности. Маленькие шаги каждый день — это то, что меняет граф.
        </p>
      </div>

      {/* Мотивация / достижения */}
      <Card title="Достижения" right={<Trophy size={16} strokeWidth={1.8} style={{ color: 'var(--muted)' }} />}>
        <div className="space-y-2">
          {allDone >= 10 && (
            <div className="flex items-center gap-2" style={{ color: 'var(--done)' }}>
              <Trophy size={16} /> <span style={{ fontSize: 13 }}>10+ дел выполнено за всё время</span>
            </div>
          )}
          {streak >= 3 && (
            <div className="flex items-center gap-2" style={{ color: 'var(--accent)' }}>
              <Flame size={16} /> <span style={{ fontSize: 13 }}>Серия 3+ дней</span>
            </div>
          )}
          {people.length >= 1 && (
            <div className="flex items-center gap-2" style={{ color: 'var(--ring-checklists)' }}>
              <Users size={16} /> <span style={{ fontSize: 13 }}>Первый контакт в социуме</span>
            </div>
          )}
          {allDone < 10 && streak < 3 && people.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Выполняй дела, заполняй самооценку и добавляй людей — достижения появятся здесь.
            </p>
          )}
        </div>
      </Card>
      </div>
      )}
    </div>
  )
}
