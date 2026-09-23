import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  ListChecks,
  Map,
  Network,
  NotebookPen,
  PenLine,
  Scale,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import type { ViewId } from '../App'

export interface NavDef {
  view: ViewId
  label: string
  icon: LucideIcon
}

// общий список сервисов для SideNav (десктоп) и BottomNav (мобильный)
export const NAV_ITEMS: NavDef[] = [
  { view: 'day', label: 'Сегодня', icon: Sun },
  { view: 'calendar', label: 'Календарь', icon: CalendarDays },
  { view: 'checklists', label: 'Чек-листы', icon: ListChecks },
  { view: 'notes', label: 'Заметки', icon: NotebookPen },
  { view: 'diary', label: 'Дневник', icon: BookOpen },
  { view: 'blog', label: 'Блог', icon: PenLine },
  { view: 'graph', label: 'Граф', icon: Network },
  { view: 'balance', label: 'Баланс', icon: Scale },
  { view: 'roadmap', label: 'Роадмапа', icon: Map },
  { view: 'planning', label: 'Планирование', icon: CalendarRange },
]

export const HUB_ITEM: NavDef = { view: 'hub', label: 'Обзор', icon: LayoutGrid }
