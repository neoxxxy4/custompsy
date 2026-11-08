// Инструмент «Менеджер»: личная система списков + матрица Эйзенхауэра.
// Главная вкладка (неизменяемая) — квадрат «срочно/важно», дальше списки:
// Проблемы, Задачи, Идеи, Проекты, Дела + свои вкладки.
// Пункты связаны с остальным приложением: отправляются в День и в Заметки.

export interface ManagerTab {
  id: string
  name: string
  fixed?: boolean // дефолтные вкладки нельзя удалить
}

export const DEFAULT_MANAGER_TABS: ManagerTab[] = [
  { id: 'problems', name: 'Проблемы', fixed: true },
  { id: 'tasks', name: 'Задачи', fixed: true },
  { id: 'ideas', name: 'Идеи', fixed: true },
  { id: 'projects', name: 'Проекты', fixed: true },
  { id: 'deeds', name: 'Дела', fixed: true },
]

export interface ManagerItem {
  id: string
  ts: number
  tabId: string
  text: string
  done: boolean
  urgent?: boolean
  important?: boolean
}

export const MANAGER_TABS_KEY = 'aod4-manager-tabs-v1'
export const MANAGER_ITEMS_KEY = 'aod4-manager-items-v1'

// квадрант матрицы Эйзенхауэра
export type Quadrant = 'do' | 'plan' | 'delegate' | 'drop'

export const QUADRANTS: { id: Quadrant; name: string; hint: string; color: string; urgent: boolean; important: boolean }[] = [
  { id: 'do', name: 'Срочно и важно', hint: 'делать сразу', color: '#ef4444', urgent: true, important: true },
  { id: 'plan', name: 'Важно, не срочно', hint: 'планировать', color: '#22c55e', urgent: false, important: true },
  { id: 'delegate', name: 'Срочно, не важно', hint: 'быстро или делегировать', color: '#eab308', urgent: true, important: false },
  { id: 'drop', name: 'Не срочно, не важно', hint: 'не тратить силы', color: '#64748b', urgent: false, important: false },
]

export const quadrantOf = (it: ManagerItem): Quadrant => {
  if (it.urgent && it.important) return 'do'
  if (it.important) return 'plan'
  if (it.urgent) return 'delegate'
  return 'drop'
}

export const managerTabName = (tabs: ManagerTab[], id: string): string =>
  tabs.find((t) => t.id === id)?.name ?? id
