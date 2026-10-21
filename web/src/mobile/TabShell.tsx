import type { ReactNode } from 'react'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { TOOL_META, type AppTab, type MTab } from './navConfig'

export default function TabShell({
  tab,
  activeFolderId,
  onFolder,
  onTool,
  toolView,
}: {
  tab: AppTab
  activeFolderId: string
  onFolder: (id: string) => void
  onTool: (id: MTab) => void
  toolView?: ReactNode
}) {
  const [expanded, setExpanded] = useState(false)

  const folders = tab.folders ?? []
  const activeFolder = folders.find((f) => f.id === activeFolderId) ?? folders[0]
  const items = activeFolder?.items ?? []

  return (
    <div className="min-h-screen pt-12">
      {/* прозрачный ловец кликов: закрывает дропдаун, не скрывая открытый сервис */}
      {expanded && <div className="fixed inset-0 z-20" onClick={() => setExpanded(false)} />}

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
            aria-label={expanded ? 'Свернуть папки' : 'Развернуть папки'}
          >
            {expanded ? <ChevronUp size={14} strokeWidth={2.5} /> : <ChevronDown size={14} strokeWidth={2.5} />}
          </button>

          <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {items.length === 0 && (
              <span className="px-2 py-1" style={{ fontSize: 12, color: 'var(--muted)' }}>Пусто</span>
            )}
            {items.map((item) => {
              const meta = TOOL_META[item.id]
              if (!meta) return null
              return (
                <button
                  key={item.id}
                  onClick={() => onTool(item.id)}
                  className="flex-none rounded-full px-3 py-1"
                  style={{ background: 'var(--surface-2)', fontSize: 12, fontWeight: 500, color: 'var(--light)' }}
                >
                  {item.label || meta.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* папки выпадают сверху вниз прямо под строкой сервисов — вид сервиса не перекрывается */}
        {expanded && (
          <div
            className="mt-1 flex flex-wrap gap-1 rounded-2xl px-2 py-2"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
          >
            {folders.map((folder) => {
              const active = folder.id === activeFolderId
              return (
                <button
                  key={folder.id}
                  onClick={() => { onFolder(folder.id); setExpanded(false) }}
                  className="flex-none rounded-full px-3 py-1"
                  style={{
                    background: active ? 'var(--accent)' : 'var(--surface-2)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: active ? 'var(--on-fill)' : 'var(--light)',
                  }}
                >
                  {folder.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {toolView ? (
        <div className="overflow-x-hidden">{toolView}</div>
      ) : (
        <div className="px-4 pt-3 pb-28" />
      )}
    </div>
  )
}
