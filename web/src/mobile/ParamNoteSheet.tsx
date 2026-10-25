import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { formatDateRu } from './mapLogic'

export interface ParamNoteHistoryItem {
  date: string
  value: number | null
  text: string
}

// bottom-sheet заметки к пункту карты самооценки:
// одна заметка на пункт за снимок, редактируется в любое время,
// ниже — все записи этого пункта по всем снимкам
export default function ParamNoteSheet({
  paramName,
  date,
  note,
  history,
  onSave,
  onClose,
}: {
  paramName: string
  date: string
  note: string
  history: ParamNoteHistoryItem[]
  onSave: (text: string) => void
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const close = () => {
    setExiting(true)
    window.setTimeout(onClose, 220)
  }

  const open = mounted && !exiting

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        onClick={close}
        className="absolute inset-0 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.6)', opacity: open ? 1 : 0, transitionDuration: '220ms' }}
      />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl flex flex-col"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderBottom: 'none',
          maxHeight: '80vh',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform .22s ease-out',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="grid place-items-center pt-3 pb-1 flex-none">
          <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
        </div>
        <div className="flex items-center gap-2 px-4 pb-2 flex-none">
          <p className="flex-1 min-w-0 truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--light)' }}>
            {paramName}
          </p>
          <span className="flex-none" style={{ fontSize: 11, color: 'var(--muted)' }}>
            {formatDateRu(date)}
          </span>
          <button
            onClick={close}
            aria-label="Закрыть"
            className="flex-none grid place-items-center rounded-lg"
            style={{ width: 28, height: 28, color: 'var(--muted)' }}
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        <div className="px-4 pb-2 flex-none">
          <textarea
            value={note}
            onChange={(e) => onSave(e.target.value)}
            placeholder="Заметка к этому пункту за снимок…"
            rows={3}
            className="w-full rounded-xl px-3 py-2 outline-none resize-none"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              color: 'var(--light)',
              fontSize: 13,
            }}
          />
        </div>

        {history.length > 0 && (
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
            <p className="pt-1 pb-2" style={{ fontSize: 11, color: 'var(--muted)' }}>
              Все записи пункта
            </p>
            <div className="space-y-1.5">
              {history.map((h) => (
                <div
                  key={h.date}
                  className="rounded-xl px-3 py-2"
                  style={{
                    background: 'var(--surface-2)',
                    border: `1px solid ${h.date === date ? 'var(--accent)' : 'var(--line)'}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
                      {formatDateRu(h.date)}
                    </span>
                    {h.value !== null && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                        {h.value}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap" style={{ fontSize: 12, color: 'var(--text)' }}>
                    {h.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
