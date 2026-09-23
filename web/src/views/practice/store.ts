import type { Dispatch, SetStateAction } from 'react'
import { CHECKLISTS, WEEK_TEMPLATE } from '../../data/system'

// ─── types ───

export interface TplItem { id: string; text: string; hint?: string }
export interface Template { id: string; title: string; time: string; color: string; items: TplItem[]; custom?: boolean }

export interface DayItem extends TplItem { done: boolean }
export interface DayInstance {
  iid: string
  templateId: string
  title: string
  time: string
  color: string
  collapsed: boolean
  items: DayItem[]
}

export interface Folder { id: string; name: string }
export interface Note { id: string; folderId: string; title: string; body: string; updated: number; pinned?: boolean }

export interface DiaryEntry { text: string; emotion: string; focus: number; updated: number }
export type Diary = Record<string, DiaryEntry>

export interface Goal { text: string; done: boolean }

// простая задача дня (ключ aod2-tasks-<date>)
export interface Task { id: string; text: string; done: boolean }

// редактируемый блок расписания дня (ключ aod2-schedblocks-<date>)
export interface SchedBlock { id: string; time: string; what: string; color?: string; done: boolean }

// ─── кастомные блоки экрана «Сегодня» ───

// описание блока (ключ aod2-today-blocks, порядок массива = порядок на экране)
export interface BlockDef {
  id: string
  title: string
  withTime: boolean        // расписание: у пунктов есть время
  inDashboard: boolean     // «Показывать в дашборде» (кольцо в «Прогресс дня»)
  allow: { items: boolean; checklists: boolean; lists: boolean }  // «Состав блока»
}

// status — колонка канбана для невыполненных пунктов ('done' выводится из done)
// dur — длительность события расписания в минутах (по умолчанию 60)
export interface BlockItem { id: string; text: string; done: boolean; time?: string; status?: 'plan' | 'work'; dur?: number }

export interface BlockList {
  id: string
  kind: 'checklist' | 'list'  // чек-лист (зачёркивается) / список (нумерованный, не зачёркивается)
  title: string
  items: BlockItem[]
}

// данные дня по блокам (ключ aod2-today-data-<date>): blockId → пункты и под-списки
export type TodayData = Record<string, { items: BlockItem[]; lists: BlockList[] }>

// независимая запись «Списков» в «Записях» (ключ aod2-listrecs)
export interface ListRecord {
  id: string
  kind: 'checklist' | 'list'
  title: string
  items: BlockItem[]
  updated: number
}

// ─── helpers ───

export const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const uid = () => Math.random().toString(36).slice(2, 9)

export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || to >= arr.length) return arr
  const next = arr.slice()
  next.splice(from, 1)
  next.splice(to, 0, arr[from])
  return next
}

import { useSyncedLS } from '../../lib/sync'

export function useLS<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  // хранилище — localStorage (зеркало в WebView), см. src/lib/sync.ts
  return useSyncedLS(key, initial)
}

// все шаблоны: встроенные + пользовательские
export function allTemplates(custom: Template[]): Template[] {
  const builtin: Template[] = CHECKLISTS.map((c) => ({ ...c, custom: false }))
  return [...builtin, ...custom]
}

export function instantiate(t: Template): DayInstance {
  return {
    iid: uid(),
    templateId: t.id,
    title: t.title,
    time: t.time,
    color: t.color,
    collapsed: false,
    items: t.items.map((it) => ({ ...it, done: false })),
  }
}

// стартовый набор чек-листов дня (встроенные шаблоны)
export const seedDay = (): DayInstance[] => allTemplates([]).map(instantiate)

// стартовое расписание дня: шаблон дня недели из «Планирования»
// + перенос отметок из legacy-ключа aod2-sched-<date> (индексы wdName-i)
export const seedSchedBlocks = (dateKey: string, wdName: string): SchedBlock[] => {
  const plan = WEEK_TEMPLATE.find((d) => d.day === wdName) ?? WEEK_TEMPLATE[0]
  let legacy: Record<string, boolean> = {}
  try {
    const s = localStorage.getItem(`aod2-sched-${dateKey}`)
    if (s) legacy = JSON.parse(s) as Record<string, boolean>
  } catch {
    /* битый legacy-ключ — начинаем с чистого листа */
  }
  return [...plan.blocks]
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((b, i) => ({
      id: uid(),
      time: b.time,
      what: b.what,
      color: b.color,
      done: !!legacy[`${wdName}-${i}`],
    }))
}

