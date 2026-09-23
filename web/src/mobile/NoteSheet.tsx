import { useEffect, useRef, useState } from 'react'
import { Share2, Star, Tag, Trash2 } from 'lucide-react'
import type { Note } from '../views/practice/store'
import { fmtWhen, useToast } from './utils'

// шторка заметки: поднимается снизу на ~72% высоты поверх затемнённого экрана.
// закрытие: свайп вниз за шапку, тап по затемнению, кнопка «Закрыть»
export default function NoteSheet({
  note,
  folderName,
  onPatch,
  onDelete,
  onClose,
}: {
  note: Note
  folderName: string
  onPatch: (patch: Partial<Note>) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [dragY, setDragY] = useState(0)
  const startY = useRef<number | null>(null)
  const toast = useToast()

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const close = () => {
    setExiting(true)
    window.setTimeout(onClose, 230)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) setDragY(dy)
  }
  const onTouchEnd = () => {
    if (dragY > 90) close()
    setDragY(0)
    startY.current = null
  }

  const open = mounted && !exiting

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div
        onClick={close}
        className="absolute inset-0 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.6)', opacity: open ? 1 : 0, transitionDuration: '220ms' }}
      />
      {/* sheet */}
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl flex flex-col"
        style={{
          height: '72dvh',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderBottom: 'none',
          transform: open ? `translateY(${dragY}px)` : 'translateY(100%)',
          transition: dragY > 0 ? 'none' : 'transform .23s ease-out',
        }}
      >
        {/* drag handle + swipe zone */}
        <div
          className="flex-none pt-3 pb-2 grid place-items-center cursor-grab touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <span className="w-10 h-1 rounded-full" style={{ background: 'var(--line-strong)' }} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-3 min-h-0">
          <input
            value={note.title}
            onChange={(e) => onPatch({ title: e.target.value })}
            placeholder="Без названия"
            className="w-full bg-transparent outline-none"
            style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 700, color: 'var(--light)' }}
          />
          <p className="mt-1" style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtWhen(note.updated)}</p>
          <span
            className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full"
            style={{ border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: 12 }}
          >
            <Tag size={11} strokeWidth={1.8} />
            {folderName}
          </span>
          <textarea
            value={note.body}
            onChange={(e) => onPatch({ body: e.target.value })}
            placeholder="Текст заметки…"
            className="w-full bg-transparent outline-none resize-none mt-4"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              lineHeight: 1.65,
              color: 'var(--text-2)',
              minHeight: 220,
            }}
          />
        </div>

        {/* actions */}
        <div
          className="flex-none flex items-center gap-6 px-6 py-4"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <button
            onClick={() => onPatch({ pinned: !note.pinned })}
            title="Закрепить"
            style={{ color: note.pinned ? 'var(--accent)' : 'var(--muted)' }}
          >
            <Star size={20} strokeWidth={1.7} fill={note.pinned ? 'var(--accent)' : 'none'} />
          </button>
          <button onClick={() => toast.show('Скоро')} title="Поделиться" style={{ color: 'var(--muted)' }}>
            <Share2 size={20} strokeWidth={1.7} />
          </button>
          <button
            onClick={() => {
              if (window.confirm('Удалить заметку?')) {
                onDelete()
                onClose()
              }
            }}
            title="Удалить"
            style={{ color: 'var(--muted)' }}
          >
            <Trash2 size={20} strokeWidth={1.7} />
          </button>
          <button
            onClick={close}
            className="ml-auto"
            style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}
          >
            Закрыть
          </button>
        </div>
      </div>
      {toast.node}
    </div>
  )
}
