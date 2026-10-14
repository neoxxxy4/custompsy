import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  seedTodayData,
  type BlockItem,
  type TodayData,
  uid,
  useLS,
} from '../views/practice/store'
import { WD } from '../lib/dayStats'
import { formatDateRu } from './mapLogic'

interface SessionRec {
  id: string
  date: string
  summary: string
}

interface WeekTask {
  id: string
  text: string
  done: boolean
}

const SEED_SESSIONS: SessionRec[] = [
  {
    id: 'seed-path-levels',
    date: new Date().toISOString().slice(0, 10),
    summary:
      'Личный путь (уровни): 1) Вход и калибровка — стабилизация, снижение тревоги, формирование наблюдателя; 2) Наблюдатель — осознание механизмов, отделение от реакций, видение паттернов; 3) Антрополог — исследование корней, детские сценарии, глубинные убеждения; 4) Инженер поведения — перепроектирование действий, новые стратегии, закрепление моделей; 5) Архитектор идентичности — сборка новой роли, структура ответственности, профессиональная позиция; 6) Навигация будущего — стратегический масштаб, план 3–5 лет, расширение влияния.',
  },
]

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const safeDate = (d?: string | null): string => {
  if (!d || !DATE_RE.test(d)) return '—'
  return formatDateRu(d)
}

const readLS = <T,>(key: string): T | null => {
  try {
    const s = localStorage.getItem(key)
    return s ? (JSON.parse(s) as T) : null
  } catch {
    return null
  }
}

export default function SessionView() {
  const [sessions, setSessions] = useLS<SessionRec[]>('aod4-sessions', SEED_SESSIONS)
  const [weekTasks, setWeekTasks] = useLS<WeekTask[]>('aod4-week-tasks', [])
  const [taskDraft, setTaskDraft] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newSummary, setNewSummary] = useState('')

  const addSession = () => {
    const text = newSummary.trim()
    if (!text) return
    setSessions((ss) => [{ id: uid(), date: new Date().toISOString().slice(0, 10), summary: text }, ...ss])
    setNewSummary('')
    setShowNew(false)
  }

  const deleteSession = (id: string) => setSessions((ss) => ss.filter((s) => s.id !== id))

  const addTask = () => {
    const text = taskDraft.trim()
    if (!text) return
    setWeekTasks((ts) => [{ id: uid(), text, done: false }, ...ts])
    setTaskDraft('')
  }

  const toggleTask = (id: string) => setWeekTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const deleteTask = (id: string) => setWeekTasks((ts) => ts.filter((t) => t.id !== id))

  const pushTasksToWeek = () => {
    const pending = weekTasks.filter((t) => !t.done)
    if (!pending.length) return
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const stored = readLS<TodayData>(`aod4-today-data-${key}`)
      const data = stored || seedTodayData(key, WD[d.getDay()])
      const newItems: BlockItem[] = pending.map((t) => ({ id: uid(), text: t.text, done: false }))
      const next: TodayData = { ...data, tasks: { ...data.tasks, items: [...data.tasks.items, ...newItems] } }
      localStorage.setItem(`aod4-today-data-${key}`, JSON.stringify(next))
    }
    setWeekTasks((ts) => ts.map((t) => ({ ...t, done: true })))
  }

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
        Сессии
      </h1>

      <div className="mt-4 rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>Сессии</h2>
        {sessions.length === 0 && <p className="mt-2" style={{ fontSize: 12, color: 'var(--muted)' }}>—</p>}
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center gap-2 mt-2 rounded-xl px-3 py-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
            <span className="flex-1 text-left" style={{ fontSize: 12, color: 'var(--text)' }}>{safeDate(s.date)} · {s.summary || '—'}</span>
            <button onClick={() => deleteSession(s.id)} className="p-1"><Trash2 size={14} strokeWidth={1.8} style={{ color: 'var(--muted)' }} /></button>
          </div>
        ))}

        {!showNew ? (
          <button onClick={() => setShowNew(true)} className="mt-3 w-full py-2 rounded-xl" style={{ border: '1px dashed var(--line-strong)', color: 'var(--muted)', fontSize: 13 }}>+ Новая сессия</button>
        ) : (
          <div className="mt-3 space-y-2">
            <textarea
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              placeholder="Краткий итог сессии..."
              rows={3}
              className="w-full rounded-xl px-3 py-2 outline-none resize-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 13 }}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowNew(false)} className="flex-1 py-2 rounded-xl" style={{ border: '1px solid var(--line-strong)', color: 'var(--muted)', fontSize: 13 }}>Отмена</button>
              <button onClick={addSession} className="flex-1 py-2 rounded-xl" style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 13, fontWeight: 600 }}>Сохранить</button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>Задания на неделю</h2>
        <div className="flex gap-2 mt-2">
          <input
            value={taskDraft}
            onChange={(e) => setTaskDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addTask() }}
            placeholder="Новое задание..."
            className="flex-1 min-w-0 rounded-xl px-3 outline-none"
            style={{ height: 36, background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 13 }}
          />
          <button onClick={addTask} className="flex-none grid place-items-center rounded-xl" style={{ width: 36, height: 36, background: 'var(--accent)', color: 'var(--on-fill)' }}>
            <Plus size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="mt-2 space-y-1.5">
          {weekTasks.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)' }}>—</p>}
          {weekTasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
              <button onClick={() => toggleTask(t.id)} className="flex-none" style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${t.done ? 'var(--done)' : 'var(--line-strong)'}`, background: t.done ? 'var(--done)' : 'transparent' }} />
              <span className="flex-1" style={{ fontSize: 13, color: t.done ? 'var(--muted)' : 'var(--text)', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
              <button onClick={() => deleteTask(t.id)} className="p-1"><Trash2 size={14} strokeWidth={1.8} style={{ color: 'var(--muted)' }} /></button>
            </div>
          ))}
        </div>
        {weekTasks.some((t) => !t.done) && (
          <button onClick={pushTasksToWeek} className="mt-3 w-full py-2.5 rounded-xl" style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 13, fontWeight: 600 }}>
            Разнести на неделю
          </button>
        )}
      </div>
    </div>
  )
}