// дефолтные блоки экрана «Сегодня»
export const seedBlockDefs = (): BlockDef[] => [
  { id: 'goals', title: 'Цели', withTime: false, inDashboard: true, allow: { items: true, checklists: false, lists: false } },
  { id: 'schedule', title: 'Расписание', withTime: true, inDashboard: true, allow: { items: true, checklists: false, lists: false } },
  { id: 'lists', title: 'Чек-листы', withTime: false, inDashboard: true, allow: { items: false, checklists: true, lists: false } },
  { id: 'tasks', title: 'Задачи', withTime: false, inDashboard: true, allow: { items: true, checklists: false, lists: false } },
]

const EMPTY_GOALS: Goal[] = Array.from({ length: 4 }, () => ({ text: '', done: false }))

// чтение legacy-ключа напрямую из localStorage (для миграции)
const readLegacy = <T,>(key: string): T | null => {
  try {
    const s = localStorage.getItem(key)
    return s !== null ? (JSON.parse(s) as T) : null
  } catch {
    return null
  }
}

// данные дня для новой модели блоков: при первом открытии даты
// (ключа aod2-today-data-<date> ещё нет) мигрируем legacy-ключи;
// blank — для readOnly-дней (вчера): без дефолтов, только то, что было в legacy
export const seedTodayData = (dateKey: string, wdName: string, blank = false): TodayData => {
  const goals = readLegacy<Goal[]>(`aod2-goals-${dateKey}`) ?? (blank ? [] : EMPTY_GOALS)
  const sched = readLegacy<SchedBlock[]>(`aod2-schedblocks-${dateKey}`) ?? (blank ? [] : seedSchedBlocks(dateKey, wdName))
  const day = readLegacy<DayInstance[]>(`aod2-day-${dateKey}`) ?? (blank ? [] : seedDay())
  const tasks = readLegacy<Task[]>(`aod2-tasks-${dateKey}`) ?? []
  return {
    goals: {
      items: goals.map((g) => ({ id: uid(), text: g.text, done: g.done })),
      lists: [],
    },
    schedule: {
      items: sched.map((b) => ({ id: b.id ?? uid(), text: b.what, done: b.done, time: b.time })),
      lists: [],
    },
    lists: {
      items: [],
      lists: day.map((d) => ({
        id: uid(),
        kind: 'checklist' as const,
        title: d.title,
        items: d.items.map((x) => ({ id: x.id ?? uid(), text: x.text, done: x.done })),
      })),
    },
    tasks: {
      items: tasks.map((t) => ({ id: t.id ?? uid(), text: t.text, done: t.done })),
      lists: [],
    },
  }
}

export const PALETTE = [  'var(--f-discipline)',
  'var(--f-environment)',
  'var(--f-metacog)',
  'var(--f-emotions)',
  'var(--f-neuro)',
  'var(--f-boundaries)',
  '#e9e7e2',
  'var(--accent)',
]

export const PALETTE_HEX: Record<string, string> = {
  'var(--f-discipline)': '#efedbd',
  'var(--f-environment)': '#8ab2d1',
  'var(--f-metacog)': '#c6a1ce',
  'var(--f-emotions)': '#ffc09a',
  'var(--f-neuro)': '#aaf7b3',
  'var(--f-boundaries)': '#8ac1a0',
  '#e9e7e2': '#e9e7e2',
  'var(--accent)': '#2474ff',
}

// стартовые данные заметок
export const SEED_FOLDERS: Folder[] = [
  { id: 'inbox', name: 'Входящие' },
  { id: 'ideas', name: 'Идеи' },
  { id: 'thoughts', name: 'Выгрузка мыслей' },
]

export const SEED_NOTES: Note[] = [
  {
    id: 'welcome',
    folderId: 'inbox',
    title: 'Внешняя память',
    body: 'ОЗУ держит 7±2 объекта — всё остальное сюда.\n\nСоздавай папки слева, пиши заметки, ничего не держи в голове. Данные хранятся в этом браузере.',
    updated: Date.now(),
  },
]
