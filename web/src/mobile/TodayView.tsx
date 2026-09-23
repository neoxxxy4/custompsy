import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  GripVertical,
  ListOrdered,
  ListTodo,
  MoreHorizontal,
  Plus,
  SlidersHorizontal,
  Target,
  Clock,
} from 'lucide-react'
import {
  type BlockDef,
  type BlockItem,
  type BlockList,
  type ListRecord,
  type TodayData,
  moveItem,
  seedBlockDefs,
  seedTodayData,
  uid,
  useLS,
} from '../views/practice/store'
import { WD } from '../lib/dayStats'
import ProgressRing from './ProgressRing'
import ChecklistRow from './ChecklistRow'
import ActionSheet from './ActionSheet'
import PickListSheet from './PickListSheet'
import KanbanBoard, { colOf, type KanbanCol, type KanbanEntry, type KanbanGroupRef } from './KanbanBoard'
import TimelineView, { type TimelineEntry } from './TimelineView'
import BlockMenu from './BlockMenu'
import { useDragList } from './useDragList'
import { LongPressRow, MCheck } from './ui'
import { useToast } from './utils'

type SheetTarget =
  | { kind: 'item'; blockId: string; itemId: string; title: string }
  | { kind: 'list'; blockId: string; listId: string; title: string }
  | { kind: 'listItem'; blockId: string; listId: string; itemId: string; title: string }

type EditItem = { blockId: string; itemId: string; field: 'time' | 'text' }
type EditListItem = { blockId: string; listId: string; itemId: string }
type EditListTitle = { blockId: string; listId: string }

type Win = 'day' | 'kanban' | 'progress'
const WINS: { id: Win; label: string }[] = [
  { id: 'day', label: 'День' },
  { id: 'kanban', label: 'Канбан' },
  { id: 'progress', label: 'Прогресс' },
]

const EMPTY_BLOCK: TodayData[string] = { items: [], lists: [] }

// цвета и иконки колец дашборда — цикл по четырём существующим
const RING_COLORS = ['var(--ring-goals)', 'var(--ring-schedule)', 'var(--ring-checklists)', 'var(--ring-tasks)']
const RING_ICONS = [Target, Clock, CircleCheck, ListTodo]

const fmtKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const WD_SHORT = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']
const MO_SHORT = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЯ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК']

