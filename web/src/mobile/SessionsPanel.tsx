import { useState } from 'react'
import { Armchair, ChevronRight, Lightbulb, Plus, Trash2 } from 'lucide-react'
import {
  awardXp,
  fmtKey,
  seedTodayData,
  uid,
  useLS,
  type BlockItem,
  type SessionRec,
  type TodayData,
} from '../views/practice/store'
import { WD } from '../lib/dayStats'
import { fmtWhen } from './utils'

// панель «Сессии» в «Записях»: учёт работы на сессиях + инсайты
export default function SessionsPanel({ toast }: { toast: (msg: string) => void }) {
  const [sessions, setSessions] = useLS<SessionRec[]>('aod2-sessions', [])
  const [editId, setEditId] = useState<string | null>(null)

  const sorted = [...sessions].sort((a, b) => b.updated - a.updated)
  const editing = sessions.find((s) => s.id === editId) ?? null

  const createSession = () => {
    const s: SessionRec = { id: uid(), practice: '', minutes: 15, what: '', insight: '', updated: Date.now() }
    setSessions((ss) => [s, ...ss])
    awardXp(20)
    toast('+20 XP · сессия записана')
    setEditId(s.id)
  }

  const patch = (id: string, p: Partial<SessionRec>) =>
    setSessions((ss) => ss.map((s) => (s.id === id ? { ...s, ...p, updated: Date.now() } : s)))

  const remove = (id: string) => {
    if (!window.confirm('Удалить сессию?')) return
    setSessions((ss) => ss.filter((s) => s.id !== id))
    setEditId(null)
  }

  // инсайт → пункт в блоке «Задачи» завтрашнего дня (дефолты дня сохраняются)
  const toTomorrow = (s: SessionRec) => {
    const text = s.insight.trim() || s.practice.trim()
    if (!text) return
    const t = new Date()
    t.setDate(t.getDate() + 1)
    const tk = fmtKey(t)
    const wd = WD[t.getDay()]
    const key = `aod2-today-data-${tk}`
    let data: TodayData
    try {
      const raw = localStorage.getItem(key)
      data = raw ? (JSON.parse(raw) as TodayData) : seedTodayData(tk, wd)
    } catch {
      data = seedTodayData(tk, wd)
    }
    const item: BlockItem = { id: uid(), text, done: false }
    const tasks = data.tasks ?? { items: [], lists: [] }
    data = { ...data, tasks: { ...tasks, items: [...tasks.items, item] } }
    try {
      localStorage.setItem(key, JSON.stringify(data))
      toast('Добавлено в задачи на завтра')
    } catch {
      toast('Не удалось сохранить')
    }
  }

  return (
    <>
      {sorted.length === 0 && (
        <p className="py-10 text-center" style={{ fontSize: 13, color: 'var(--muted)' }}>
          Нет сессий — запиши первую через +
        </p>
      )}
      {sorted.map((s) => (
        <button
          key={s.id}
          onClick={() => setEditId(s.id)}
          className="w-full rounded-2xl p-3.5 text-left"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          <span className="flex items-center gap-3">
            <span
              className="flex-none w-9 h-9 rounded-xl grid place-items-center"
              style={{ background: 'var(--surface-2)' }}
            >
              <Armchair size={17} strokeWidth={1.7} style={{ color: 'var(--f-metacog)' }} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block truncate" style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--light)' }}>
                {s.practice || 'Сессия'}
              </span>
              <span className="block mt-0.5" style={{ fontSize: 12, color: 'var(--muted)' }}>
                {s.minutes} мин · {fmtWhen(s.updated)}
              </span>
            </span>
            <ChevronRight size={16} strokeWidth={1.7} style={{ color: 'var(--muted)' }} />
          </span>
          {s.insight && (
            <span
              className="block mt-2 truncate italic"
              style={{ fontSize: 12.5, color: 'var(--f-metacog)' }}
            >
              Инсайт: {s.insight}
            </span>
          )}
        </button>
      ))}

      {/* свой FAB: новая сессия */}
      <button
        onClick={createSession}
        className="fixed right-4 z-40 grid place-items-center rounded-full"
        style={{
          bottom: 'calc(76px + env(safe-area-inset-bottom))',
          width: 56,
          height: 56,
          background: 'var(--accent)',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}
        title="Записать сессию"
      >
        <Plus size={24} strokeWidth={2} />
      </button>

      {editing && (
        <SessionSheet
          session={editing}
          onPatch={(p) => patch(editing.id, p)}
          onToTomorrow={() => toTomorrow(editing)}
          onDelete={() => remove(editing.id)}
          onClose={() => setEditId(null)}
        />
      )}
    </>
  )
}

// шторка редактирования сессии: практика, длительность, что было, инсайт
function SessionSheet({
  session,
  onPatch,
  onToTomorrow,
  onDelete,
  onClose,
}: {
  session: SessionRec
  onPatch: (p: Partial<SessionRec>) => void
  onToTomorrow: () => void
  onDelete: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl px-5 pt-3 max-h-[88vh] overflow-y-auto"
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

        <div className="flex items-center gap-2 mb-3">
          <input
            value={session.practice}
            onChange={(e) => onPatch({ practice: e.target.value })}
            placeholder="Практика (2 стула, дыхание…)"
            className="flex-1 bg-transparent outline-none rounded-xl px-3.5 py-2.5"
            style={{ border: '1px solid var(--line)', fontSize: 15, fontWeight: 600, color: 'var(--light)' }}
          />
          <input
            type="number"
            min={1}
            value={session.minutes}
            onChange={(e) => onPatch({ minutes: Math.max(1, Number(e.target.value) || 1) })}
            className="w-20 bg-transparent outline-none rounded-xl px-3 py-2.5 text-center"
            style={{ border: '1px solid var(--line)', fontSize: 14, color: 'var(--light)', fontFamily: 'var(--font-mono)' }}
            title="Минут"
          />
        </div>

        <textarea
          value={session.what}
          onChange={(e) => onPatch({ what: e.target.value })}
          placeholder="Что было на сессии…"
          className="w-full bg-transparent outline-none resize-none rounded-xl px-3.5 py-3 mb-2.5"
          style={{ border: '1px solid var(--line)', fontSize: 14, lineHeight: 1.6, color: 'var(--text-2)', minHeight: 90 }}
        />

        <div
          className="rounded-xl px-3.5 py-3 mb-3"
          style={{ border: '1px solid var(--f-metacog)', background: 'var(--surface-2)' }}
        >
          <p className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 12, fontWeight: 600, color: 'var(--f-metacog)' }}>
            <Lightbulb size={13} strokeWidth={2} />
            Инсайт
          </p>
          <textarea
            value={session.insight}
            onChange={(e) => onPatch({ insight: e.target.value })}
            placeholder="Главное понимание с сессии…"
            className="w-full bg-transparent outline-none resize-none"
            style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--light)', minHeight: 56 }}
          />
        </div>

        <button
          onClick={onToTomorrow}
          className="w-full py-3 rounded-xl mb-2"
          style={{ background: 'var(--accent)', color: '#fff', fontSize: 14.5, fontWeight: 600 }}
        >
          → В задачи на завтра
        </button>
        <button
          onClick={onDelete}
          className="w-full py-2.5 rounded-xl flex items-center justify-center gap-1.5"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--muted)', fontSize: 13.5 }}
        >
          <Trash2 size={14} strokeWidth={1.7} />
          Удалить
        </button>
      </div>
    </div>
  )
}
