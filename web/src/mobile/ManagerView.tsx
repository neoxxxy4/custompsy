import { useMemo, useState } from 'react'
import { CalendarPlus, Check, NotebookPen, Plus, Star, Trash2, X, Zap } from 'lucide-react'
import { readLS, writeLS } from '../lib/sync'
import { uid, useLS, todayKey, seedDayBlocks, seedTodayData, type BlockDef, type Note, type TodayData } from '../views/practice/store'
import { WD } from '../lib/dayStats'
import {
  DEFAULT_MANAGER_TABS,
  MANAGER_ITEMS_KEY,
  MANAGER_TABS_KEY,
  QUADRANTS,
  quadrantOf,
  type ManagerItem,
  type ManagerTab,
} from './managerData'

// Инструмент «Менеджер»: матрица Эйзенхауэра (главная вкладка) + списки
// (Проблемы/Задачи/Идеи/Проекты/Дела + свои). Пункты уходят в День и в Заметки.

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim()

// положить пункт в сегодняшний день (та же логика, что у ИИ-действия add_task)
function pushToDay(text: string): string {
  const dateKey = todayKey()
  const key = `aod4-today-data-${dateKey}`
  const defs = readLS<BlockDef[] | null>(`aod4-today-blocks-${dateKey}`, null) ?? seedDayBlocks()
  const data = readLS<TodayData | null>(key, null) ?? seedTodayData(dateKey, WD[new Date().getDay()])
  const usable = defs.filter((d) => d.allow?.items !== false)
  if (!usable.length) return 'в дне нет блока для задач'
  const block = usable.find((d) => /задач|дела/.test(norm(d.title))) ?? usable[0]
  const cur = data[block.id] ?? { items: [], lists: [] }
  writeLS(key, { ...data, [block.id]: { ...cur, items: [...cur.items, { id: uid(), text, done: false }] } })
  globalThis.window.dispatchEvent(new Event('aod:sync-hydrated'))
  return `в день → «${block.title.trim() || 'без названия'}»`
}

function pushToNote(text: string): string {
  const notes = readLS<Note[]>('aod4-notes', [])
  writeLS('aod4-notes', [{ id: uid(), folderId: 'inbox', title: text, body: '', updated: Date.now() }, ...notes])
  globalThis.window.dispatchEvent(new Event('aod:sync-hydrated'))
  return 'в заметки'
}

