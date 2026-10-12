import { beforeEach, describe, expect, it } from 'vitest'
import { moveItem, seedBlockDefs, seedTodayData } from './store'

// минимальный stub localStorage для node-окружения vitest
const mem = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  get length() {
    return mem.size
  },
} as Storage

beforeEach(() => mem.clear())

describe('moveItem', () => {
  it('переставляет элемент', () => {
    expect(moveItem([1, 2, 3], 0, 2)).toEqual([2, 3, 1])
    expect(moveItem([1, 2, 3], 2, 0)).toEqual([3, 1, 2])
  })
  it('вне диапазона — массив без изменений', () => {
    expect(moveItem([1, 2, 3], 0, 5)).toEqual([1, 2, 3])
    expect(moveItem([1, 2, 3], -1, 1)).toEqual([1, 2, 3])
  })
})

describe('seedBlockDefs', () => {
  it('дефолтные блоки: цели, расписание, чек-листы, задачи', () => {
    const defs = seedBlockDefs()
    expect(defs.map((d) => d.id)).toEqual(['goals', 'schedule', 'lists', 'tasks'])
    expect(defs.every((d) => d.inDashboard)).toBe(true)
    expect(defs[1].withTime).toBe(true)
    expect(defs[2].allow).toEqual({ items: false, checklists: true, lists: false, sub: true })
  })
})

describe('seedTodayData', () => {
  const dk = '2024-01-02'

  it('без legacy: дефолты (4 пустые цели, расписание недели, встроенные чек-листы)', () => {
    const d = seedTodayData(dk, 'Вт')
    expect(d.goals.items).toHaveLength(4)
    expect(d.goals.items.every((i) => i.text === '' && !i.done)).toBe(true)
    expect(d.schedule.items.length).toBeGreaterThan(0)
    expect(d.schedule.items.every((i) => typeof i.time === 'string')).toBe(true)
    expect(d.lists.lists.length).toBeGreaterThan(0)
    expect(d.lists.lists.every((l) => l.kind === 'checklist')).toBe(true)
    expect(d.tasks.items).toEqual([])
  })

  it('blank (вчера, readOnly): без дефолтов', () => {
    const d = seedTodayData(dk, 'Вт', true)
    expect(d.goals.items).toEqual([])
    expect(d.schedule.items).toEqual([])
    expect(d.lists.lists).toEqual([])
    expect(d.tasks.items).toEqual([])
  })

  it('мигрирует legacy-ключи дня', () => {
    mem.set(`aod2-goals-${dk}`, JSON.stringify([{ text: 'Пробежка', done: true }]))
    mem.set(`aod2-schedblocks-${dk}`, JSON.stringify([{ id: 's1', time: '09:00', what: 'Звонок', done: false }]))
    mem.set(
      `aod2-day-${dk}`,
      JSON.stringify([
        { iid: 'd1', templateId: 't1', title: 'Утро', time: '', color: '#fff', collapsed: false, items: [{ id: 'i1', text: 'Вода', done: true }] },
      ])
    )
    mem.set(`aod2-tasks-${dk}`, JSON.stringify([{ id: 't1', text: 'Почта', done: false }]))

    const d = seedTodayData(dk, 'Вт')
    expect(d.goals.items).toMatchObject([{ text: 'Пробежка', done: true }])
    expect(d.schedule.items).toMatchObject([{ id: 's1', time: '09:00', text: 'Звонок', done: false }])
    expect(d.lists.lists).toHaveLength(1)
    expect(d.lists.lists[0]).toMatchObject({ kind: 'checklist', title: 'Утро' })
    expect(d.lists.lists[0].items).toMatchObject([{ id: 'i1', text: 'Вода', done: true }])
    expect(d.tasks.items).toMatchObject([{ id: 't1', text: 'Почта', done: false }])
  })

  it('битый legacy-ключ не роняет сид', () => {
    mem.set(`aod2-goals-${dk}`, '{битый json')
    const d = seedTodayData(dk, 'Вт')
    expect(d.goals.items).toHaveLength(4)
  })
})
