import { Moon, Sun } from 'lucide-react'
import type { ThemeId } from '@/lib/theme'

export default function SettingsView({
  theme,
  onToggleTheme,
}: {
  theme: ThemeId
  onToggleTheme: () => void
}) {
  const isDark = theme !== 'tg-light'
  const ThemeIcon = isDark ? Sun : Moon

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
        Настройки
      </h1>

      <div className="mt-6 rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <button onClick={onToggleTheme} className="w-full flex items-center justify-between">
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--light)' }}>Тема</span>
          <span
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--text)', fontSize: 13 }}
          >
            <ThemeIcon size={14} strokeWidth={1.8} />
            {isDark ? 'День' : 'Ночь'}
          </span>
        </button>
      </div>
    </div>
  )
}
