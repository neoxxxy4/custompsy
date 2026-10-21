import { useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, Folder, Home, Mic, MoreHorizontal, type LucideIcon } from 'lucide-react'

// режим погружения: редактор на весь экран поверх всего (включая BottomNav).
// ← назад · заголовок · ⋯ действия; нижняя пилюля: домой / папки / микрофон-заглушка;
// свайп от левого края вправо = назад.
// inline — редактор в потоке страницы (Записи): шапка и верхняя навигация остаются видны,
// нижняя пилюля не рисуется
export default function Immersion({
  title,
  onBack,
  onHome,
  onMic,
  menu,
  inline,
  children,
}: {
  title: string
  onBack: () => void
  onHome: () => void
  onMic: () => void
  menu?: { label: string; icon: LucideIcon; onClick: () => void }[]
  inline?: boolean
  children: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const edgeX = useRef<number | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    const x = e.touches[0].clientX
    edgeX.current = x < 28 ? x : null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (edgeX.current === null) return
    const dx = e.changedTouches[0].clientX - edgeX.current
    edgeX.current = null
    if (dx > 70) onBack()
  }

  return (
    <div
      className={inline ? 'flex flex-col fadein' : 'fixed inset-0 z-50 flex flex-col fadein'}
      style={inline ? undefined : { background: 'var(--bg)' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* header */}
      <header
        className="flex-none flex items-center gap-2 px-2 h-14"
        style={{ borderBottom: inline ? 'none' : '1px solid var(--line)' }}
      >
        <button onClick={onBack} className="p-2" title="Назад">
          <ArrowLeft size={22} strokeWidth={1.8} style={{ color: 'var(--accent)' }} />
        </button>
        <span
          className="flex-1 text-center truncate"
          style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600, color: 'var(--light)' }}
        >
          {title}
        </span>
        {menu ? (
          <div className="relative">
            <button onClick={() => setMenuOpen((o) => !o)} className="p-2" title="Действия">
              <MoreHorizontal size={20} strokeWidth={1.8} style={{ color: 'var(--muted)' }} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-1 rounded-xl py-1.5 z-10 fadein"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', minWidth: 170 }}
                >
                  {menu.map((m) => {
                    const Icon = m.icon
                    return (
                      <button
                        key={m.label}
                        onClick={() => { m.onClick(); setMenuOpen(false) }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left"
                        style={{ fontSize: 13, color: 'var(--light)' }}
                      >
                        <Icon size={15} strokeWidth={1.7} style={{ color: 'var(--muted)' }} />
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          <span className="w-10" />
        )}
      </header>

      {/* content */}
      <div className="flex-1 overflow-y-auto min-h-0">{children}</div>

      {/* bottom pill */}
      {!inline && (
        <div
          className="fixed bottom-6 left-1/2 z-10 flex items-center gap-8 px-7 py-3 rounded-full"
          style={{
            transform: 'translateX(-50%)',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          <button onClick={onHome} title="Домой">
            <Home size={20} strokeWidth={1.7} style={{ color: 'var(--muted)' }} />
          </button>
          <button onClick={onBack} title="К списку">
            <Folder size={20} strokeWidth={1.7} style={{ color: 'var(--muted)' }} />
          </button>
          <button onClick={onMic} title="Голосовой ввод">
            <Mic size={20} strokeWidth={1.7} style={{ color: 'var(--muted)' }} />
          </button>
        </div>
      )}
    </div>
  )
}
