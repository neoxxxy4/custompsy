import { useEffect, useState } from 'react'
import { writeLS } from '../lib/sync'
import {
  Brain,
  Flower2,
  Heart,
  HeartHandshake,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Map as MapIcon,
  MessageCircle,
  Route,
  Settings,
  StickyNote,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type AppTabId = 'tools' | 'day' | 'chat' | 'session' | 'settings' | 'dashboard'

// нижняя вкладка может быть любым сервисом: системным (AppTabId) или инструментом (MTab)
export type BottomTabId = AppTabId | MTab

export type MTab =
  | 'notes'
  | 'emotions'
  | 'therapy'
  | 'map'
  | 'progress'
  | 'path'
  | 'social'
  | 'psysoc'
  | 'beliefs'

export interface NavItem {
  id: MTab
  label: string
  minLevel?: number
}

export interface NavFolder {
  id: string
  label: string
  items: NavItem[]
}

export interface AppTab {
  id: BottomTabId
  label: string
  icon: LucideIcon
  folders: NavFolder[]
}

export const TOOL_META: Record<
  MTab,
  { label: string; icon: LucideIcon }
> = {
  notes: { label: 'Заметки', icon: StickyNote },
  emotions: { label: 'Эмоции', icon: Flower2 },
  therapy: { label: 'Терапия', icon: Heart },
  map: { label: 'Самооценка', icon: MapIcon },
  progress: { label: 'Прогресс', icon: TrendingUp },
  path: { label: 'Путь', icon: Route },
  social: { label: 'Социум IQ', icon: Users },
  psysoc: { label: 'Социум', icon: HeartHandshake },
  beliefs: { label: 'Убеждения', icon: Brain },
}

export const BOTTOM_TAB_META: Record<AppTabId, { label: string; icon: LucideIcon }> = {
  dashboard: { label: 'Дашборд', icon: LayoutDashboard },
  day: { label: 'День', icon: Home },
  tools: { label: 'Инструменты', icon: LayoutGrid },
  chat: { label: 'Чат', icon: MessageCircle },
  session: { label: 'Сессия', icon: MessageCircle },
  settings: { label: 'Настройки', icon: Settings },
}

// мета всех возможных нижних вкладок: системные сервисы + инструменты
export const ALL_TAB_META: Record<BottomTabId, { label: string; icon: LucideIcon }> = {
  ...BOTTOM_TAB_META,
  ...TOOL_META,
}

export const DEFAULT_TABS: AppTab[] = [
  {
    id: 'dashboard',
    label: 'Дашборд',
    icon: LayoutDashboard,
    folders: [],
  },
  {
    id: 'tools',
    label: 'Инструменты',
    icon: LayoutGrid,
    folders: [
      {
        id: 'folder-tools-all',
        label: 'Все',
        items: [
          { id: 'map', label: 'Самооценка' },
          { id: 'emotions', label: 'Эмоции' },
          { id: 'therapy', label: 'Терапия' },
          { id: 'progress', label: 'Прогресс' },
          { id: 'path', label: 'Путь' },
          { id: 'psysoc', label: 'Социум' },
          { id: 'social', label: 'Социум IQ' },
          { id: 'beliefs', label: 'Убеждения' },
          { id: 'notes', label: 'Заметки' },
        ],
      },
    ],
  },
  {
    id: 'day',
    label: 'День',
    icon: Home,
    folders: [],
  },
  {
    id: 'session',
    label: 'Сессия',
    icon: MessageCircle,
    folders: [],
  },
  {
    id: 'settings',
    label: 'Настройки',
    icon: Settings,
    folders: [],
  },
]

const STORAGE_KEY = 'aod4-app-tabs'

export const validToolIds = new Set<MTab>(Object.keys(TOOL_META) as MTab[])
export const validBottomTabIds = new Set<BottomTabId>(Object.keys(ALL_TAB_META) as BottomTabId[])

export function readTabs(): AppTab[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (!s) return DEFAULT_TABS
    const parsed = JSON.parse(s) as AppTab[]
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TABS

    const seen = new Set<BottomTabId>()
    const filtered = parsed.filter((tab) => {
      if (!validBottomTabIds.has(tab.id) || seen.has(tab.id)) return false
      seen.add(tab.id)
      return true
    })
    if (filtered.length === 0) return DEFAULT_TABS

    // «Настройки» — постоянная вкладка: докидываем, если её нет в сохранённом списке
    if (!filtered.some((t) => t.id === 'settings')) {
      filtered.push({ ...DEFAULT_TABS.find((t) => t.id === 'settings')! })
    }
    // лимит 5, но «Настройки» не вытесняются
    const capped =
      filtered.length > 5
        ? [...filtered.filter((t) => t.id !== 'settings').slice(0, 4), filtered.find((t) => t.id === 'settings')!]
        : filtered

    return capped.map((tab) => {
      const meta = ALL_TAB_META[tab.id]
      const base = DEFAULT_TABS.find((t) => t.id === tab.id)
      let folders = (tab.folders ?? []).map((folder) => ({
        ...folder,
        items: (folder.items ?? []).filter((item) => validToolIds.has(item.id)),
      }))
      if (base) {
        const existingIds = new Set(folders.map((f) => f.id))
        const missing = base.folders.filter((f) => !existingIds.has(f.id))
        folders = [...missing, ...folders]
      }
      return { ...tab, label: meta.label, icon: meta.icon, folders }
    })
  } catch {
    return DEFAULT_TABS
  }
}

export function writeTabs(tabs: AppTab[]) {
  writeLS(STORAGE_KEY, tabs)
}

export function useAppTabs(): [AppTab[], (t: AppTab[] | ((prev: AppTab[]) => AppTab[])) => void] {
  const [tabs, setTabsState] = useState<AppTab[]>(() => readTabs())

  useEffect(() => {
    writeTabs(tabs)
  }, [tabs])

  const setTabs = (next: AppTab[] | ((prev: AppTab[]) => AppTab[])) => {
    setTabsState((prev) => (typeof next === 'function' ? (next as (prev: AppTab[]) => AppTab[])(prev) : next))
  }

  return [tabs, setTabs]
}
