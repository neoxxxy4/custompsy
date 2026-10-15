import type { ReactNode } from 'react'
import { MoreVertical } from 'lucide-react'
import { TOOL_META, type MTab } from './navConfig'

const TOOL_ORDER: MTab[] = ['session', 'map', 'emotions', 'therapy', 'progress', 'path']

export default function TabShell({
  toolView,
  onTool,
  onSettings,
}: {
  toolView?: ReactNode
  onTool: (id: MTab) => void
  onSettings?: () => void
}) {
  return (
    <div className="min-h-screen pt-12">
      <div
        className="fixed top-0 inset-x-0 z-30 px-4 pt-2 pb-2"
        style={{ background: 'color-mix(in srgb, var(--bg) 92%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        <div
          className="flex items-center gap-2 rounded-full px-3 py-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {TOOL_ORDER.map((id) => {
              const meta = TOOL_META[id]
              if (!meta) return null
              return (
                <button
                  key={id}
                  onClick={() => onTool(id)}
                  className="flex-none rounded-full px-3 py-1"
                  style={{ background: 'var(--surface-2)', fontSize: 12, fontWeight: 500, color: 'var(--light)' }}
                >
                  {meta.label}
                </button>
              )
            })}
          </div>

          {onSettings && (
            <button
              onClick={onSettings}
              className="flex-none grid place-items-center rounded-full w-8 h-8"
              style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
              aria-label="Настройки"
            >
              <MoreVertical size={18} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>

      {toolView ? (
        <div className="overflow-x-hidden">{toolView}</div>
      ) : (
        <div className="px-4 pt-3 pb-28" />
      )}
    </div>
  )
}
