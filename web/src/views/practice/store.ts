import type { Dispatch, SetStateAction } from 'react'
import { CHECKLISTS } from '../../data/system'

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
export interface EmotionSubItem {
  name: string
  level: number // 0–12
}

export interface EmotionTag {
  id: string
  emotion: 'joy' | 'trust' | 'fear' | 'surprise' | 'sadness' | 'disgust' | 'anger' | 'anticipation'
  level: 1 | 2 | 3
  feelings?: EmotionSubItem[]
  sensations?: EmotionSubItem[]
  created: number
}

function normalizeSubItems(items: unknown): EmotionSubItem[] | undefined {
  if (!Array.isArray(items)) return undefined
  const result: EmotionSubItem[] = []
  items.forEach((it) => {
    if (typeof it === 'string' && it) {
      result.push({ name: it, level: 6 })
    } else if (it && typeof it === 'object') {
      const name = String((it as Record<string, unknown>).name ?? '')
      const level = Number((it as Record<string, unknown>).level ?? 6)
      if (name) result.push({ name, level: Math.max(0, Math.min(12, level)) })
    }
  })
  return result.length ? result : undefined
}

export function normalizeEmotionTag(tag: unknown): EmotionTag {
  const t = tag as Record<string, unknown>
  const feelings = normalizeSubItems(t.feelings) ?? normalizeSubItems(
    typeof t.feeling === 'string' && t.feeling ? [t.feeling] : undefined
  )
  const sensations = normalizeSubItems(t.sensations) ?? normalizeSubItems(
    typeof t.sensation === 'string' && t.sensation ? [t.sensation] : undefined
  )
  return {
    id: String(t.id ?? ''),
    emotion: String(t.emotion ?? 'joy') as EmotionTag['emotion'],
    level: Number(t.level ?? 1) as 1 | 2 | 3,
    feelings,
    sensations,
    created: Number(t.created ?? Date.now()),
  }
}

export interface Note { id: string; folderId: string; title: string; body: string; updated: number; pinned?: boolean; emotions?: EmotionTag[]; therapy?: boolean }

export interface DiaryEntry { text: string; emotion: string; focus: number; updated: number; emotions?: EmotionTag[]; therapy?: boolean }
export type Diary = Record<string, DiaryEntry>

export interface Goal { text: string; done: boolean }

// простая задача дня (ключ aod3-tasks-<date>)
export interface Task { id: string; text: string; done: boolean }

// редактируемый блок расписания дня (ключ aod3-schedblocks-<date>)
export interface SchedBlock { id: string; time: string; what: string; color?: string; done: boolean }

// ─── кастомные блоки экрана «Сегодня» ───

// описание блока (ключ aod3-today-blocks-<date>, у каждого дня свой набор; порядок массива = порядок на экране)
export interface BlockDef {
  id: string
  title: string
  withTime: boolean        // расписание: у пунктов есть время
  inDashboard: boolean     // «Показывать в дашборде» (кольцо в «Прогресс дня»)
  hideDone?: boolean       // «Скрыть выполненные»: галочки не рисуются, но хранятся и считаются
  allow: { items: boolean; checklists: boolean; lists: boolean; sub: boolean }  // «Состав блока»
}

// status — колонка канбана для невыполненных пунктов ('done' выводится из done)
// dur — длительность события расписания в минутах (по умолчанию 60)
// pos — запомненная позиция пункта в каждой группе (умная сортировка):
// вернулся в группу — встаёт на своё старое место
export interface BlockItem {
  id: string
  text: string
  done: boolean
  time?: string
  status?: 'plan' | 'work'
  dur?: number
  pos?: { work?: number; plan?: number; done?: number }
}

export interface BlockList {
  id: string
  kind: 'checklist' | 'list' | 'sub'  // чек-лист / нумерованный список / подблок (как чек-лист, но без прогресс-бара, название необязательно)
  title: string
  items: BlockItem[]
  lists?: BlockList[]  // вложенные подблоки: внутри блока, подблока или чек-листа
}

// данные дня по блокам (ключ aod3-today-data-<date>): blockId → пункты и под-списки
export type TodayData = Record<string, { items: BlockItem[]; lists: BlockList[] }>

