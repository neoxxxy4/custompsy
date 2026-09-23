import { useState, type ComponentType } from 'react'
import { ArrowLeft, CalendarDays, CalendarRange, ChevronRight, LayoutGrid, type LucideIcon } from 'lucide-react'
import CalendarView from '../views/CalendarView'
import PlanningView from '../views/PlanningView'
import Dashboard from '../views/Dashboard'
import ThemeToggle from '../components/ThemeToggle'
import { THEME_LABELS, type ThemeId } from '../lib/theme'
import { ScreenHeader, Tile } from './ui'

// «Обзор» внутри мобильного shell: переходы по карточкам модулей не нужны (есть нижнее меню)
function HubEmbed() {
  return <Dashboard go={() => undefined} />
}

const ITEMS: { id: string; label: string; sub: string; icon: LucideIcon; color: string; view: ComponentType }[] = [
  { id: 'calendar', label: 'Календарь', sub: 'события, ритуалы, дедлайны сезона', icon: CalendarDays, color: 'var(--f-boundaries)', view: CalendarView },
  { id: 'planning', label: 'Планирование', sub: 'циклы по 4 недели, шаблон недели', icon: CalendarRange, color: 'var(--f-emotions)', view: PlanningView },
  { id: 'hub', label: 'Обзор', sub: 'все модули системы', icon: LayoutGrid, color: 'var(--f-discipline)', view: HubEmbed },
]

// вкладка «Система»: календарь, планирование, обзор + переключатель темы
export default function SystemView({ theme, onToggleTheme }: { theme: ThemeId; onToggleTheme: () => void }) {
  const [sub, setSub] = useState<string | null>(null)

  const item = ITEMS.find((i) => i.id === sub)
  if (item) {
    const View = item.view
    return (
      <div className="relative min-h-screen pb-24">
        <button
          onClick={() => setSub(null)}
          className="absolute top-3 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--accent)', fontSize: 12.5, fontWeight: 600 }}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Система
        </button>
        <div className="mobile-embed">
          <View />
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <ScreenHeader title="Система" sub="календарь, планирование, настройки" />
      <div className="space-y-2.5">
        {ITEMS.map((i) => (
          <button
            key={i.id}
            onClick={() => setSub(i.id)}
            className="w-full rounded-2xl p-3.5 flex items-center gap-3 text-left"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
          >
            <Tile icon={i.icon} color={i.color} size={40} />
            <span className="flex-1 min-w-0">
              <span className="block" style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>{i.label}</span>
              <span className="block mt-0.5" style={{ fontSize: 12, color: 'var(--muted)' }}>{i.sub}</span>
            </span>
            <ChevronRight size={16} strokeWidth={1.8} style={{ color: 'var(--muted)' }} />
          </button>
        ))}

        {/* тема оформления */}
        <div
          className="rounded-2xl p-3.5 flex items-center gap-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          <span className="flex-1 min-w-0">
            <span className="block" style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>Тема</span>
            <span className="block mt-0.5" style={{ fontSize: 12, color: 'var(--muted)' }}>
              {THEME_LABELS[theme]} — нажми, чтобы переключить
            </span>
          </span>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </div>
  )
}
