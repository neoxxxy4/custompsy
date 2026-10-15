import type { ReactNode } from 'react'
import { useState } from 'react'
import { ChevronDown, ChevronUp, MoreVertical } from 'lucide-react'
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
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="min-h-screen pt-12">
      <div
        className="fixed top-0 inset-x-0 z-30 px-3 pt-2 pb-2"
        style={{ background: 'color-mix(in srgb, var(--bg) 92%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        <div
          className="flex items-center gap-2 rounded-full px-2 py-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex-none grid place-items-center rounded-full"
            style={{ width: 26, height: 26, background: 'var(--surface-2)', color: 'var(--muted)' }}
            aria-label={expanded ? 'Свернуть' : 'Развернуть'}
          >
            {expanded ? <ChevronUp size={14} strokeWidth={2.5} /> : <ChevronDown size={14} strokeWidth={2.5} />}
          </button>

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
              className="flex-none grid place-items-center rounded-full"
              style={{ width: 26, height: 26, background: 'var(--surface-2)', color: 'var(--muted)' }}
              aria-label="Настройки"
            >
              <MoreVertical size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div
          className="fixed inset-x-0 z-20 px-3 pt-16 pb-4"
          style={{ top: 0, bottom: 0, background: 'color-mix(in srgb, var(--bg) 96%, transparent)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
          onClick={() => setExpanded(false)}
        >
          <div
            className="grid grid-cols-3 gap-2 rounded-2xl p-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', marginTop: 44 }}
            onClick={(e) => e.stopPropagation()}
          >
            {TOOL_ORDER.map((id) => {
              const meta = TOOL_META[id]
              if (!meta) return null
              const Icon = meta.icon
              return (
                <button
                  key={id}
                  onClick={() => { onTool(id); setExpanded(false) }}
                  className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
                >
                  <Icon size={22} strokeWidth={1.8} style={{ color: 'var(--light)' }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)' }}>{meta.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {toolView ? (
        <div className="overflow-x-hidden">{toolView}</div>
      ) : (
        <div className="px-4 pt-3 pb-28" />
      )}
    </div>
  )
}