export default function TodayView() {
  const [offset, setOffset] = useState(0)
  const [win, setWin] = useState<Win>('day')
  const viewDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return d
  }, [offset])
  const dateKey = fmtKey(viewDate)
  const wdName = WD[viewDate.getDay()]
  const readOnly = offset === -1

  const [defs, setDefs] = useLS<BlockDef[]>('aod2-today-blocks', seedBlockDefs())
  const [listrecs] = useLS<ListRecord[]>('aod2-listrecs', [])
  // readOnly-день (вчера): мигрируем только то, что было в legacy, без дефолтов
  const [data, setData] = useLS<TodayData>(`aod2-today-data-${dateKey}`, seedTodayData(dateKey, wdName, readOnly))

  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [openLists, setOpenLists] = useState<string[]>([])
  const [editItem, setEditItem] = useState<EditItem | null>(null)
  const [editListItem, setEditListItem] = useState<EditListItem | null>(null)
  const [editListTitle, setEditListTitle] = useState<EditListTitle | null>(null)
  const [sheet, setSheet] = useState<SheetTarget | null>(null)
  const [pickList, setPickList] = useState<{ def: BlockDef; kind: BlockList['kind'] } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [menuBlockId, setMenuBlockId] = useState<string | null>(null)
  const [editDefId, setEditDefId] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const toast = useToast()

  const cardEls = useRef<Record<string, HTMLElement | null>>({})
  const anyDrag = useRef<Record<string, boolean>>({})
  const swipe = useRef<{ x: number; y: number } | null>(null)

  // ─── данные блоков ───
  const blockData = (id: string) => data[id] ?? EMPTY_BLOCK

  // прогресс блока = пункты + пункты чек-листов; нумерованные списки не считаются
  const blockStat = (id: string) => {
    const b = blockData(id)
    const all = [...b.items, ...b.lists.filter((l) => l.kind === 'checklist').flatMap((l) => l.items)]
    return { done: all.filter((i) => i.done).length, total: all.length }
  }

  const patchBlockData = (blockId: string, fn: (b: TodayData[string]) => TodayData[string]) =>
    setData((d) => ({ ...d, [blockId]: fn(d[blockId] ?? { items: [], lists: [] }) }))
  const patchItem = (blockId: string, itemId: string, patch: Partial<BlockItem>) =>
    patchBlockData(blockId, (b) => ({ ...b, items: b.items.map((x) => (x.id === itemId ? { ...x, ...patch } : x)) }))
  const patchList = (blockId: string, listId: string, fn: (l: BlockList) => BlockList) =>
    patchBlockData(blockId, (b) => ({ ...b, lists: b.lists.map((l) => (l.id === listId ? fn(l) : l)) }))

  const addItem = (def: BlockDef) => {
    const it: BlockItem = { id: uid(), text: '', done: false, ...(def.withTime ? { time: '12:00' } : {}) }
    patchBlockData(def.id, (b) => ({ ...b, items: [...b.items, it] }))
    setEditItem({ blockId: def.id, itemId: it.id, field: 'text' })
    openBlock(def.id)
  }
  const addList = (def: BlockDef, kind: BlockList['kind']) => {
    const lst: BlockList = { id: uid(), kind, title: '', items: [] }
    patchBlockData(def.id, (b) => ({ ...b, lists: [...b.lists, lst] }))
    setEditListTitle({ blockId: def.id, listId: lst.id })
    openBlock(def.id)
    expandList(lst.id)
  }

  // вставка копии сохранённой записи: пункты свежие (done сброшен), id новые
  const insertFromRecord = (def: BlockDef, rec: ListRecord) => {
    const lst: BlockList = {
      id: uid(),
      kind: rec.kind,
      title: rec.title,
      items: rec.items.map((it) => ({ id: uid(), text: it.text, done: false })),
    }
    patchBlockData(def.id, (b) => ({ ...b, lists: [...b.lists, lst] }))
    openBlock(def.id)
    expandList(lst.id)
  }

  // ─── настройка блоков (глобально, не зависит от дня) ───
  const patchDef = (id: string, patch: Partial<BlockDef>) =>
    setDefs((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  const deleteDef = (id: string) => setDefs((ds) => ds.filter((d) => d.id !== id))
  const addBlockDef = () => {
    const def: BlockDef = {
      id: uid(),
      title: '',
      withTime: false,
      inDashboard: true,
      allow: { items: true, checklists: false, lists: false },
    }
    setDefs((ds) => [...ds, def])
    setEditDefId(def.id)
  }

  const jumpTo = (id: string) => {
    setWin('progress')
    setOpen((o) => ({ ...o, [id]: true }))
    window.setTimeout(() => {
      cardEls.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setFlash(id)
      window.setTimeout(() => setFlash((f) => (f === id ? null : f)), 600)
    }, 60)
  }

  // ─── свайпы между окнами: влево — следующее, вправо — предыдущее ───
  const changeOffset = (next: number) => {
    setOffset(Math.max(-1, Math.min(1, next)))
    setSheet(null)
    setEditItem(null)
    setEditListItem(null)
    setEditListTitle(null)
    setFlash(null)
  }
  const winStep = (dir: 1 | -1) => {
    const i = WINS.findIndex((w) => w.id === win)
    const n = Math.max(0, Math.min(WINS.length - 1, i + dir))
    setWin(WINS[n].id)
  }
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    swipe.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    if (blocksDrag.dragging || Object.values(anyDrag.current).some(Boolean)) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) winStep(dx < 0 ? 1 : -1)
  }

  const openBlock = (b: string) => setOpen((o) => ({ ...o, [b]: true }))
  const toggleBlock = (b: string) => setOpen((o) => ({ ...o, [b]: !o[b] }))
  const expandList = (id: string) =>
    setOpenLists((xs) => (xs.includes(id) ? xs : [...xs, id]))
  const toggleList = (id: string) =>
    setOpenLists((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]))

  // ─── drag-сортировка блоков в шторке «Блоки экрана» ───
  const blocksDrag = useDragList({
    onReorder: (from, to) => setDefs((ds) => moveItem(ds, from, to)),
    onLongPress: () => {},
  })

  // ─── action-sheet по long-press ───
  const sheetRename = () => {
    const t = sheet
    if (!t) return
    if (t.kind === 'item') {
      setEditItem({ blockId: t.blockId, itemId: t.itemId, field: 'text' })
      openBlock(t.blockId)
    } else if (t.kind === 'list') {
      setEditListTitle({ blockId: t.blockId, listId: t.listId })
      openBlock(t.blockId)
    } else {
      setEditListItem({ blockId: t.blockId, listId: t.listId, itemId: t.itemId })
      openBlock(t.blockId)
      expandList(t.listId)
    }
  }
  const sheetDelete = () => {
    const t = sheet
    if (!t) return
    if (t.kind === 'item')
      patchBlockData(t.blockId, (b) => ({ ...b, items: b.items.filter((x) => x.id !== t.itemId) }))
    else if (t.kind === 'list')
      patchBlockData(t.blockId, (b) => ({ ...b, lists: b.lists.filter((l) => l.id !== t.listId) }))
    else
      patchList(t.blockId, t.listId, (l) => ({ ...l, items: l.items.filter((x) => x.id !== t.itemId) }))
  }

  // ─── окна ───
  const schedDefs = defs.filter((d) => d.withTime)
  const kanbanDefs = defs.filter((d) => !d.withTime)
  // кольца прогресса — без расписания (оно отдельное окно)
  const dashBlocks = defs.filter((d) => d.inDashboard && !d.withTime)
  const menuDef = defs.find((d) => d.id === menuBlockId) ?? null

  // события таймлайна: пункты всех блоков со временем
  const timelineEntries: TimelineEntry[] = schedDefs.flatMap((def) => {
    const color = RING_COLORS[defs.indexOf(def) % RING_COLORS.length]
    return blockData(def.id).items.map((item) => ({ defId: def.id, color, item }))
  })
  const tlEntryKey = (e: TimelineEntry) => e.item.id
  const addTimelineItem = (time: string): string => {
    const def = schedDefs[0]
    const it: BlockItem = { id: uid(), text: '', done: false, time, dur: 60 }
    if (def) patchBlockData(def.id, (b) => ({ ...b, items: [...b.items, it] }))
    return it.id
  }

  // канбан: пункты всех блоков без времени + пункты чек-листов
  const kanbanEntries: KanbanEntry[] = kanbanDefs.flatMap((def) => {
    const bd = blockData(def.id)
    const color = RING_COLORS[defs.indexOf(def) % RING_COLORS.length]
    const direct = bd.items.map((item) => ({ blockId: def.id, item, badge: def.title || 'Блок', color }))
    const fromLists = bd.lists
      .filter((l) => l.kind === 'checklist')
      .flatMap((l) =>
        l.items.map((item) => ({
          blockId: def.id,
          listId: l.id,
          item,
          badge: l.title || def.title || 'Чек-лист', // контейнер = сам чек-лист
          color,
        })),
      )
    return [...direct, ...fromLists]
  })

  const patchKanbanItem = (e: KanbanEntry, patch: Partial<BlockItem>) => {
    if (e.listId)
      patchList(e.blockId, e.listId, (l) => ({
        ...l,
        items: l.items.map((x) => (x.id === e.item.id ? { ...x, ...patch } : x)),
      }))
    else patchItem(e.blockId, e.item.id, patch)
  }
  const statusPatch = (col: KanbanCol): Partial<BlockItem> =>
    col === 'done' ? { done: true, status: undefined } : col === 'work' ? { done: false, status: 'work' } : { done: false, status: 'plan' }
  const moveKanban = (e: KanbanEntry, col: KanbanCol) => patchKanbanItem(e, statusPatch(col))
  // перенос контейнера: двигаются ТОЛЬКО дела этого контейнера из его колонки;
  // такие же дела блока в других колонках не трогаем
  const moveKanbanGroup = (g: KanbanGroupRef, to: KanbanCol) => {
    const patchIfFrom = (x: BlockItem) => (colOf(x) === g.from ? { ...x, ...statusPatch(to) } : x)
    if (g.listId)
      patchList(g.blockId, g.listId, (l) => ({ ...l, items: l.items.map(patchIfFrom) }))
    else
      patchBlockData(g.blockId, (b) => ({ ...b, items: b.items.map(patchIfFrom) }))
  }
  const renameKanban = (e: KanbanEntry, text: string) => {
    if (text.trim()) patchKanbanItem(e, { text })
    else if (e.listId)
      patchList(e.blockId, e.listId, (l) => ({ ...l, items: l.items.filter((x) => x.id !== e.item.id) }))
    else patchBlockData(e.blockId, (b) => ({ ...b, items: b.items.filter((x) => x.id !== e.item.id) }))
  }
  // добавление пункта из колонки «План» — возвращает id для inline-редактирования
  const addKanbanItem = (blockId: string): string => {
    const it: BlockItem = { id: uid(), text: '', done: false, status: 'plan' }
    patchBlockData(blockId, (b) => ({ ...b, items: [...b.items, it] }))
    return it.id
  }

  const title = offset === -1 ? 'Вчера' : offset === 1 ? 'Завтра' : 'Сегодня'
  const dateLabel = `${WD_SHORT[viewDate.getDay()]} ${viewDate.getDate()} ${MO_SHORT[viewDate.getMonth()]}`

  return (
    <div className="px-4 pt-5 pb-28" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* компактная дата-бар: стрелки дней + шестерёнка блоков */}
      <header className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1 min-w-0">
          <button
            onClick={() => changeOffset(offset - 1)}
            disabled={offset <= -1}
            className="p-1.5 disabled:opacity-30"
            title="Вчера"
          >
            <ChevronLeft size={18} strokeWidth={2} style={{ color: 'var(--muted)' }} />
          </button>
          <div className="text-center min-w-[120px]">
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700, color: 'var(--light)', letterSpacing: '0.04em' }}>
              {dateLabel}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {title}
              {readOnly ? ' · только чтение' : ''}
            </div>
          </div>
          <button
            onClick={() => changeOffset(offset + 1)}
            disabled={offset >= 1}
            className="p-1.5 disabled:opacity-30"
            title="Завтра"
          >
            <ChevronRight size={18} strokeWidth={2} style={{ color: 'var(--muted)' }} />
          </button>
        </div>
        <button onClick={() => setSettingsOpen(true)} title="Блоки экрана" className="p-1">
          <SlidersHorizontal size={20} strokeWidth={1.7} style={{ color: 'var(--muted)' }} />
        </button>
      </header>

      {/* сегмент окон: День / Канбан / Прогресс */}
      <div
        className="grid grid-cols-3 gap-1 rounded-xl p-1 mb-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
      >
        {WINS.map((w) => (
          <button
            key={w.id}
            onClick={() => setWin(w.id)}
            className="rounded-lg py-1.5 transition-colors"
            style={{
              fontSize: 13,
              fontWeight: 600,
              background: win === w.id ? 'var(--accent)' : 'transparent',
              color: win === w.id ? 'var(--on-fill)' : 'var(--muted)',
            }}
          >
            {w.label}
          </button>
        ))}
      </div>

      <div key={`${dateKey}:${win}`} className="fadein">
        {/* ─── окно ДЕНЬ: таймлайн расписания ─── */}
        {win === 'day' &&
          (schedDefs.length > 0 ? (
            <TimelineView
              entries={timelineEntries}
              readOnly={readOnly}
              showNow={offset === 0}
              onToggle={(e) => patchItem(e.defId, tlEntryKey(e), { done: !e.item.done })}
              onEdit={(e, patch) => patchItem(e.defId, tlEntryKey(e), patch)}
              onDelete={(e) =>
                patchBlockData(e.defId, (b) => ({ ...b, items: b.items.filter((x) => x.id !== e.item.id) }))
              }
              onAdd={addTimelineItem}
            />
          ) : (
            <p className="text-center py-10" style={{ fontSize: 13, color: 'var(--muted)' }}>
              Нет блока расписания — добавь его через шестерёнку сверху
            </p>
          ))}

        {/* ─── окно КАНБАН ─── */}
        {win === 'kanban' && (
          <KanbanBoard
            entries={kanbanEntries}
            blocks={kanbanDefs.filter((d) => d.allow.items).map((d) => ({ id: d.id, title: d.title || 'Блок' }))}
            readOnly={readOnly}
            onMove={moveKanban}
            onMoveGroup={moveKanbanGroup}
            onToggle={(e) => patchKanbanItem(e, { done: !e.item.done, status: undefined })}
            onRename={renameKanban}
            onAdd={addKanbanItem}
            checklistBlocks={kanbanDefs
              .filter((d) => d.allow.checklists)
              .map((d) => ({ id: d.id, title: d.title || 'Блок' }))}
            onAddChecklist={(blockId) => {
              const def = defs.find((d) => d.id === blockId)
              if (def) setPickList({ def, kind: 'checklist' })
            }}
          />
        )}

        {/* ─── окно ПРОГРЕСС: кольца + раскрывающиеся блоки ─── */}
        {win === 'progress' && (
          <>
            {dashBlocks.length > 0 && (
              <section
                className="rounded-2xl p-4 mb-3"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
              >
                <h2 className="mb-3" style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>
                  Прогресс дня
                </h2>
                <div className="flex justify-between px-1">
                  {dashBlocks.map((def, di) => {
                    const st = blockStat(def.id)
                    const pct = st.total ? st.done / st.total : 0
                    const color = RING_COLORS[di % RING_COLORS.length]
                    const Icon = RING_ICONS[di % RING_ICONS.length]
                    return (
                      <button key={def.id} onClick={() => jumpTo(def.id)} className="flex flex-col items-center gap-1">
                        <span className="relative">
                          <ProgressRing pct={pct} color={color} size={64} />
                          <span
                            className="absolute inset-0 grid place-items-center"
                            style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: 'var(--light)' }}
                          >
                            {Math.round(pct * 100)}%
                          </span>
                        </span>
                        <Icon size={14} strokeWidth={1.8} style={{ color }} />
                        <span className="max-w-[72px] truncate" style={{ fontSize: 11, color: 'var(--text-2)' }}>
                          {def.title || 'Блок'}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
                          {st.total ? `${st.done}/${st.total}` : '—'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {kanbanDefs.map((def) => {
              const bd = blockData(def.id)
              const st = blockStat(def.id)
              return (
                <div className="mb-3" key={def.id} ref={(el) => { cardEls.current[def.id] = el }}>
                  <BlockShell
                    title={def.title || 'Блок'}
                    count={st.total ? `${st.done}/${st.total}` : '—'}
                    expanded={!!open[def.id]}
                    flash={flash === def.id}
                    readOnly={readOnly}
                    progress={st.total ? st.done / st.total : 0}
                    onToggle={() => toggleBlock(def.id)}
                    onAdd={readOnly || !def.allow.items ? undefined : () => addItem(def)}
                    onMenu={readOnly ? undefined : () => setMenuBlockId(def.id)}
                  >
                    {bd.items.length === 0 && bd.lists.length === 0 && <EmptyDash />}
                    {bd.items.length > 0 && (
                      <ItemsSection
                        blockId={def.id}
                        withTime={def.withTime}
                        items={bd.items}
                        readOnly={readOnly}
                        editItem={editItem}
                        onEditItem={setEditItem}
                        onPatchItem={(itemId, patch) => patchItem(def.id, itemId, patch)}
                        onReorder={(from, to) =>
                          patchBlockData(def.id, (b) => ({ ...b, items: moveItem(b.items, from, to) }))
                        }
                        onLongPressItem={(itemId, t) => setSheet({ kind: 'item', blockId: def.id, itemId, title: t })}
                        onItemDblTap={(itemId) => {
                          const it = bd.items.find((x) => x.id === itemId)
                          if (!it) return
                          // двойной тап: в «В работе» и обратно в «План»
                          patchItem(def.id, itemId, it.status === 'work' && !it.done ? { status: 'plan' } : { done: false, status: 'work' })
                        }}
                        anyDrag={anyDrag}
                      />
                    )}
                    {bd.lists.length > 0 && (
                      <BlockLists
                        blockId={def.id}
                        lists={bd.lists}
                        readOnly={readOnly}
                        openLists={openLists}
                        onToggleList={toggleList}
                        onPatchList={(listId, fn) => patchList(def.id, listId, fn)}
                        onReorderLists={(from, to) =>
                          patchBlockData(def.id, (b) => ({ ...b, lists: moveItem(b.lists, from, to) }))
                        }
                        onLongPressList={(listId, t) => setSheet({ kind: 'list', blockId: def.id, listId, title: t })}
                        onLongPressListItem={(listId, itemId, t) =>
                          setSheet({ kind: 'listItem', blockId: def.id, listId, itemId, title: t })
                        }
                        onItemDblTap={(listId, itemId) => {
                          const lst = bd.lists.find((l) => l.id === listId)
                          const it = lst?.items.find((x) => x.id === itemId)
                          if (!it) return
                          patchList(def.id, listId, (l) => ({
                            ...l,
                            items: l.items.map((x) =>
                              x.id === itemId
                                ? it.status === 'work' && !it.done
                                  ? { ...x, status: 'plan' as const }
                                  : { ...x, done: false, status: 'work' as const }
                                : x,
                            ),
                          }))
                        }}
                        editListTitle={editListTitle}
                        onEditListTitle={setEditListTitle}
                        editListItem={editListItem}
                        onEditListItem={setEditListItem}
                        onAddListItem={(listId) => {
                          const it: BlockItem = { id: uid(), text: '', done: false }
                          patchList(def.id, listId, (l) => ({ ...l, items: [...l.items, it] }))
                          setEditListItem({ blockId: def.id, listId, itemId: it.id })
                          expandList(listId)
                        }}
                        anyDrag={anyDrag}
                      />
                    )}
                    {!readOnly && def.allow.items && (
                      <AddRow label="добавить пункт" onClick={() => addItem(def)} />
                    )}
                    {!readOnly && def.allow.checklists && (
                      <AddRow label="добавить чек-лист" onClick={() => setPickList({ def, kind: 'checklist' })} />
                    )}
                    {!readOnly && def.allow.lists && (
                      <AddRow label="добавить список" onClick={() => setPickList({ def, kind: 'list' })} />
                    )}
                  </BlockShell>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* выбор: новый под-список или готовый из «Записей» */}
      {pickList && (
        <PickListSheet
          kind={pickList.kind}
          records={listrecs.filter((r) => r.kind === pickList.kind)}
          onNew={() => addList(pickList.def, pickList.kind)}
          onPick={(rec) => insertFromRecord(pickList.def, rec)}
          onClose={() => setPickList(null)}
        />
      )}

      {/* action-sheet по long-press */}
      {sheet && (
        <ActionSheet
          title={sheet.title}
          onClose={() => setSheet(null)}
          onRename={sheetRename}
          onDelete={sheetDelete}
          renameLabel={sheet.kind === 'list' ? 'Переименовать' : undefined}
        />
      )}

      {/* меню блока (из шторки настроек и из шапки развёрнутого блока) */}
      {menuDef && (
        <BlockMenu
          def={menuDef}
          onClose={() => setMenuBlockId(null)}
          onPatch={(patch) => patchDef(menuDef.id, patch)}
          onDelete={() => deleteDef(menuDef.id)}
        />
      )}

      {/* шторка «Блоки экрана»: переименование, меню, drag-порядок, добавление */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setSettingsOpen(false)} />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl p-4 overflow-y-auto fadein"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', maxHeight: '80dvh' }}
          >
            <div className="grid place-items-center pb-3">
              <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
            </div>
            <h2 className="mb-2" style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>
              Блоки экрана
            </h2>
            <div {...blocksDrag.containerProps}>
              {defs.map((def, i) => {
                const st = blockStat(def.id)
                return (
                  <div
                    key={def.id}
                    {...blocksDrag.bindRow(i)}
                    style={blocksDrag.rowStyle(i)}
                    className="no-select flex items-center gap-2.5 rounded-xl px-2 py-2.5"
                  >
                    <GripVertical size={16} strokeWidth={1.8} className="flex-none" style={{ color: 'var(--muted)' }} />
                    {editDefId === def.id ? (
                      <input
                        ref={(el) => el?.focus()}
                        value={def.title}
                        onChange={(e) => patchDef(def.id, { title: e.target.value })}
                        onBlur={() => setEditDefId(null)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && setEditDefId(null)}
                        placeholder="Название блока"
                        className="flex-1 min-w-0 bg-transparent outline-none"
                        style={{ fontSize: 14, color: 'var(--light)', borderBottom: '1px solid var(--accent)' }}
                      />
                    ) : (
                      <span className="flex-1 min-w-0 truncate" style={{ fontSize: 14, fontWeight: 500, color: 'var(--light)' }}>
                        {def.title || 'Без названия'}
                      </span>
                    )}
                    <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                      {st.total} пунктов
                    </span>
                    <button onClick={() => setMenuBlockId(def.id)} className="flex-none p-1" title="Действия блока">
                      <MoreHorizontal size={18} strokeWidth={1.8} style={{ color: 'var(--muted)' }} />
                    </button>
                  </div>
                )
              })}
            </div>
            <AddRow label="Добавить блок" onClick={addBlockDef} />
            <button
              onClick={() => setSettingsOpen(false)}
              className="mt-3 w-full py-2.5 rounded-xl"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--muted)', fontSize: 13 }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {toast.node}
    </div>
  )
}
// пункты блока (цели/задачи/события): чекбокс (или время) + текст;
// тап по тексту НЕ открывает редактирование — только long-press → action-sheet;
// новая строка (после «добавить …») сразу в режиме инпута
function ItemsSection({
  blockId,
  withTime,
  items,
  readOnly,
  editItem,
  onEditItem,
  onPatchItem,
  onReorder,
  onLongPressItem,
  onItemDblTap,
  anyDrag,
}: {
  blockId: string
  withTime: boolean
  items: BlockItem[]
  readOnly: boolean
  editItem: EditItem | null
  onEditItem: (v: EditItem | null) => void
  onPatchItem: (itemId: string, patch: Partial<BlockItem>) => void
  onReorder: (from: number, to: number) => void
  onLongPressItem: (itemId: string, title: string) => void
  onItemDblTap?: (itemId: string) => void
  anyDrag: { current: Record<string, boolean> }
}) {
  const drag = useDragList({
    disabled: readOnly,
    onReorder,
    onLongPress: (i) => {
      const it = items[i]
      if (it) onLongPressItem(it.id, it.text || 'Пункт')
    },
  })
  anyDrag.current[`items:${blockId}`] = drag.dragging
  const dblTap = useRef<Record<string, number>>({})
  const tapRow = (it: BlockItem) => {
    if (!onItemDblTap || readOnly) return
    const now = Date.now()
    if (now - (dblTap.current[it.id] ?? 0) < 320) {
      dblTap.current[it.id] = 0
      onItemDblTap(it.id)
    } else dblTap.current[it.id] = now
  }

  return (
    <div {...drag.containerProps}>
      {items.map((it, i) => {
        const editing = editItem?.blockId === blockId && editItem.itemId === it.id && !readOnly
        const inWork = it.status === 'work' && !it.done
        return (
          <div
            key={it.id}
            {...drag.bindRow(i)}
            style={{
              ...drag.rowStyle(i),
              // дело «в работе» подсвечено оранжевым
              ...(inWork ? { background: 'rgba(232,150,60,0.16)', borderRadius: 10 } : {}),
            }}
            className="no-select flex items-center gap-2.5 px-1 py-2"
            onBlur={(e) => {
              if (editing && !e.currentTarget.contains(e.relatedTarget as Node)) onEditItem(null)
            }}
          >
            {!withTime && (
              <button
                onClick={() => onPatchItem(it.id, { done: !it.done })}
                disabled={readOnly}
                className="flex-none disabled:cursor-default"
              >
                <MCheck done={it.done} color="var(--done)" />
              </button>
            )}
            {editing ? (
              <>
                {withTime && (
                  <input
                    ref={editItem?.field === 'time' ? (el) => el?.focus() : undefined}
                    value={it.time ?? ''}
                    onChange={(e) => onPatchItem(it.id, { time: e.target.value })}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && onEditItem(null)}
                    className="w-[46px] flex-none bg-transparent outline-none"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', borderBottom: '1px solid var(--accent)' }}
                    title="Время (HH:MM)"
                  />
                )}
                <input
                  ref={editItem?.field !== 'time' ? (el) => el?.focus() : undefined}
                  value={it.text}
                  onChange={(e) => onPatchItem(it.id, { text: e.target.value })}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && onEditItem(null)}
                  placeholder="Новый пункт…"
                  className="flex-1 min-w-0 bg-transparent outline-none"
                  style={{ fontSize: 14, color: 'var(--light)', borderBottom: '1px solid var(--accent)' }}
                />
              </>
            ) : (
              <>
                {withTime && (
                  <span
                    className="w-[46px] flex-none"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}
                  >
                    {it.time || '—'}
                  </span>
                )}
                <span
                  onClick={() => tapRow(it)}
                  className="flex-1 min-w-0 truncate"
                  style={{
                    fontSize: 14,
                    color: it.done ? 'var(--muted)' : inWork ? 'var(--light)' : 'var(--text-2)',
                    textDecoration: it.done ? 'line-through' : 'none',
                    textDecorationColor: 'var(--line-strong)',
                  }}
                >
                  {it.text || <span style={{ color: 'var(--muted)' }}>Пункт…</span>}
                </span>
              </>
            )}
            {withTime && (
              <button
                onClick={() => onPatchItem(it.id, { done: !it.done })}
                disabled={readOnly}
                className="flex-none disabled:cursor-default"
                title="Отметить"
              >
                <MCheck done={it.done} color="var(--done)" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
// под-списки блока: чек-листы (ChecklistRow) и нумерованные списки (NumberedList);
// long-press по списку — action-sheet, порядок — drag как у пунктов
function BlockLists({
  blockId,
  lists,
  readOnly,
  openLists,
  onToggleList,
  onPatchList,
  onReorderLists,
  onLongPressList,
  onLongPressListItem,
  onItemDblTap,
  editListTitle,
  onEditListTitle,
  editListItem,
  onEditListItem,
  onAddListItem,
  anyDrag,
}: {
  blockId: string
  lists: BlockList[]
  readOnly: boolean
  openLists: string[]
  onToggleList: (listId: string) => void
  onPatchList: (listId: string, fn: (l: BlockList) => BlockList) => void
  onReorderLists: (from: number, to: number) => void
  onLongPressList: (listId: string, title: string) => void
  onLongPressListItem: (listId: string, itemId: string, title: string) => void
  onItemDblTap?: (listId: string, itemId: string) => void
  editListTitle: EditListTitle | null
  onEditListTitle: (v: EditListTitle | null) => void
  editListItem: EditListItem | null
  onEditListItem: (v: EditListItem | null) => void
  onAddListItem: (listId: string) => void
  anyDrag: { current: Record<string, boolean> }
}) {
  const drag = useDragList({
    disabled: readOnly,
    onReorder: onReorderLists,
    onLongPress: (i) => {
      const l = lists[i]
      if (l) onLongPressList(l.id, l.title || (l.kind === 'checklist' ? 'Чек-лист' : 'Список'))
    },
  })
  anyDrag.current[`lists:${blockId}`] = drag.dragging

  return (
    <div {...drag.containerProps}>
      {lists.map((lst, i) => {
        const expanded = openLists.includes(lst.id)
        const editTitle = editListTitle?.blockId === blockId && editListTitle.listId === lst.id
        const editItemId = editListItem?.blockId === blockId && editListItem.listId === lst.id ? editListItem.itemId : null
        return (
          <div key={lst.id} {...drag.bindRow(i)} style={drag.rowStyle(i)} className="no-select">
            {lst.kind === 'checklist' ? (
              <ChecklistRow
                inst={lst}
                expanded={expanded}
                onToggle={() => onToggleList(lst.id)}
                onToggleItem={(itemId) =>
                  onPatchList(lst.id, (l) => ({
                    ...l,
                    items: l.items.map((x) => (x.id === itemId ? { ...x, done: !x.done } : x)),
                  }))
                }
                onItemDblTap={onItemDblTap ? (itemId) => onItemDblTap(lst.id, itemId) : undefined}
                readOnly={readOnly}
                onItemLongPress={
                  readOnly
                    ? undefined
                    : (itemId) => {
                        const it = lst.items.find((x) => x.id === itemId)
                        onLongPressListItem(lst.id, itemId, it?.text || 'Пункт')
                      }
                }
                editItemId={editItemId}
                onEditItem={(itemId, text) =>
                  onPatchList(lst.id, (l) => ({
                    ...l,
                    items: l.items.map((x) => (x.id === itemId ? { ...x, text } : x)),
                  }))
                }
                onEditItemEnd={() => onEditListItem(null)}
                onReorderItem={(from, to) =>
                  onPatchList(lst.id, (l) => ({ ...l, items: moveItem(l.items, from, to) }))
                }
                editTitle={editTitle}
                onEditTitle={(text) => onPatchList(lst.id, (l) => ({ ...l, title: text }))}
                onEditTitleEnd={() => onEditListTitle(null)}
              />
            ) : (
              <NumberedList
                list={lst}
                expanded={expanded}
                onToggle={() => onToggleList(lst.id)}
                readOnly={readOnly}
                editTitle={editTitle}
                onEditTitle={(text) => onPatchList(lst.id, (l) => ({ ...l, title: text }))}
                onEditTitleEnd={() => onEditListTitle(null)}
                editItemId={editItemId}
                onEditItem={(itemId, text) =>
                  onPatchList(lst.id, (l) => ({
                    ...l,
                    items: l.items.map((x) => (x.id === itemId ? { ...x, text } : x)),
                  }))
                }
                onEditItemEnd={() => onEditListItem(null)}
                onItemLongPress={
                  readOnly
                    ? undefined
                    : (itemId) => {
                        const it = lst.items.find((x) => x.id === itemId)
                        onLongPressListItem(lst.id, itemId, it?.text || 'Пункт')
                      }
                }
                onReorderItem={(from, to) =>
                  onPatchList(lst.id, (l) => ({ ...l, items: moveItem(l.items, from, to) }))
                }
              />
            )}
            {!readOnly && expanded && (
              <button
                onClick={() => onAddListItem(lst.id)}
                className="mb-1 ml-11 flex items-center gap-1.5 rounded-lg px-2 py-1"
                style={{ color: 'var(--muted)', fontSize: 12 }}
              >
                <Plus size={12} strokeWidth={1.8} /> добавить пункт
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// нумерованный список: 1. 2. 3. без чекбоксов и зачёркивания
function NumberedList({
  list,
  expanded,
  onToggle,
  readOnly,
  editTitle,
  onEditTitle,
  onEditTitleEnd,
  editItemId,
  onEditItem,
  onEditItemEnd,
  onItemLongPress,
  onReorderItem,
}: {
  list: BlockList
  expanded: boolean
  onToggle: () => void
  readOnly?: boolean
  editTitle?: boolean
  onEditTitle?: (text: string) => void
  onEditTitleEnd?: () => void
  editItemId?: string | null
  onEditItem?: (itemId: string, text: string) => void
  onEditItemEnd?: () => void
  onItemLongPress?: (itemId: string) => void
  onReorderItem?: (from: number, to: number) => void
}) {
  const drag = useDragList({
    disabled: readOnly || !onReorderItem,
    onReorder: (from, to) => onReorderItem?.(from, to),
    onLongPress: (index) => {
      const it = list.items[index]
      if (it) onItemLongPress?.(it.id)
    },
  })

  return (
    <div>
      <div onClick={onToggle} role="button" className="no-select w-full flex items-center gap-3 py-2.5 text-left">
        <span className="grid place-items-center rounded-lg flex-none" style={{ width: 32, height: 32, background: 'var(--ring-tasks)' }}>
          <ListOrdered size={16} strokeWidth={1.8} style={{ color: 'var(--on-fill)' }} />
        </span>
        <span className="flex-1 min-w-0">
          {editTitle && !readOnly ? (
            <input
              ref={(el) => el?.focus()}
              value={list.title}
              onChange={(e) => onEditTitle?.(e.target.value)}
              onBlur={onEditTitleEnd}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && onEditTitleEnd?.()}
              onClick={(e) => e.stopPropagation()}
              placeholder="Название списка"
              className="block w-full min-w-0 bg-transparent outline-none"
              style={{ fontSize: 14, fontWeight: 500, color: 'var(--light)', borderBottom: '1px solid var(--accent)' }}
            />
          ) : (
            <span className="block truncate" style={{ fontSize: 14, fontWeight: 500, color: 'var(--light)' }}>
              {list.title || 'Список'}
            </span>
          )}
        </span>
        <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
          {list.items.length} п.
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.8}
          className="flex-none transition-transform"
          style={{ color: 'var(--muted)', transform: expanded ? 'rotate(180deg)' : 'none' }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: 'grid-template-rows .3s cubic-bezier(0.65,0,0.35,1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="pl-11 pr-1 pb-1" {...drag.containerProps}>
            {list.items.map((it, idx) => (
              <div
                key={it.id}
                {...drag.bindRow(idx)}
                style={drag.rowStyle(idx)}
                className="no-select flex items-center gap-2.5 py-2"
              >
                <span className="flex-none w-5 text-right" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                  {idx + 1}.
                </span>
                {editItemId === it.id && !readOnly ? (
                  <input
                    ref={(el) => el?.focus()}
                    value={it.text}
                    onChange={(e) => onEditItem?.(it.id, e.target.value)}
                    onBlur={onEditItemEnd}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && onEditItemEnd?.()}
                    className="flex-1 min-w-0 bg-transparent outline-none"
                    style={{ fontSize: 13, color: 'var(--light)', borderBottom: '1px solid var(--accent)' }}
                  />
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--light)' }}>{it.text}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
// сворачиваемый блок: заголовок (тап — свернуть, long-press — добавить пункт,
// «…» — меню блока) + прогресс-линия под заголовком + контент-аккордеон
function BlockShell({
  title,
  count,
  expanded,
  flash,
  readOnly,
  progress,
  onToggle,
  onAdd,
  onMenu,
  children,
}: {
  title: string
  count: string
  expanded: boolean
  flash?: boolean
  readOnly?: boolean
  progress: number
  onToggle: () => void
  onAdd?: () => void
  onMenu?: () => void
  children: ReactNode
}) {
  return (
    <section
      className="rounded-2xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        transition: 'box-shadow .3s ease, border-color .3s ease',
        ...(flash ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 1px var(--accent)' } : {}),
      }}
    >
      <LongPressRow
        disabled={readOnly || !onAdd}
        onLongPress={onAdd ?? (() => {})}
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 pt-3.5 pb-2"
      >
        <span
          className="flex-1 text-left"
          style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--light)' }}
        >
          {title}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{count}</span>
        {!readOnly && expanded && onMenu && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMenu()
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 -mr-1"
            title="Действия блока"
          >
            <MoreHorizontal size={18} strokeWidth={1.8} style={{ color: 'var(--muted)' }} />
          </button>
        )}
        <ChevronDown
          size={16}
          strokeWidth={1.8}
          style={{ color: 'var(--muted)', transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none' }}
        />
      </LongPressRow>
      {/* прогресс-линия блока — всегда, и в свёрнутом виде */}
      <div className="mx-4 mb-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
        <span
          className="block h-full rounded-full"
          style={{ width: `${progress * 100}%`, background: 'var(--accent)', transition: 'width .35s ease' }}
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: 'grid-template-rows .3s cubic-bezier(0.65,0,0.35,1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="px-3 pb-3">{children}</div>
        </div>
      </div>
    </section>
  )
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-1 flex w-full items-center gap-2 rounded-xl border border-dashed px-3 py-2"
      style={{ borderColor: 'var(--line-strong)', color: 'var(--muted)', fontSize: 13 }}
    >
      <Plus size={14} strokeWidth={1.8} /> {label}
    </button>
  )
}

function EmptyDash() {
  return (
    <p className="py-3 text-center" style={{ fontSize: 13, color: 'var(--muted)' }}>
      —
    </p>
  )
}
