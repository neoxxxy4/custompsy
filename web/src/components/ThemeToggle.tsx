import { DraftingCompass, Moon, Sun, type LucideIcon } from 'lucide-react'
import { THEME_LABELS, type ThemeId } from '../lib/theme'

const ICONS: Record<ThemeId, LucideIcon> = {
  blueprint: DraftingCompass,
  'tg-dark': Moon,
  'tg-light': Sun,
}

// одна кнопка переключения темы по кругу: Блупринт → ТГ Тёмный → ТГ Светлый
export default function ThemeToggle({ theme, onToggle }: { theme: ThemeId; onToggle: () => void }) {
  const Icon = ICONS[theme]
  return (
    <button
      onClick={onToggle}
      title={`Тема: ${THEME_LABELS[theme]} — нажми, чтобы переключить`}
      className="grid place-items-center w-7 h-7 rounded-full flex-none hover:opacity-80 transition-opacity"
      style={{ border: '1px solid var(--line-strong)', color: 'var(--accent)' }}
    >
      <Icon size={13} strokeWidth={1.5} />
    </button>
  )
}
