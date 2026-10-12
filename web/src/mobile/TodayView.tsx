import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import {
  ChevronDown,
  CircleCheck,
  Columns2,
  FolderInput,
  ListChecks,
  ListOrdered,
  ListTodo,
  ListTree,
  MoreHorizontal,
  Plus,
  Rows2,
  Target,
  Clock,
  type LucideIcon,
} from 'lucide-react'
import {
  type BlockDef,
  type BlockItem,
  type BlockList,
  type ListRecord,
  type TodayData,
  moveItem,
  seedDayBlocks,
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
// источник переноса пункта: из корня блока (listId=null) или из под-списка
type MoveSrc = { blockId: string; listId: string | null; itemId: string }

type Win = 'day' | 'progress' | 'kanban'
const WINS: { id: Win; label: string }[] = [
  { id: 'day', label: 'День' },
  { id: 'progress', label: 'Прогресс' },
  { id: 'kanban', label: 'Канбан' },
]

const EMPTY_BLOCK: TodayData[string] = { items: [], lists: [] }

// длинный текст пункта переносится до 3 строк, дальше — многоточие
const CLAMP3: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'break-word',
}

// константный блок целей — есть всегда, даже если его def удалили
const GOALS_DEF: BlockDef = {
  id: 'goals',
  title: 'Цели',
  withTime: false,
  inDashboard: true,
  allow: { items: true, checklists: false, lists: false, sub: false },
}

// группы пунктов: «в работе» ↑, план, выполненные ↓
const groupOf = (x: BlockItem): 'work' | 'plan' | 'done' => (x.done ? 'done' : x.status === 'work' ? 'work' : 'plan')
const rankOf = (x: BlockItem) => (x.done ? 2 : x.status === 'work' ? 0 : 1)
// умная сортировка с памятью: внутри группы пункт встаёт на запомненное место
// (pos[группа]); без памяти — в конец группы; равные — по текущему порядку (стабильно)
const sortItems = (items: BlockItem[]): BlockItem[] =>
  items
    .map((x, i) => ({ x, i }))
    .sort((a, b) => {
      const ra = rankOf(a.x)
      const rb = rankOf(b.x)
      if (ra !== rb) return ra - rb
      const pa = a.x.pos?.[groupOf(a.x)] ?? Number.POSITIVE_INFINITY
      const pb = b.x.pos?.[groupOf(b.x)] ?? Number.POSITIVE_INFINITY
      return pa - pb || a.i - b.i
    })
    .map((p) => p.x)
// ручной drag запоминается: перезаписываем pos каждой группы по текущему порядку
const stampPos = (items: BlockItem[]): BlockItem[] => {
  const c = { work: 0, plan: 0, done: 0 }
  return items.map((x) => {
    const g = groupOf(x)
    return { ...x, pos: { ...x.pos, [g]: c[g]++ } }
  })
}

// «Скрыть выполненные»: жесты (drag/merge/long-press) приходят с индексами ВИДИМОГО
// списка — переводим их в индексы полного массива по id
const visItems = (items: BlockItem[], hideDone?: boolean) => (hideDone ? items.filter((x) => !x.done) : items)
const fullIdx = (full: BlockItem[], vis: BlockItem[], i: number) => full.findIndex((x) => x.id === vis[i]?.id)

// рекурсивные обходчики дерева под-списков (подблоки вкладываются друг в друга)
const mapListDeep = (lists: BlockList[], id: string, fn: (l: BlockList) => BlockList): BlockList[] =>
  lists.map((l) => (l.id === id ? fn(l) : l.lists ? { ...l, lists: mapListDeep(l.lists, id, fn) } : l))
const findListDeep = (lists: BlockList[], id: string): BlockList | null => {
  for (const l of lists) {
    if (l.id === id) return l
    const hit = l.lists ? findListDeep(l.lists, id) : null
    if (hit) return hit
  }
  return null
}
// пункты для статистики/канбана: чек-листы и подблоки на любой глубине (нумерованные списки не считаются)
const collectTaskItems = (lists: BlockList[]): { listId: string; listTitle: string; item: BlockItem }[] =>
  lists.flatMap((l) => [
    ...(l.kind === 'list' ? [] : l.items.map((item) => ({ listId: l.id, listTitle: l.title, item }))),
    ...collectTaskItems(l.lists ?? []),
  ])

// цвета и иконки колец дашборда — цикл по четырём существующим
const RING_COLORS = ['var(--ring-goals)', 'var(--ring-schedule)', 'var(--ring-checklists)', 'var(--ring-tasks)']
const RING_ICONS = [Target, Clock, CircleCheck, ListTodo]

const fmtKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const WD_SHORT = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']

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
  const readOnly = offset < 0

  // блоки — отдельные сущности каждого дня: добавленный блок живёт только в этой дате
  const [defs, setDefs] = useLS<BlockDef[]>(`aod4-today-blocks-${dateKey}`, seedDayBlocks())
  // вид экрана «Прогресс»: список блоков / доска с плашками (как папки в Telegram)
  const [viewMode, setViewMode] = useLS<'list' | 'board'>('aod4-today-viewmode', 'list')
  const [listrecs] = useLS<ListRecord[]>('aod4-listrecs', [])
  // readOnly-день (вчера): мигрируем только то, что было в legacy, без дефолтов
  const [data, setData] = useLS<TodayData>(`aod4-today-data-${dateKey}`, seedTodayData(dateKey, wdName, readOnly))

  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [openLists, setOpenLists] = useState<string[]>([])
  const [editItem, setEditItem] = useState<EditItem | null>(null)
  const [editListItem, setEditListItem] = useState<EditListItem | null>(null)
  const [editListTitle, setEditListTitle] = useState<EditListTitle | null>(null)
  const [sheet, setSheet] = useState<SheetTarget | null>(null)
  // PickListSheet работает только с записями «Записей»: чек-лист или нумерованный список (подблоки создаются напрямую)
  const [pickList, setPickList] = useState<{ def: BlockDef; kind: 'checklist' | 'list' } | null>(null)
  const [ringsOpen, setRingsOpen] = useState(false)
  const [goalsOpen, setGoalsOpen] = useState(true)
  const [moveReq, setMoveReq] = useState<MoveSrc | null>(null)
  // режим «Доска»: какая плашка-блок сейчас на экране
  const [boardId, setBoardId] = useState<string | null>(null)
  const [menuBlockId, setMenuBlockId] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const toast = useToast()

  const cardEls = useRef<Record<string, HTMLElement | null>>({})

  // ─── данные блоков ───
  const blockData = (id: string) => data[id] ?? EMPTY_BLOCK

  // прогресс блока = пункты + пункты чек-листов/подблоков (на любой глубине); нумерованные списки не считаются
  const blockStat = (id: string) => {
    const b = blockData(id)
    const all = [...b.items, ...collectTaskItems(b.lists).map((p) => p.item)]
    return { done: all.filter((i) => i.done).length, total: all.length }
  }

  // после любой правки пункты пересортировываются: «в работе» ↑, выполненные ↓.
  // исключения: блоки с временем (там порядок по часам) и нумерованные списки (порядок = нумерация)
  const patchBlockData = (blockId: string, fn: (b: TodayData[string]) => TodayData[string]) =>
    setData((d) => {
      const next = fn(d[blockId] ?? { items: [], lists: [] })
      const withTime = defs.find((x) => x.id === blockId)?.withTime
      return { ...d, [blockId]: withTime ? next : { ...next, items: sortItems(next.items) } }
    })
  const patchItem = (blockId: string, itemId: string, patch: Partial<BlockItem>) =>
    patchBlockData(blockId, (b) => ({ ...b, items: b.items.map((x) => (x.id === itemId ? { ...x, ...patch } : x)) }))
  // под-список ищется на любой глубине; пункты чек-листов и подблоков пересортировываются,
  // нумерованные списки — нет (порядок = нумерация)
  const patchList = (blockId: string, listId: string, fn: (l: BlockList) => BlockList) =>
    patchBlockData(blockId, (b) => ({
      ...b,
      lists: mapListDeep(b.lists, listId, (l) => {
        const next = fn(l)
        return next.kind === 'list' ? next : { ...next, items: sortItems(next.items) }
      }),
    }))

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
    const cloneList = (l: BlockList): BlockList => ({
      id: uid(),
      kind: l.kind,
      title: l.title,
      items: l.items.map((it) => ({ id: uid(), text: it.text, done: false })),
      lists: l.lists?.map(cloneList),
    })
    const lst: BlockList = {
      id: uid(),
      kind: rec.kind,
      title: rec.title,
      items: rec.items.map((it) => ({ id: uid(), text: it.text, done: false })),
      lists: rec.lists?.map(cloneList),
    }
    patchBlockData(def.id, (b) => ({ ...b, lists: [...b.lists, lst] }))
    openBlock(def.id)
    expandList(lst.id)
  }

  // подблок: создаётся внутри блока (parentListId=null) или внутри чек-листа/подблока;
  // название не обязательно — поэтому инлайн-инпут не открываем
  const addSubBlock = (blockId: string, parentListId: string | null) => {
    const lst: BlockList = { id: uid(), kind: 'sub', title: '', items: [] }
    if (parentListId) {
      patchList(blockId, parentListId, (l) => ({ ...l, lists: [...(l.lists ?? []), lst] }))
      expandList(parentListId)
    } else {
      patchBlockData(blockId, (b) => ({ ...b, lists: [...b.lists, lst] }))
      openBlock(blockId)
    }
    expandList(lst.id)
  }

  // удержание поднятого пункта над другим ~700ms → оба уезжают в новый подблок
  // (наведённый первым); пункты исчезают из исходного контейнера
  const mergeIntoSub = (blockId: string, listId: string | null, from: number, to: number) => {
    const bd = blockData(blockId)
    const container = listId ? findListDeep(bd.lists, listId) : null
    const items = listId ? (container?.items ?? []) : bd.items
    const hovered = items[to]
    const dragged = items[from]
    if (!hovered || !dragged) return
    const sub: BlockList = { id: uid(), kind: 'sub', title: '', items: [hovered, dragged] }
    const drop = (xs: BlockItem[]) => xs.filter((x) => x.id !== hovered.id && x.id !== dragged.id)
    if (listId) patchList(blockId, listId, (l) => ({ ...l, items: drop(l.items), lists: [...(l.lists ?? []), sub] }))
    else patchBlockData(blockId, (b) => ({ ...b, items: drop(b.items), lists: [...b.lists, sub] }))
    if (listId) expandList(listId)
    expandList(sub.id)
    toast.show('Создан подблок')
  }

  // перенос пункта из moveReq в выбранный контейнер (блок / чек-лист / подблок)
  const moveItemTo = (dstBlockId: string, dstListId: string | null) => {
    const src = moveReq
    if (!src) return
    if (src.blockId === dstBlockId && src.listId === dstListId) {
      setMoveReq(null)
      return
    }
    const srcB = blockData(src.blockId)
    const srcList = src.listId ? findListDeep(srcB.lists, src.listId) : null
    const it = (src.listId ? srcList?.items : srcB.items)?.find((x) => x.id === src.itemId)
    if (!it) {
      setMoveReq(null)
      return
    }
    if (src.listId) patchList(src.blockId, src.listId, (l) => ({ ...l, items: l.items.filter((x) => x.id !== it.id) }))
    else patchBlockData(src.blockId, (b) => ({ ...b, items: b.items.filter((x) => x.id !== it.id) }))
    if (dstListId) patchList(dstBlockId, dstListId, (l) => ({ ...l, items: [...l.items, it] }))
    else patchBlockData(dstBlockId, (b) => ({ ...b, items: [...b.items, it] }))
    setMoveReq(null)
  }

  // ─── настройка блоков (глобально, не зависит от дня) ───
  const patchDef = (id: string, patch: Partial<BlockDef>) =>
    setDefs((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  const deleteDef = (id: string) => setDefs((ds) => ds.filter((d) => d.id !== id))
  // новый блок — крайний снизу, но перед полностью выполненными; возвращает id (для режима «Доска»)
  const addBlockDef = (): string => {
    const def: BlockDef = {
      id: uid(),
      title: '',
      withTime: false,
      inDashboard: true,
      allow: { items: true, checklists: false, lists: false, sub: true },
    }
    setDefs((ds) => {
      const idx = ds.findIndex((d) => {
        const s = blockStat(d.id)
        return s.total > 0 && s.done === s.total
      })
      if (idx === -1) return [...ds, def]
      const next = [...ds]
      next.splice(idx, 0, def)
      return next
    })
    return def.id
  }

  const jumpTo = (id: string) => {
    setWin('progress')
    setOpen((o) => ({ ...o, [id]: true }))
    if (viewMode === 'board') {
      // в режиме доски просто переключаем активную плашку
      setBoardId(id)
      setFlash(id)
      window.setTimeout(() => setFlash((f) => (f === id ? null : f)), 600)
      return
    }
    window.setTimeout(() => {
      cardEls.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setFlash(id)
      window.setTimeout(() => setFlash((f) => (f === id ? null : f)), 600)
    }, 60)
  }

  // ─── смена дня: стрелки датабара или полоса недели ───
  const changeOffset = (next: number) => {
    setOffset(next)
    setSheet(null)
    setEditItem(null)
    setEditListItem(null)
    setEditListTitle(null)
    setFlash(null)
  }

  const openBlock = (b: string) => setOpen((o) => ({ ...o, [b]: true }))
  const toggleBlock = (b: string) => setOpen((o) => ({ ...o, [b]: !o[b] }))
  const expandList = (id: string) =>
    setOpenLists((xs) => (xs.includes(id) ? xs : [...xs, id]))
  const toggleList = (id: string) =>
    setOpenLists((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]))

  // ─── drag-сортировка блоков прямо в дашборде (жест на СВЁРНУТОМ блоке) ───
  const progDrag = useDragList({
    disabled: readOnly,
    onReorder: (from, to) => {
      const a = progressDefs[from]
      const b = progressDefs[to]
      if (!a || !b) return
      setDefs((ds) => {
        const fi = ds.findIndex((d) => d.id === a.id)
        const ti = ds.findIndex((d) => d.id === b.id)
        if (fi < 0 || ti < 0) return ds
        return moveItem(ds, fi, ti)
      })
    },
    onLongPress: () => {},
  })

  // свайп влево/вправо по области доски — переключение плашек
  const swipeX = useRef<number | null>(null)
  const boardSwipe = {
    onTouchStart: (e: ReactTouchEvent) => {
      swipeX.current = e.touches[0]?.clientX ?? null
    },
    onTouchEnd: (e: ReactTouchEvent) => {
      if (swipeX.current == null) return
      const dx = (e.changedTouches[0]?.clientX ?? swipeX.current) - swipeX.current
      swipeX.current = null
      if (Math.abs(dx) < 60) return
      const ids = progressDefs.map((d) => d.id)
      const cur = ids.indexOf(boardActive?.id ?? '')
      const next = cur + (dx < 0 ? 1 : -1)
      if (cur >= 0 && next >= 0 && next < ids.length) setBoardId(ids[next])
    },
  }

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
    let def = schedDefs[0]
    // блока расписания нет (удалён/старая схема) — создаём его для этого дня
    if (!def) {
      def = { id: uid(), title: 'Расписание', withTime: true, inDashboard: false, allow: { items: true, checklists: false, lists: false, sub: false } }
      const d = def
      setDefs((ds) => [...ds, d])
    }
    const it: BlockItem = { id: uid(), text: '', done: false, time, dur: 60 }
    patchBlockData(def.id, (b) => ({ ...b, items: [...b.items, it] }))
    return it.id
  }

  // канбан: пункты всех блоков без времени + пункты чек-листов
  const kanbanEntries: KanbanEntry[] = kanbanDefs.flatMap((def) => {
    const bd = blockData(def.id)
    const color = RING_COLORS[defs.indexOf(def) % RING_COLORS.length]
    const direct = bd.items.map((item) => ({ blockId: def.id, item, badge: def.title || 'Блок', color }))
    const fromLists = collectTaskItems(bd.lists).map((p) => ({
      blockId: def.id,
      listId: p.listId,
      item: p.item,
      badge: p.listTitle || def.title || 'Чек-лист', // контейнер = сам чек-лист/подблок
      color,
    }))
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

  // куда можно перенести пункт: блоки с включёнными «Пунктами» + чек-листы и подблоки на любой глубине
  const moveDests = kanbanDefs.flatMap((d) => {
    const rows: { blockId: string; listId: string | null; label: string; depth: number }[] = []
    if (d.allow.items) rows.push({ blockId: d.id, listId: null, label: d.title || 'Блок', depth: 0 })
    const walk = (lists: BlockList[], depth: number) =>
      lists.forEach((l) => {
        if (l.kind === 'list') return // в нумерованные списки не переносим: порядок = нумерация
        rows.push({ blockId: d.id, listId: l.id, label: l.title || (l.kind === 'sub' ? 'Подблок' : 'Чек-лист'), depth })
        walk(l.lists ?? [], depth + 1)
      })
    walk(blockData(d.id).lists, 1)
    return rows
  })

  // дополнительные действия action-sheet: перенос пункта / конвертация чек-лист ↔ подблок
  const sheetExtras = (t: SheetTarget): { icon: LucideIcon; label: string; onClick: () => void }[] => {
    if (t.kind === 'item' || t.kind === 'listItem') {
      const src: MoveSrc =
        t.kind === 'item'
          ? { blockId: t.blockId, listId: null, itemId: t.itemId }
          : { blockId: t.blockId, listId: t.listId, itemId: t.itemId }
      return [{ icon: FolderInput, label: 'Переместить в…', onClick: () => setMoveReq(src) }]
    }
    const l = findListDeep(blockData(t.blockId).lists, t.listId)
    if (!l || l.kind === 'list') return []
    return [
      {
        icon: l.kind === 'checklist' ? ListTree : ListChecks,
        label: l.kind === 'checklist' ? 'Сделать подблоком' : 'Сделать чек-листом',
        onClick: () =>
          patchList(t.blockId, t.listId, (x) => ({ ...x, kind: x.kind === 'checklist' ? 'sub' : 'checklist' })),
      },
    ]
  }

  // единственный круг «День» считает ВСЕ пункты дня: цели, расписание, чек-листы
  const allDefs = defs.some((d) => d.id === 'goals') ? defs : [...defs, GOALS_DEF]
  const dayStat = allDefs.reduce(
    (acc, d) => {
      const s = blockStat(d.id)
      return { done: acc.done + s.done, total: acc.total + s.total }
    },
    { done: 0, total: 0 },
  )
  // цели — константный блок: живёт даже если его def удалили из настроек
  const goalsDef = defs.find((d) => d.id === 'goals') ?? GOALS_DEF
  const goalsStat = blockStat('goals')
  const isDoneDef = (d: BlockDef) => {
    const s = blockStat(d.id)
    return s.total > 0 && s.done === s.total
  }
  // порядок в окне «Прогресс»: активные блоки, выполненные — внизу;
  // цели отдельным блоком не выводятся — они пунктами внутри карточки «Прогресс дня»
  const restDefs = kanbanDefs.filter((d) => d.id !== 'goals')
  const progressDefs = [...restDefs.filter((d) => !isDoneDef(d)), ...restDefs.filter(isDoneDef)]
  // активная плашка режима «Доска»
  const boardActive = (boardId && progressDefs.find((d) => d.id === boardId)) || progressDefs[0] || null
  // дополнительные кольца (свернуты под полосочкой): блоки с «Показывать в дашборде», кроме целей
  const extraRings = dashBlocks
    .filter((d) => d.id !== 'goals')
    .map((d) => ({ id: d.id, label: d.title || 'Блок', ...blockStat(d.id) }))

  // карточка блока прогресса; dragBind — жест перестановки (только свёрнутые, режим «Список»)
  const renderBlock = (
    def: BlockDef,
    dragBind?: {
      refEl: (el: HTMLDivElement | null) => void
      handlers: {
        onTouchStart?: (e: ReactTouchEvent<HTMLElement>) => void
        onMouseDown?: (e: ReactMouseEvent<HTMLElement>) => void
      }
      style: CSSProperties
    },
  ) => {
    const bd = blockData(def.id)
    const st = blockStat(def.id)
    const hide = !!def.hideDone
    const vis = visItems(bd.items, hide)
    return (
      <div
        // no-select обязателен: без него Android WebView на long-press начинает
        // нативное выделение и шлёт touchcancel — drag блока умирает (в браузере не воспроизводится)
        className="mb-3 no-select"
        key={def.id}
        ref={(el) => {
          cardEls.current[def.id] = el
          dragBind?.refEl(el)
        }}
        {...(dragBind?.handlers ?? {})}
        style={{ WebkitTouchCallout: 'none', ...dragBind?.style }}
      >
        <BlockShell
          title={def.title || 'Блок'}
          count={st.total ? `${st.done}/${st.total}` : '—'}
          expanded={!!open[def.id]}
          flash={flash === def.id}
          readOnly={readOnly}
          progress={st.total ? st.done / st.total : 0}
          onToggle={() => toggleBlock(def.id)}
          onAdd={readOnly || !def.allow.items ? undefined : () => addItem(def)}
          // меню только для реальных def: константные «Цели» без def не настраиваются
          onMenu={readOnly || !defs.some((d) => d.id === def.id) ? undefined : () => setMenuBlockId(def.id)}
        >
          {vis.length === 0 && bd.lists.length === 0 && <EmptyDash />}
          {vis.length > 0 && (
            <ItemsSection
              blockId={def.id}
              withTime={def.withTime}
              items={vis}
              readOnly={readOnly}
              editItem={editItem}
              onEditItem={setEditItem}
              onPatchItem={(itemId, patch) => patchItem(def.id, itemId, patch)}
              onReorder={(from, to) =>
                patchBlockData(def.id, (b) => {
                  const v = visItems(b.items, hide)
                  return { ...b, items: stampPos(moveItem(b.items, fullIdx(b.items, v, from), fullIdx(b.items, v, to))) }
                })
              }
              onLongPressItem={(itemId, t) => setSheet({ kind: 'item', blockId: def.id, itemId, title: t })}
              onMerge={(from, to) => {
                const f = fullIdx(bd.items, vis, from)
                const t = fullIdx(bd.items, vis, to)
                if (f >= 0 && t >= 0) mergeIntoSub(def.id, null, f, t)
              }}
              onItemDblTap={(itemId) => {
                const it = bd.items.find((x) => x.id === itemId)
                if (!it) return
                // двойной тап: в «В работе» и обратно в «План»
                patchItem(def.id, itemId, it.status === 'work' && !it.done ? { status: 'plan' } : { done: false, status: 'work' })
              }}
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
                const lst = findListDeep(bd.lists, listId)
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
              onAddSubList={(parentListId) => addSubBlock(def.id, parentListId)}
              onMergeItem={(listId, from, to) => mergeIntoSub(def.id, listId, from, to)}
              hideDone={hide}
            />
          )}
          {!readOnly && def.allow.items && (
            <AddRow label="добавить пункт" onClick={() => addItem(def)} />
          )}
          {!readOnly && def.allow.sub && (
            <AddRow label="добавить подблок" onClick={() => addSubBlock(def.id, null)} />
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
  }

  return (
    <div className="px-4 pt-5 pb-28">
      {/* закреплённая шапка (как в Telegram): полоса недели + сегмент окон
          остаются на месте при прокрутке вниз */}
      <div
        className="sticky top-0 z-30 -mx-4 px-4 pt-1 pb-1"
        style={{ background: 'color-mix(in srgb, var(--bg) 85%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        {/* календарь-полоса недели: тап — выбор дня, свайп — неделя ± */}
        <WeekStrip viewDate={viewDate} onPick={changeOffset} />

        {/* сегмент окон: День / Прогресс / Канбан (переключение только тапом) */}
        <div
          className="grid grid-cols-3 gap-1 rounded-xl p-1 mb-2"
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
      </div>

      <div key={`${dateKey}:${win}`} className="fadein">
        {/* ─── окно ДЕНЬ: цели дня + таймлайн расписания (всегда: часы + красная линия «сейчас») ─── */}
        {win === 'day' && (
          <>
            {/* цели — те же пункты, что в блоке «Цели» на прогрессе: зачёркиваются везде сразу */}
            <section
              className="rounded-2xl px-3 py-2 mb-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            >
              <div className="flex items-center gap-2 px-1 py-1">
                <Target size={15} strokeWidth={1.8} style={{ color: 'var(--ring-goals)' }} />
                <span className="flex-1" style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>
                  Цели
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                  {goalsStat.total ? `${goalsStat.done}/${goalsStat.total}` : '—'}
                </span>
              </div>
              <ItemsSection
                blockId="goals"
                withTime={false}
                items={blockData('goals').items}
                readOnly={readOnly}
                editItem={editItem}
                onEditItem={setEditItem}
                onPatchItem={(itemId, patch) => patchItem('goals', itemId, patch)}
                onReorder={(from, to) =>
                  patchBlockData('goals', (b) => ({ ...b, items: stampPos(moveItem(b.items, from, to)) }))
                }
                onLongPressItem={(itemId, t) => setSheet({ kind: 'item', blockId: 'goals', itemId, title: t })}
              />
              {!readOnly && <AddRow label="добавить цель" onClick={() => addItem(goalsDef)} />}
            </section>
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
          </>
        )}

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

        {/* ─── окно ПРОГРЕСС: кольца + настройки блоков + раскрывающиеся блоки ─── */}
        {win === 'progress' && (
          <>
            <section
              className="rounded-2xl px-3 py-2.5 mb-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            >
              {/* одна компактная строка: круг дня + счёт + цели (особый дефолтный чек-лист)
                  + переключение вида список/доска; в свёрнутом виде карточка занимает минимум */}
              <div className="flex items-start gap-2.5">
                <span className="relative flex-none pt-0.5">
                  <ProgressRing pct={dayStat.total ? dayStat.done / dayStat.total : 0} color="var(--accent)" size={44} />
                  <span
                    className="absolute inset-0 grid place-items-center"
                    style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700, color: 'var(--light)' }}
                  >
                    {Math.round((dayStat.total ? dayStat.done / dayStat.total : 0) * 100)}%
                  </span>
                </span>
                <span className="flex-none pt-4" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                  {dayStat.done}/{dayStat.total}
                </span>
                <div className="flex-1 min-w-0">
                  <ChecklistRow
                    inst={{ title: 'Цели', color: 'var(--ring-goals)', items: blockData('goals').items }}
                    icon={Target}
                    expanded={goalsOpen}
                    onToggle={() => setGoalsOpen((v) => !v)}
                    onToggleItem={(itemId) => {
                      const it = blockData('goals').items.find((x) => x.id === itemId)
                      if (it) patchItem('goals', itemId, { done: !it.done })
                    }}
                    onItemDblTap={(itemId) => {
                      const it = blockData('goals').items.find((x) => x.id === itemId)
                      if (!it) return
                      patchItem('goals', itemId, it.status === 'work' && !it.done ? { status: 'plan' } : { done: false, status: 'work' })
                    }}
                    readOnly={readOnly}
                    onItemLongPress={
                      readOnly
                        ? undefined
                        : (itemId) => {
                            const it = blockData('goals').items.find((x) => x.id === itemId)
                            setSheet({ kind: 'item', blockId: 'goals', itemId, title: it?.text || 'Цель' })
                          }
                    }
                    editItemId={editItem?.blockId === 'goals' ? editItem.itemId : null}
                    onEditItem={(itemId, text) => patchItem('goals', itemId, { text })}
                    onEditItemEnd={() => setEditItem(null)}
                    onReorderItem={(from, to) =>
                      patchBlockData('goals', (b) => ({ ...b, items: stampPos(moveItem(b.items, from, to)) }))
                    }
                  >
                    {!readOnly && <AddRow label="добавить цель" onClick={() => addItem(goalsDef)} />}
                  </ChecklistRow>
                </div>
                {/* вид прогресса: список (одна строка) / доска (колонки) */}
                <div className="flex-none flex flex-col gap-0.5 pt-1">
                  <button onClick={() => setViewMode('list')} title="Список" className="p-1">
                    <Rows2 size={15} strokeWidth={1.8} style={{ color: viewMode === 'list' ? 'var(--accent)' : 'var(--muted)' }} />
                  </button>
                  <button onClick={() => setViewMode('board')} title="Доска" className="p-1">
                    <Columns2 size={15} strokeWidth={1.8} style={{ color: viewMode === 'board' ? 'var(--accent)' : 'var(--muted)' }} />
                  </button>
                </div>
              </div>
              {/* остальные кольца свернуты: полосочка внизу разворачивает/сворачивает */}
              {extraRings.length > 0 && (
                <>
                  <div
                    className="grid transition-[grid-template-rows] duration-300"
                    style={{ gridTemplateRows: ringsOpen ? '1fr' : '0fr' }}
                  >
                    <div className="overflow-hidden">
                      <div className="flex flex-wrap gap-x-4 gap-y-3 px-1 pt-3">
                        {extraRings.map((r, di) => {
                          const pct = r.total ? r.done / r.total : 0
                          const color = RING_COLORS[(di + 2) % RING_COLORS.length]
                          const Icon = RING_ICONS[(di + 2) % RING_ICONS.length]
                          return (
                            <button key={r.id} onClick={() => jumpTo(r.id)} className="flex flex-col items-center gap-1">
                              <span className="relative">
                                <ProgressRing pct={pct} color={color} size={56} />
                                <span
                                  className="absolute inset-0 grid place-items-center"
                                  style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, color: 'var(--light)' }}
                                >
                                  {Math.round(pct * 100)}%
                                </span>
                              </span>
                              <Icon size={13} strokeWidth={1.8} style={{ color }} />
                              <span className="max-w-[72px] truncate" style={{ fontSize: 11, color: 'var(--text-2)' }}>
                                {r.label}
                              </span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
                                {r.total ? `${r.done}/${r.total}` : '—'}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setRingsOpen((v) => !v)}
                    className="mt-2 w-full grid place-items-center py-1"
                    title={ringsOpen ? 'Свернуть кольца' : 'Все кольца'}
                  >
                    <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
                  </button>
                </>
              )}
            </section>

            {viewMode === 'board' ? (
              /* режим «Доска»: плашки-вкладки как папки в Telegram, на экране один блок;
                 переключение — тап по плашке, тап по кольцу в дашборде или свайп ← → */
              <>
                <div className="flex gap-1.5 overflow-x-auto mb-3 pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                  {progressDefs.map((d) => {
                    const st = blockStat(d.id)
                    const active = boardActive?.id === d.id
                    return (
                      <button
                        key={d.id}
                        onClick={() => setBoardId(d.id)}
                        className="flex-none rounded-xl px-3 py-1.5"
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          background: active ? 'var(--accent)' : 'var(--surface)',
                          color: active ? 'var(--on-fill)' : 'var(--muted)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        {d.title || 'Блок'} · {st.done}/{st.total}
                      </button>
                    )
                  })}
                  {!readOnly && (
                    <button
                      onClick={() => setBoardId(addBlockDef())}
                      className="flex-none rounded-xl px-4 py-1.5 grid place-items-center"
                      style={{ border: '1px dashed var(--line-strong)', color: 'var(--muted)' }}
                      title="Новый блок"
                    >
                      <Plus size={14} strokeWidth={2} />
                    </button>
                  )}
                </div>
                <div {...boardSwipe}>{boardActive && renderBlock(boardActive)}</div>
              </>
            ) : (
              /* режим «Список»: все блоки стопкой; свёрнутый блок перетаскивается зажатием */
              <div {...progDrag.containerProps}>
                {progressDefs.map((def, i) => {
                  const bnd = progDrag.bindRow(i)
                  return renderBlock(def, {
                    refEl: bnd.ref,
                    handlers: open[def.id] ? {} : { onTouchStart: bnd.onTouchStart, onMouseDown: bnd.onMouseDown },
                    style: progDrag.rowStyle(i),
                  })
                })}
                {!readOnly && <AddRow label="добавить блок" onClick={addBlockDef} />}
              </div>
            )}
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
          extras={sheetExtras(sheet)}
        />
      )}

      {/* «Переместить в…»: все контейнеры, где может жить пункт */}
      {moveReq && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setMoveReq(null)} />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl p-4 overflow-y-auto fadein"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', maxHeight: '70dvh' }}
          >
            <div className="grid place-items-center pb-3">
              <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
            </div>
            <h2 className="mb-2" style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>
              Переместить в…
            </h2>
            {moveDests
              .filter((d) => !(d.blockId === moveReq.blockId && d.listId === moveReq.listId))
              .map((d) => (
                <button
                  key={`${d.blockId}:${d.listId ?? ''}`}
                  onClick={() => moveItemTo(d.blockId, d.listId)}
                  className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-left"
                  style={{ color: 'var(--light)', fontSize: 14 }}
                >
                  <span style={{ paddingLeft: d.depth * 16, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {d.depth > 0 ? '└' : ''}
                  </span>
                  <span className="min-w-0 truncate">{d.label}</span>
                </button>
              ))}
          </div>
        </div>
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

      {toast.node}
    </div>
  )
}
// пункты блока (цели/задачи/события): чекбокс (или время) + текст;
// тап по тексту НЕ открывает редактирование — только long-press → action-sheet;
// новая строка (после «добавить …») сразу в режиме инпута;
// удержание поднятого пункта над другим (onMerge) — группировка в подблок
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
  onMerge,
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
  onMerge?: (from: number, to: number) => void
}) {
  const drag = useDragList({
    disabled: readOnly,
    onReorder,
    onLongPress: (i) => {
      const it = items[i]
      if (it) onLongPressItem(it.id, it.text || 'Пункт')
    },
    onMerge,
  })
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
                  className="flex-1 min-w-0"
                  style={{
                    ...CLAMP3,
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
// под-списки блока: чек-листы (ChecklistRow), подблоки (SubBlockRow) и нумерованные
// списки (NumberedList); long-press по списку — action-sheet, порядок — drag как у пунктов.
// Подблоки вкладываются друг в друга и в чек-листы — компонент рекурсивный.
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
  onAddSubList,
  onMergeItem,
  hideDone,
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
  onAddSubList: (parentListId: string) => void
  onMergeItem: (listId: string, from: number, to: number) => void
  hideDone?: boolean
}) {
  const drag = useDragList({
    disabled: readOnly,
    onReorder: onReorderLists,
    onLongPress: (i) => {
      const l = lists[i]
      if (l)
        onLongPressList(l.id, l.title || (l.kind === 'checklist' ? 'Чек-лист' : l.kind === 'sub' ? 'Подблок' : 'Список'))
    },
  })

  // общие обработчики пунктов чек-листа/подблока;
  // при «Скрыть выполненные» индексы жестов переводим из видимого списка в полный
  const itemHandlers = (lst: BlockList) => ({
    onToggleItem: (itemId: string) =>
      onPatchList(lst.id, (l) => ({
        ...l,
        items: l.items.map((x) => (x.id === itemId ? { ...x, done: !x.done } : x)),
      })),
    onItemLongPress: readOnly
      ? undefined
      : (itemId: string) => {
          const it = lst.items.find((x) => x.id === itemId)
          onLongPressListItem(lst.id, itemId, it?.text || 'Пункт')
        },
    onEditItem: (itemId: string, text: string) =>
      onPatchList(lst.id, (l) => ({
        ...l,
        items: l.items.map((x) => (x.id === itemId ? { ...x, text } : x)),
      })),
    onEditItemEnd: () => onEditListItem(null),
    onReorderItem: (from: number, to: number) =>
      onPatchList(lst.id, (l) => {
        const vis = visItems(l.items, hideDone)
        return { ...l, items: stampPos(moveItem(l.items, fullIdx(l.items, vis, from), fullIdx(l.items, vis, to))) }
      }),
    onMergeItem: (from: number, to: number) => {
      const vis = visItems(lst.items, hideDone)
      const f = fullIdx(lst.items, vis, from)
      const t = fullIdx(lst.items, vis, to)
      if (f >= 0 && t >= 0) onMergeItem(lst.id, f, t)
    },
    onEditTitle: (text: string) => onPatchList(lst.id, (l) => ({ ...l, title: text })),
    onEditTitleEnd: () => onEditListTitle(null),
  })

  return (
    <div {...drag.containerProps}>
      {lists.map((lst, i) => {
        const expanded = openLists.includes(lst.id)
        const editTitle = editListTitle?.blockId === blockId && editListTitle.listId === lst.id
        const editItemId = editListItem?.blockId === blockId && editListItem.listId === lst.id ? editListItem.itemId : null
        // вложенные подблоки + кнопка «добавить подблок» (внутри чек-листов и подблоков)
        const nested =
          lst.kind === 'list' ? null : (
            <>
              {(lst.lists?.length ?? 0) > 0 && (
                <BlockLists
                  blockId={blockId}
                  lists={lst.lists ?? []}
                  readOnly={readOnly}
                  openLists={openLists}
                  onToggleList={onToggleList}
                  onPatchList={onPatchList}
                  onReorderLists={(from, to) =>
                    onPatchList(lst.id, (l) => ({ ...l, lists: moveItem(l.lists ?? [], from, to) }))
                  }
                  onLongPressList={onLongPressList}
                  onLongPressListItem={onLongPressListItem}
                  onItemDblTap={onItemDblTap}
                  editListTitle={editListTitle}
                  onEditListTitle={onEditListTitle}
                  editListItem={editListItem}
                  onEditListItem={onEditListItem}
                  onAddListItem={onAddListItem}
                  onAddSubList={onAddSubList}
                  onMergeItem={onMergeItem}
                  hideDone={hideDone}
                />
              )}
              {!readOnly && (
                <button
                  onClick={() => onAddSubList(lst.id)}
                  className="mb-1 flex items-center gap-1.5 rounded-lg px-2 py-1"
                  style={{ color: 'var(--muted)', fontSize: 12 }}
                >
                  <Plus size={12} strokeWidth={1.8} /> добавить подблок
                </button>
              )}
            </>
          )
        const h = itemHandlers(lst)
        // видимая копия списка: выполненные скрыты из вида, но хранятся в данных;
        // полоска и счётчик остаются полными n/m (stat из исходного списка)
        const lstV = hideDone && lst.kind !== 'list' ? { ...lst, items: lst.items.filter((x) => !x.done) } : lst
        const stat =
          hideDone && lst.kind !== 'list'
            ? { done: lst.items.filter((x) => x.done).length, total: lst.items.length }
            : undefined
        return (
          <div key={lst.id} {...drag.bindRow(i)} style={drag.rowStyle(i)} className="no-select">
            {lst.kind === 'checklist' ? (
              <ChecklistRow
                inst={lstV}
                expanded={expanded}
                onToggle={() => onToggleList(lst.id)}
                onToggleItem={h.onToggleItem}
                onItemDblTap={onItemDblTap ? (itemId) => onItemDblTap(lst.id, itemId) : undefined}
                readOnly={readOnly}
                onItemLongPress={h.onItemLongPress}
                editItemId={editItemId}
                onEditItem={h.onEditItem}
                onEditItemEnd={h.onEditItemEnd}
                onReorderItem={h.onReorderItem}
                onMergeItem={h.onMergeItem}
                editTitle={editTitle}
                onEditTitle={h.onEditTitle}
                onEditTitleEnd={h.onEditTitleEnd}
                stat={stat}
              >
                {nested}
              </ChecklistRow>
            ) : lst.kind === 'sub' ? (
              <SubBlockRow
                list={lstV}
                expanded={expanded}
                onToggle={() => onToggleList(lst.id)}
                onToggleItem={h.onToggleItem}
                onItemDblTap={onItemDblTap ? (itemId) => onItemDblTap(lst.id, itemId) : undefined}
                readOnly={readOnly}
                onItemLongPress={h.onItemLongPress}
                editItemId={editItemId}
                onEditItem={h.onEditItem}
                onEditItemEnd={h.onEditItemEnd}
                onReorderItem={h.onReorderItem}
                onMergeItem={h.onMergeItem}
                editTitle={editTitle}
                onEditTitle={h.onEditTitle}
                onEditTitleEnd={h.onEditTitleEnd}
                stat={stat}
              >
                {nested}
              </SubBlockRow>
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

// подблок: те же пункты с чекбоксами, что у чек-листа, но без прогресс-бара и иконки;
// название необязательно; сворачивается; children — вложенные подблоки
function SubBlockRow({
  list,
  expanded,
  onToggle,
  onToggleItem,
  onItemDblTap,
  readOnly,
  onItemLongPress,
  editItemId,
  onEditItem,
  onEditItemEnd,
  onReorderItem,
  onMergeItem,
  editTitle,
  onEditTitle,
  onEditTitleEnd,
  children,
  stat,
}: {
  list: BlockList
  expanded: boolean
  onToggle: () => void
  onToggleItem: (itemId: string) => void
  onItemDblTap?: (itemId: string) => void
  readOnly?: boolean
  onItemLongPress?: (itemId: string) => void
  editItemId?: string | null
  onEditItem?: (itemId: string, text: string) => void
  onEditItemEnd?: () => void
  onReorderItem?: (from: number, to: number) => void
  onMergeItem?: (from: number, to: number) => void
  editTitle?: boolean
  onEditTitle?: (text: string) => void
  onEditTitleEnd?: () => void
  children?: ReactNode
  stat?: { done: number; total: number } // внешний счёт: при «Скрыть выполненные» показываем полные n/m
}) {
  const done = stat?.done ?? list.items.filter((i) => i.done).length
  const total = stat?.total ?? list.items.length

  const dblTap = useRef<Record<string, number>>({})
  const tapRow = (id: string) => {
    if (!onItemDblTap || readOnly) return
    const now = Date.now()
    if (now - (dblTap.current[id] ?? 0) < 320) {
      dblTap.current[id] = 0
      onItemDblTap(id)
    } else dblTap.current[id] = now
  }

  const drag = useDragList({
    disabled: readOnly || !onReorderItem,
    onReorder: (from, to) => onReorderItem?.(from, to),
    onLongPress: (index) => {
      const it = list.items[index]
      if (it) onItemLongPress?.(it.id)
    },
    onMerge: onMergeItem,
  })

  return (
    <div>
      <div onClick={onToggle} role="button" className="no-select w-full flex items-center gap-2 py-2 text-left">
        <ChevronDown
          size={15}
          strokeWidth={1.8}
          className="flex-none transition-transform"
          style={{ color: 'var(--muted)', transform: expanded ? 'rotate(180deg)' : 'none' }}
        />
        <span className="flex-1 min-w-0">
          {editTitle && !readOnly ? (
            <input
              ref={(el) => el?.focus()}
              value={list.title}
              onChange={(e) => onEditTitle?.(e.target.value)}
              onBlur={onEditTitleEnd}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && onEditTitleEnd?.()}
              onClick={(e) => e.stopPropagation()}
              placeholder="Название подблока"
              className="block w-full min-w-0 bg-transparent outline-none"
              style={{ fontSize: 13, fontWeight: 500, color: 'var(--light)', borderBottom: '1px solid var(--accent)' }}
            />
          ) : (
            <span
              className="block truncate"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: list.title ? 'var(--light)' : 'var(--muted)',
                fontStyle: list.title ? 'normal' : 'italic',
              }}
            >
              {list.title || 'Подблок'}
            </span>
          )}
        </span>
        <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
          {done}/{total}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: 'grid-template-rows .3s cubic-bezier(0.65,0,0.35,1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="pl-6 pr-1 pb-1" {...drag.containerProps}>
            {list.items.map((it, idx) => {
              const inWork = it.status === 'work' && !it.done
              return (
                <div
                  key={it.id}
                  {...drag.bindRow(idx)}
                  style={{
                    ...drag.rowStyle(idx),
                    ...(inWork ? { background: 'rgba(232,150,60,0.16)', borderRadius: 10 } : {}),
                  }}
                  className="no-select flex items-center gap-2.5 py-2"
                >
                  <button
                    onClick={() => onToggleItem(it.id)}
                    disabled={readOnly}
                    className="flex-none disabled:cursor-default"
                  >
                    <MCheck done={it.done} color="var(--accent)" size={18} />
                  </button>
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
                    <span
                      onClick={() => tapRow(it.id)}
                      className="flex-1 min-w-0"
                      style={{
                        ...CLAMP3,
                        fontSize: 13,
                        color: it.done ? 'var(--muted)' : 'var(--light)',
                        textDecoration: it.done ? 'line-through' : 'none',
                        textDecorationColor: 'var(--line-strong)',
                      }}
                    >
                      {it.text}
                    </span>
                  )}
                </div>
              )
            })}
            {children}
          </div>
        </div>
      </div>
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
                  <span className="flex-1 min-w-0" style={{ ...CLAMP3, fontSize: 13, color: 'var(--light)' }}>
                    {it.text}
                  </span>
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
        // long-press по шапке = «добавить пункт» только у РАЗВЁРНУТОГО блока;
        // у свёрнутого зажатие занято перестановкой блока (drag в списке прогресса)
        disabled={readOnly || !onAdd || !expanded}
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

// полоса недели под датабаром: 7 дней недели с viewDate;
// тап по дню — переход на него, свайп по полосе — сдвиг на ± неделю
function WeekStrip({ viewDate, onPick }: { viewDate: Date; onPick: (offset: number) => void }) {
  const swipeX = useRef<number | null>(null)
  const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dayOffsetOf = (d: Date) => Math.round((sod(d).getTime() - sod(new Date()).getTime()) / 86400000)
  const curOffset = dayOffsetOf(viewDate)
  const selected = fmtKey(viewDate)
  const todayK = fmtKey(new Date())

  // понедельник недели, содержащей viewDate
  const monday = new Date(viewDate)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div
      className="no-select flex gap-1 mb-3"
      onTouchStart={(e) => {
        e.stopPropagation()
        swipeX.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        e.stopPropagation()
        if (swipeX.current === null) return
        const dx = e.changedTouches[0].clientX - swipeX.current
        swipeX.current = null
        if (Math.abs(dx) > 40) onPick(curOffset + (dx < 0 ? 7 : -7))
      }}
    >
      {days.map((d, i) => {
        const key = fmtKey(d)
        const isSel = key === selected
        const isToday = key === todayK
        return (
          <button
            key={key}
            onClick={() => onPick(dayOffsetOf(d))}
            className="flex-1 flex flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors"
            style={{ background: isSel ? 'var(--accent)' : 'var(--surface)', border: '1px solid var(--line)' }}
          >
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', color: isSel ? 'var(--on-fill)' : 'var(--muted)' }}>
              {WD_SHORT[(i + 1) % 7]}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: isSel || isToday ? 700 : 500,
                color: isSel ? 'var(--on-fill)' : isToday ? 'var(--accent)' : 'var(--text-2)',
              }}
            >
              {d.getDate()}
            </span>
          </button>
        )
      })}
    </div>
  )
}
