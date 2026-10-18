import { useEffect, useState } from 'react'
import {
  Flower2,
  Heart,
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

export type MTab =
  | 'notes'
  | 'emotions'
  | 'therapy'
  | 'map'
  | 'progress'
  | 'path'
  | 'social'

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
  id: AppTabId
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
  social: { label: 'Социум', icon: Users },
}

export const BOTTOM_TAB_META: Record<AppTabId, { label: string; icon: LucideIcon }> = {
  dashboard: { label: 'Дашборд', icon: LayoutDashboard },
  day: { label: 'День', icon: Home },
  tools: { label: 'Инструменты', icon: LayoutGrid },
  chat: { label: 'Чат', icon: MessageCircle },
  session: { label: 'Сессия', icon: MessageCircle },
  settings: { label: 'Настройки', icon: Settings },
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
          { id: 'social', label: 'Социум' },
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
export const validAppTabIds = new Set<AppTabId>(Object.keys(BOTTOM_TAB_META) as AppTabId[])

export function readTabs(): AppTab[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (!s) return DEFAULT_TABS
    const parsed = JSON.parse(s) as AppTab[]
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TABS

    const filtered = parsed.filter((tab) => validAppTabIds.has(tab.id))
    if (filtered.length === 0) return DEFAULT_TABS

    const merged = filtered.map((tab) => {
      const meta = BOTTOM_TAB_META[tab.id]
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

    const present = new Set(merged.map((t) => t.id))
    const missing = DEFAULT_TABS.filter((t) => !present.has(t.id) && merged.length < 5)
    const result = [...merged, ...missing]

    return result.length >= 3 ? result : DEFAULT_TABS
  } catch {
    return DEFAULT_TABS
  }
}

export function writeTabs(tabs: AppTab[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs))
  } catch {
    /* ignore */
  }
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
