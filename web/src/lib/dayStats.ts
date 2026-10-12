import { CAL_EVENTS, ROADMAP, WEEK_TEMPLATE, type CalEvent } from '../data/system'
import { readLS } from './sync'
import { todayKey, type DayInstance, type Goal, type SchedBlock } from '../views/practice/store'

export const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export interface DayStats {
  pct: number
  done: number
  total: number
  gDone: number
  gTotal: number
  sDone: number
  sTotal: number
  cDone: number
  cTotal: number
  blockLabel: string
}

// блоки расписания сегодня: новый ключ aod4-schedblocks-<date>,
// при его отсутствии — виртуальный сид из WEEK_TEMPLATE + legacy-отметки aod4-sched-<date>
export function todayBlocks(): SchedBlock[] {
  const tk = todayKey()
  const wdName = WD[new Date().getDay()]
  const stored = readLS<SchedBlock[] | null>(`aod4-schedblocks-${tk}`, null)
  if (stored) return stored
  const legacy = readLS<Record<string, boolean>>(`aod4-sched-${tk}`, {})
  const plan = WEEK_TEMPLATE.find((d) => d.day === wdName) ?? WEEK_TEMPLATE[0]
  return [...plan.blocks]
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((b, i) => ({
      id: `${wdName}-${i}`,
      time: b.time,
      what: b.what,
      color: b.color,
      done: !!legacy[`${wdName}-${i}`],
    }))
}

export function getDayStats(): DayStats {
  const tk = todayKey()
  const now = new Date()
  const lists = readLS<DayInstance[]>(`aod4-day-${tk}`, [])
  const goals = readLS<Goal[]>(`aod4-goals-${tk}`, [])
  const blocks = todayBlocks()

  const cTotal = lists.reduce((n, d) => n + d.items.length, 0)
  const cDone = lists.reduce((n, d) => n + d.items.filter((i) => i.done).length, 0)
  const gDone = goals.filter((g) => g.done).length
  const sDone = blocks.filter((b) => b.done).length
  const total = goals.length + blocks.length + cTotal
  const done = gDone + sDone + cDone
  const pct = total ? Math.round((done / total) * 100) : 0

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const short = (w: string) => w.split(/[·—]/)[0].trim().toLowerCase()
  let blockLabel = ''
  const sorted = [...blocks].sort((a, b) => a.time.localeCompare(b.time))
  for (const b of sorted) {
    const [h, m] = b.time.split(':').map(Number)
    const t = h * 60 + m
    if (t <= nowMin && nowMin - t < 90) {
      blockLabel = `сейчас: ${short(b.what)}`
      break
    }
    if (t > nowMin) {
      blockLabel = `→ ${short(b.what)} ${b.time}`
      break
    }
  }

  return {
    pct, done, total,
    gDone, gTotal: goals.length,
    sDone, sTotal: blocks.length,
    cDone, cTotal,
    blockLabel,
  }
}

export interface SysStatus {
  day: DayStats
  calToday: number
  notesCount: number
  diaryToday: boolean
  blogCount: number
  balanceLabel: string
  balancePct: number | null
  roadDone: number
  roadTotal: number
}

export function getSystemStatus(): SysStatus {
  const tk = todayKey()
  const custom = readLS<CalEvent[]>('aod-cal', [])
  const calToday = [...CAL_EVENTS, ...custom].filter((e) => e.date === tk).length
  const notesCount = readLS<unknown[]>('aod4-notes', []).length
  const diaryToday = !!readLS<Record<string, unknown>>('aod4-diary', {})[tk]
  const blogCount = readLS<unknown[]>('aod4-blog', []).length

  const bal = readLS<number[] | null>('aod-balance', null)
  let balanceLabel = 'нет оценки'
  let balancePct: number | null = null
  if (bal && bal.length === 6) {
    const spread = Math.max(...bal) - Math.min(...bal)
    balanceLabel = spread <= 2 ? 'ровно' : `перекос ${spread}`
    balancePct = Math.round((bal.reduce((a, b) => a + b, 0) / 6) * 10)
  }

  const roadDone = ROADMAP.filter((r) => r.status === 'done').length

  return {
    day: getDayStats(),
    calToday,
    notesCount,
    diaryToday,
    blogCount,
    balanceLabel,
    balancePct,
    roadDone,
    roadTotal: ROADMAP.length,
  }
}
