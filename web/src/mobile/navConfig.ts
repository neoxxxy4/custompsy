import { useState, useEffect } from 'react'
import {
  Compass,
  Flower2,
  Home,
  LayoutGrid,
  Map as MapIcon,
  MessageCircle,
  Radar,
  Settings,
  Sparkles,
  SquarePen,
  type LucideIcon,
} from 'lucide-react'

export type AppTabId = 'tools' | 'day' | 'chat' | 'session'

export type MTab =
  | 'records'
  | 'graph'
  | 'journey'
  | 'chat'
  | 'emotions'
  | 'therapy'
  | 'map'
  | 'session'
  | 'path'
  | 'settings'

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
  records: { label: 'Записи', icon: SquarePen },
  graph: { label: 'Граф', icon: Radar },
  journey: { label: 'Путь', icon: Compass },
  chat: { label: 'Чат', icon: MessageCircle },
  emotions: { label: 'Эмоции', icon: Flower2 },
  therapy: { label: 'Терапия', icon: Sparkles },
  map: { label: 'Карта', icon: MapIcon },
  session: { label: 'Сессия', icon: Settings },
  path: { label: 'Путь', icon: Compass },
  settings: { label: 'Настройки', icon: Settings },
}

export const DEFAULT_TABS: AppTab[] = [
  {
    id: 'day',
    label: 'День',
    icon: Home,
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
          { id: 'records', label: 'Записи' },
          { id: 'map', label: 'Карта' },
          { id: 'emotions', label: 'Эмоции' },
        ],
      },
    ],
  },
  {
    id: 'chat',
    label: 'Чат',
    icon: MessageCircle,
    folders: [],
  },
  {
    id: 'session',
    label: 'Сессия',
    icon: Sparkles,
    folders: [],
  },
]

const STORAGE_KEY = 'aod4-app-tabs'

export const validToolIds = new Set<MTab>(Object.keys(TOOL_META) as MTab[])

export function readTabs(): AppTab[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (!s) return DEFAULT_TABS
    const parsed = JSON.parse(s) as AppTab[]
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TABS
    return parsed.map((tab) => {
      const base = DEFAULT_TABS.find((t) => t.id === tab.id)
      let folders = (tab.folders ?? []).map((folder) => ({
        ...folder,
        items: (folder.items ?? []).filter((item) => validToolIds.has(item.id)),
      }))
      // добавляем новые дефолтные папки, которых ещё нет в сохранённых данных
      if (base) {
        const existingIds = new Set(folders.map((f) => f.id))
        const missing = base.folders.filter((f) => !existingIds.has(f.id))
        folders = [...missing, ...folders]
      }
      return { ...tab, folders }
    })
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