export default function ManagerView() {
  const [customTabs, setCustomTabs] = useLS<ManagerTab[]>(MANAGER_TABS_KEY, [])
  const [items, setItems] = useLS<ManagerItem[]>(MANAGER_ITEMS_KEY, [])
  const [active, setActive] = useState<string>('matrix')
  const [newText, setNewText] = useState('')
  const [addTabOpen, setAddTabOpen] = useState(false)
  const [newTabName, setNewTabName] = useState('')
  const [flash, setFlash] = useState('')

  const allTabs = useMemo(() => [...DEFAULT_MANAGER_TABS, ...customTabs], [customTabs])
  const tabName = (id: string) => allTabs.find((t) => t.id === id)?.name ?? '?'

  const say = (msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(''), 1800)
  }

  const update = (id: string, patch: Partial<ManagerItem>) =>
    setItems((its) => its.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  const removeItem = (id: string) => setItems((its) => its.filter((it) => it.id !== id))

  const addItem = () => {
    const text = newText.trim()
    if (!text || active === 'matrix') return
    setItems((its) => [{ id: uid(), ts: Date.now(), tabId: active, text, done: false }, ...its])
    setNewText('')
  }

  const addTab = () => {
    const name = newTabName.trim()
    if (!name) return
    const t = { id: uid(), name }
    setCustomTabs((ts) => [...ts, t])
    setNewTabName('')
    setAddTabOpen(false)
    setActive(t.id)
  }

  const removeCustomTab = (id: string) => {
    setCustomTabs((ts) => ts.filter((t) => t.id !== id))
    setItems((its) => its.filter((it) => it.tabId !== id))
    setActive('matrix')
  }

  // ─── строка пункта (общая для матрицы и списков) ───
  const itemRow = (it: ManagerItem, showTab: boolean) => (
    <div key={it.id} className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 mb-1" style={{ background: 'var(--surface-2)' }}>
      <button
        onClick={() => update(it.id, { done: !it.done })}
        className="flex-none grid place-items-center rounded-md"
        style={{
          width: 20, height: 20,
          border: `1.5px solid ${it.done ? 'var(--accent)' : 'var(--line)'}`,
          background: it.done ? 'var(--accent)' : 'transparent',
          color: 'var(--on-fill)',
        }}
        aria-label="Готово"
      >
        {it.done && <Check size={12} strokeWidth={3} />}
      </button>
      <span
        className="flex-1 min-w-0"
        style={{
          fontSize: 12.5,
          color: it.done ? 'var(--muted)' : 'var(--text)',
          textDecoration: it.done ? 'line-through' : 'none',
          wordBreak: 'break-word',
        }}
      >
        {showTab && <span style={{ fontSize: 10, color: 'var(--muted)' }}>[{tabName(it.tabId)}] </span>}
        {it.text}
      </span>
      <button
        onClick={() => update(it.id, { urgent: !it.urgent })}
        className="flex-none grid place-items-center rounded-md"
        style={{ width: 24, height: 24, color: it.urgent ? '#ef4444' : 'var(--muted)', opacity: it.urgent ? 1 : 0.45 }}
        aria-label="Срочно"
      >
        <Zap size={13} strokeWidth={2.2} fill={it.urgent ? '#ef4444' : 'none'} />
      </button>
      <button
        onClick={() => update(it.id, { important: !it.important })}
        className="flex-none grid place-items-center rounded-md"
        style={{ width: 24, height: 24, color: it.important ? '#eab308' : 'var(--muted)', opacity: it.important ? 1 : 0.45 }}
        aria-label="Важно"
      >
        <Star size={13} strokeWidth={2.2} fill={it.important ? '#eab308' : 'none'} />
      </button>
      <button
        onClick={() => say(pushToDay(it.text))}
        className="flex-none grid place-items-center rounded-md"
        style={{ width: 24, height: 24, color: 'var(--muted)' }}
        aria-label="В день"
      >
        <CalendarPlus size={13} strokeWidth={2} />
      </button>
      <button
        onClick={() => say(pushToNote(it.text))}
        className="flex-none grid place-items-center rounded-md"
        style={{ width: 24, height: 24, color: 'var(--muted)' }}
        aria-label="В заметки"
      >
        <NotebookPen size={13} strokeWidth={2} />
      </button>
      <button
        onClick={() => removeItem(it.id)}
        className="flex-none grid place-items-center rounded-md"
        style={{ width: 24, height: 24, color: 'var(--muted)' }}
        aria-label="Удалить"
      >
        <Trash2 size={13} strokeWidth={1.8} />
      </button>
    </div>
  )

  // ─── матрица Эйзенхауэра ───
  const renderMatrix = () => (
    <div className="grid grid-cols-2 gap-2">
      {QUADRANTS.map((q) => {
        const list = items.filter((it) => !it.done && quadrantOf(it) === q.id)
        return (
          <section key={q.id} className="rounded-2xl p-2" style={{ background: 'var(--surface)', border: `1px solid ${q.color}44` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: q.color }}>{q.name}</p>
            <p className="mb-1.5" style={{ fontSize: 9.5, color: 'var(--muted)' }}>{q.hint}</p>
            {list.length === 0 && <p style={{ fontSize: 10.5, color: 'var(--muted)', opacity: 0.6 }}>пусто</p>}
            {list.map((it) => itemRow(it, true))}
          </section>
        )
      })}
    </div>
  )

  // ─── список вкладки ───
  const renderList = () => {
    const list = items.filter((it) => it.tabId === active)
    const open = list.filter((it) => !it.done)
    const done = list.filter((it) => it.done)
    const tab = allTabs.find((t) => t.id === active)
    return (
      <div>
        {tab && !tab.fixed && (
          <button
            onClick={() => removeCustomTab(tab.id)}
            className="w-full rounded-xl mb-2 py-1.5"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--muted)', fontSize: 11 }}
          >
            Удалить вкладку «{tab.name}» вместе с пунктами
          </button>
        )}
        <div className="flex gap-1.5 mb-2">
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder={`Новый пункт в «${tab?.name ?? ''}»…`}
            className="flex-1 rounded-xl px-3 outline-none"
            style={{ height: 38, background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 13 }}
          />
          <button
            onClick={addItem}
            className="flex-none grid place-items-center rounded-xl"
            style={{ width: 38, height: 38, background: 'var(--accent)', color: 'var(--on-fill)' }}
            aria-label="Добавить"
          >
            <Plus size={17} strokeWidth={2.4} />
          </button>
        </div>
        {list.length === 0 && (
          <p className="text-center mt-8" style={{ fontSize: 12, color: 'var(--muted)' }}>
            Пусто. Добавь первый пункт — выше поле ввода
          </p>
        )}
        {open.map((it) => itemRow(it, false))}
        {done.length > 0 && (
          <>
            <p className="mt-3 mb-1" style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)' }}>ВЫПОЛНЕНО</p>
            {done.map((it) => itemRow(it, false))}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 pt-5 pb-24">
      {/* пилюли вкладок */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => setActive('matrix')}
          className="flex-none rounded-lg px-3 py-1.5"
          style={{
            fontSize: 12, fontWeight: 600,
            background: active === 'matrix' ? 'var(--accent)' : 'var(--surface-2)',
            color: active === 'matrix' ? 'var(--on-fill)' : 'var(--muted)',
          }}
        >
          Матрица
        </button>
        {allTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className="flex-none rounded-lg px-3 py-1.5"
            style={{
              fontSize: 12, fontWeight: 600,
              background: active === t.id ? 'var(--accent)' : 'var(--surface-2)',
              color: active === t.id ? 'var(--on-fill)' : 'var(--muted)',
            }}
          >
            {t.name}
          </button>
        ))}
        <button
          onClick={() => setAddTabOpen((v) => !v)}
          className="flex-none grid place-items-center rounded-lg px-2.5"
          style={{ background: 'var(--surface-2)', color: 'var(--accent)' }}
          aria-label="Новая вкладка"
        >
          <Plus size={14} strokeWidth={2.4} />
        </button>
      </div>

      {addTabOpen && (
        <div className="flex gap-1.5 mb-3">
          <input
            value={newTabName}
            onChange={(e) => setNewTabName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTab()}
            placeholder="Название своей вкладки…"
            className="flex-1 rounded-xl px-3 outline-none"
            style={{ height: 36, background: 'var(--surface)', border: '1px solid var(--accent)', color: 'var(--light)', fontSize: 12.5 }}
          />
          <button
            onClick={addTab}
            className="flex-none rounded-xl px-3"
            style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 12, fontWeight: 700 }}
          >
            ОК
          </button>
          <button
            onClick={() => setAddTabOpen(false)}
            className="flex-none grid place-items-center rounded-xl px-2"
            style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
            aria-label="Отмена"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      )}

      {active === 'matrix' ? renderMatrix() : renderList()}

      {flash && (
        <p className="text-center mt-3" style={{ fontSize: 11.5, color: 'var(--accent)' }}>{flash}</p>
      )}
    </div>
  )
}
