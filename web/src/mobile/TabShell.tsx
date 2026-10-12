import type { ReactNode } from 'react'
import { useRef } from 'react'
import { MoreVertical } from 'lucide-react'
import { TOOL_META, type AppTab, type MTab } from './navConfig'
import { useState } from 'react'

export default function TabShell({
  tab,
  activeFolderId,
  onFolder,
  onTool,
  toolView,
  onSettings,
}: {
  tab: AppTab
  activeFolderId: string
  onFolder: (id: string) => void
  onTool: (id: MTab) => void
  toolView?: ReactNode
  onSettings?: () => void
}) {
  const folder = tab.folders.find((f) => f.id === activeFolderId) ?? tab.folders[0]
  const [foldersVisible, setFoldersVisible] = useState(false)
  const swipeStart = useRef<number | null>(null)

  const folderIdx = tab.folders.findIndex((f) => f.id === folder?.id)
  const prevFolder = () => {
    const f = tab.folders[folderIdx - 1]
    if (f) onFolder(f.id)
  }
  const nextFolder = () => {
    const f = tab.folders[folderIdx + 1]
    if (f) onFolder(f.id)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (toolView) return
    swipeStart.current = e.clientX
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (toolView || swipeStart.current == null) return
    const dx = e.clientX - swipeStart.current
    swipeStart.current = null
    if (Math.abs(dx) < 60) return
    if (dx < 0) nextFolder()
    else prevFolder()
  }

  return (
    <div className="min-h-screen pt-12">
      <div
        className="fixed top-0 inset-x-0 z-30 px-4 pt-2 pb-2 flex flex-col gap-2"
        style={{ background: foldersVisible ? 'color-mix(in srgb, var(--bg) 92%, transparent)' : 'transparent', backdropFilter: foldersVisible ? 'blur(12px)' : 'none', WebkitBackdropFilter: foldersVisible ? 'blur(12px)' : 'none' }}
      >
        {foldersVisible && (
          <div
            className="flex items-center gap-1 rounded-full px-3 py-1 overflow-x-auto no-scrollbar"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
          >
            {tab.folders.map((f) => (
              <button
                key={f.id}
                onClick={() => onFolder(f.id)}
                className="flex-none rounded-full px-3 py-1"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  background: folder?.id === f.id ? 'var(--accent)' : 'transparent',
                  color: folder?.id === f.id ? 'var(--on-fill)' : 'var(--muted)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        <div
          className="flex items-center gap-2 rounded-full px-3 py-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          <button
            onClick={() => setFoldersVisible((v) => !v)}
            className="flex-none rounded-full px-3 py-1"
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}
            aria-label={foldersVisible ? 'Скрыть папки' : 'Показать папки'}
          >
            {foldersVisible ? 'Скрыть' : 'Папки'}
          </button>

          <div
            className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar"
          >
            {!folder || folder.items.length === 0 ? (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Нет инструментов</span>
            ) : (
              folder.items.map((item) => {
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
              })
            )}
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
        <div
          className="px-4 pt-3 pb-28"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => { swipeStart.current = null }}
          style={{ touchAction: 'pan-y' }}
        >
        </div>
      )}

    </div>
  )
}