// независимая запись «Списков» в «Записях» (ключ aod3-listrecs)
export interface ListRecord {
  id: string
  kind: 'checklist' | 'list'
  title: string
  items: BlockItem[]
  lists?: BlockList[]  // вложенные подблоки-чек-листы внутри записи
  updated: number
  emotions?: EmotionTag[]
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

// стартовый набор чек-листов дня (пусто по умолчанию)
export const seedDay = (): DayInstance[] => []

// счётчик пунктов записи с учётом вложенных подблоков (рекурсивно)
export const recItemStats = (r: ListRecord): { done: number; total: number } => {
  const walk = (ls: BlockList[]): { done: number; total: number } =>
    ls.reduce(
      (acc, l) => {
        const sub = l.lists ? walk(l.lists) : { done: 0, total: 0 }
        return {
          done: acc.done + l.items.filter((i) => i.done).length + sub.done,
          total: acc.total + l.items.length + sub.total,
        }
      },
      { done: 0, total: 0 }
    )
  const sub = r.lists ? walk(r.lists) : { done: 0, total: 0 }
  return { done: r.items.filter((i) => i.done).length + sub.done, total: r.items.length + sub.total }
}

// тоггл пункта во вложенных подблоках (рекурсивно)
export const toggleNestedListItem = (ls: BlockList[], listId: string, itemId: string): BlockList[] =>
  ls.map((l) =>
    l.id === listId
      ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) }
      : { ...l, lists: l.lists ? toggleNestedListItem(l.lists, listId, itemId) : l.lists }
  )

// стартовое расписание дня: шаблон дня недели из «Планирования»
// + перенос отметок из legacy-ключа aod3-sched-<date> (индексы wdName-i)
export const seedSchedBlocks = (_dateKey: string, _wdName: string): SchedBlock[] => []

// дефолтные блоки экрана «Сегодня»
export const seedBlockDefs = (): BlockDef[] => []

// дефолты для старых записей без полей
export const normalizeDef = (d: BlockDef): BlockDef => ({
  id: d.id,
  title: d.title,
  withTime: d.withTime ?? false,
  inDashboard: d.inDashboard ?? true,
  hideDone: d.hideDone ?? false,
  allow: {
    items: d.allow?.items ?? true,
    checklists: d.allow?.checklists ?? false,
    lists: d.allow?.lists ?? false,
    sub: d.allow?.sub ?? false,
  },
})

// блоки конкретного дня (ключ aod3-today-blocks-<date>): при первом открытии
// берём legacy-глобальный список, дальше каждый день живёт со своими блоками
export const seedDayBlocks = (): BlockDef[] => {
  const legacy = readLegacy<BlockDef[]>('aod3-today-blocks')
  return legacy && legacy.length ? legacy.map(normalizeDef) : seedBlockDefs()
}

