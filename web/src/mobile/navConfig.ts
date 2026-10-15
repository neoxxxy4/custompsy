import {
  Flower2,
  Heart,
  Home,
  LayoutGrid,
  Map as MapIcon,
  MessageCircle,
  MessageSquare,
  Route,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

export type AppTabId = 'tools' | 'day' | 'chat' | 'session'

export type MTab =
  | 'chat'
  | 'emotions'
  | 'therapy'
  | 'map'
  | 'session'
  | 'progress'
  | 'path'

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
  chat: { label: 'Чат', icon: MessageCircle },
  emotions: { label: 'Эмоции', icon: Flower2 },
  therapy: { label: 'Терапия', icon: Heart },
  map: { label: 'Самооценка', icon: MapIcon },
  session: { label: 'Сессия', icon: MessageSquare },
  progress: { label: 'Прогресс', icon: TrendingUp },
  path: { label: 'Путь', icon: Route },
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
          { id: 'session', label: 'Сессия' },
          { id: 'map', label: 'Самооценка' },
          { id: 'emotions', label: 'Эмоции' },
          { id: 'therapy', label: 'Терапия' },
          { id: 'progress', label: 'Прогресс' },
          { id: 'path', label: 'Путь' },
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
    icon: MessageSquare,
    folders: [],
  },
]

export const validToolIds = new Set<MTab>(Object.keys(TOOL_META) as MTab[])