const EMPTY_GOALS: Goal[] = []

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
// (ключа aod3-today-data-<date> ещё нет) мигрируем legacy-ключи;
// blank — для readOnly-дней (вчера): без дефолтов, только то, что было в legacy
export const seedTodayData = (dateKey: string, wdName: string, blank = false): TodayData => {
  const goals = readLegacy<Goal[]>(`aod3-goals-${dateKey}`) ?? (blank ? [] : EMPTY_GOALS)
  const sched = readLegacy<SchedBlock[]>(`aod3-schedblocks-${dateKey}`) ?? (blank ? [] : seedSchedBlocks(dateKey, wdName))
  const day = readLegacy<DayInstance[]>(`aod3-day-${dateKey}`) ?? (blank ? [] : seedDay())
  const tasks = readLegacy<Task[]>(`aod3-tasks-${dateKey}`) ?? []
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

// стартовые данные заметок (пусто по умолчанию)
export const SEED_FOLDERS: Folder[] = []

export const SEED_NOTES: Note[] = []

// ─── Эмоции (колесо Плутчика) ───

export const PLUTCHIK_EMOTIONS: EmotionTag['emotion'][] = [
  'joy',
  'trust',
  'fear',
  'surprise',
  'sadness',
  'disgust',
  'anger',
  'anticipation',
]

export function plutchikEmotions(): string[] {
  return [...PLUTCHIK_EMOTIONS]
}

const PLUTCHIK_BASE: Record<EmotionTag['emotion'], string> = {
  joy: '#FFF700',
  trust: '#9AFE66',
  fear: '#00FF19',
  surprise: '#00FFFF',
  sadness: '#306EFF',
  disgust: '#FF00FF',
  anger: '#FF0000',
  anticipation: '#FF8000',
}

const PLUTCHIK_DARK: Record<EmotionTag['emotion'], string> = {
  joy: '#E6D900',
  trust: '#7ED957',
  fear: '#00D916',
  surprise: '#00D9E6',
  sadness: '#4C7DFF',
  disgust: '#D946D9',
  anger: '#FF4444',
  anticipation: '#E67300',
}

export function plutchikColor(emotion: string, isDark = false): string {
  const e = emotion as EmotionTag['emotion']
  const map = isDark ? PLUTCHIK_DARK : PLUTCHIK_BASE
  return map[e] ?? 'var(--muted)'
}

export function emotionName(emotion: string): string {
  const map: Record<string, string> = {
    joy: 'Радость',
    trust: 'Доверие',
    fear: 'Страх',
    surprise: 'Удивление',
    sadness: 'Печаль',
    disgust: 'Отвращение',
    anger: 'Гнев',
    anticipation: 'Предвкушение',
  }
  return map[emotion] ?? emotion
}

export const EMOTION_WHEEL: Record<EmotionTag['emotion'], { feelings: string[]; sensations: string[] }> = {
  joy: {
    feelings: ['счастье', 'оптимизм', 'восторг', 'удовлетворение', 'радость', 'веселье', 'блаженство'],
    sensations: ['тепло в груди', 'лёгкость', 'улыбка', 'энергия', 'сияние', 'покалывание'],
  },
  trust: {
    feelings: ['близость', 'привязанность', 'любовь', 'безопасность', 'уверенность', 'благодарность'],
    sensations: ['расслабление', 'тепло в животе', 'мягкость', 'открытость'],
  },
  fear: {
    feelings: ['тревога', 'испуг', 'паника', 'беспокойство', 'робость', 'ужас', 'нервозность'],
    sensations: ['комок в горле', 'дрожь', 'сердцебиение', 'потливость', 'напряжение в плечах', 'сухость во рту', 'озноб'],
  },
  surprise: {
    feelings: ['изумление', 'шок', 'любопытство', 'недоумение', 'ошеломление'],
    sensations: ['замираание', 'вздрагивание', 'брови вверх', 'открытый рот', 'бодрость'],
  },
  sadness: {
    feelings: ['грусть', 'печаль', 'тоска', 'одиночество', 'разочарование', 'бессилие', 'апатия'],
    sensations: ['тяжесть в груди', 'комок в горле', 'слёзы', 'вялость', 'опущенные плечи', 'пустота'],
  },
  disgust: {
    feelings: ['отвращение', 'брезгливость', 'неприязнь', 'презрение', 'отторжение', 'тошнота'],
    sensations: ['тошнота', 'морщины носа', 'сжатие в желудке', 'желание отвернуться', 'слюноотделение'],
  },
  anger: {
    feelings: ['злость', 'агрессия', 'раздражение', 'негодование', 'ярость', 'обида', 'гнев'],
    sensations: ['жар', 'напряжение в челюсти', 'сжатые губы', 'головная боль', 'тремор голоса', 'покраснение', 'боль в висках'],
  },
  anticipation: {
    feelings: ['ожидание', 'интерес', 'любопытство', 'надежда', 'возбуждение', 'нетерпение'],
    sensations: ['бабочки в животе', 'учащённое сердцебиение', 'лёгкое головокружение', 'энергия', 'улыбка'],
  },
}

export const DEFAULT_FEELINGS = [
  'тревога', 'паника', 'раздражение', 'злость', 'обида', 'вина', 'стыд', 'грусть', 'печаль', 'одиночество',
  'усталость', 'апатия', 'скука', 'интерес', 'любопытство', 'радость', 'счастье', 'надежда', 'благодарность', 'спокойствие',
]

export const DEFAULT_SENSATIONS = [
  'комок в горле', 'жжение в груди', 'сжимание в груди', 'бабочки в животе', 'тяжесть в животе',
  'напряжение в плечах', 'боль в затылке', 'головокружение', 'сухость во рту', 'потливость',
  'озноб', 'жар', 'слабость в ногах', 'сердцебиение', 'задержка дыхания', 'лёгкость', 'тепло в груди', 'покалывание',
]

export function allEmotionTags(notes: Note[], listrecs: ListRecord[], diary: Diary): EmotionTag[] {
  const fromNotes = notes.flatMap((n) => (n.emotions ?? []).map(normalizeEmotionTag))
  const fromRecs = listrecs.flatMap((r) => (r.emotions ?? []).map(normalizeEmotionTag))
  const fromDiary = Object.values(diary).flatMap((d) => (d.emotions ?? []).map(normalizeEmotionTag))
  return [...fromNotes, ...fromRecs, ...fromDiary].sort((a, b) => b.created - a.created)
}

export type EmotionRecordSource = 'note' | 'listrec' | 'diary'

export function emotionRecords(
  notes: Note[],
  listrecs: ListRecord[],
  diary: Diary,
): { source: EmotionRecordSource; record: Note | ListRecord | { date: string; entry: DiaryEntry }; tags: EmotionTag[] }[] {
  const items: { source: EmotionRecordSource; record: Note | ListRecord | { date: string; entry: DiaryEntry }; tags: EmotionTag[]; updated: number }[] = []
  notes.forEach((n) => {
    if (n.emotions?.length) items.push({ source: 'note', record: n, tags: n.emotions.map(normalizeEmotionTag), updated: n.updated })
  })
  listrecs.forEach((r) => {
    if (r.emotions?.length) items.push({ source: 'listrec', record: r, tags: r.emotions.map(normalizeEmotionTag), updated: r.updated })
  })
  Object.entries(diary).forEach(([date, entry]) => {
    if (entry.emotions?.length) items.push({ source: 'diary', record: { date, entry }, tags: entry.emotions.map(normalizeEmotionTag), updated: entry.updated || 0 })
  })
  return items.sort((a, b) => b.updated - a.updated)
}
