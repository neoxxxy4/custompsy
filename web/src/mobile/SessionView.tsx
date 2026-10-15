import { useState } from 'react'
import { Plus } from 'lucide-react'
import { uid, useLS } from '../views/practice/store'
import ActionSheet from './ActionSheet'

interface SessionNote {
  id: string
  text: string
  ts: number
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const safeDate = (d?: string | null): string => {
  if (!d || !DATE_RE.test(d)) return '—'
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}

export default function SessionView() {
  const [notes, setNotes] = useLS<SessionNote[]>('aod4-session-notes', [])
  const [draft, setDraft] = useState('')
  const [noteSheet, setNoteSheet] = useState<SessionNote | null>(null)

  const addNote = () => {
    const text = draft.trim()
    if (!text) return
    setNotes((ns) => [{ id: uid(), text, ts: Date.now() }, ...ns])
    setDraft('')
  }

  const deleteNote = (id: string) => setNotes((ns) => ns.filter((n) => n.id !== id))

  const dateStr = (ts: number) => safeDate(new Date(ts).toISOString().slice(0, 10))

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
        Сессия
      </h1>
      <p className="mt-1" style={{ fontSize: 13, color: 'var(--muted)' }}>
        Заметки и вопросы для специалиста
      </p>

      <section className="mt-4 rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addNote() }}
            placeholder="Новая тема или вопрос..."
            className="flex-1 min-w-0 rounded-xl px-3 outline-none"
            style={{ height: 40, background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 13 }}
          />
          <button
            onClick={addNote}
            className="flex-none grid place-items-center rounded-xl"
            style={{ width: 40, height: 40, background: 'var(--accent)', color: 'var(--on-fill)' }}
          >
            <Plus size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="mt-3 space-y-1.5">
          {notes.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>—</p>}
          {notes.map((n) => (
            <button
              key={n.id}
              onClick={() => setNoteSheet(n)}
              className="w-full text-left rounded-xl px-3 py-2.5"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
            >
              <span className="block" style={{ fontSize: 13, color: 'var(--text)' }}>{n.text}</span>
              <span className="block mt-1" style={{ fontSize: 11, color: 'var(--muted)' }}>{dateStr(n.ts)}</span>
            </button>
          ))}
        </div>
      </section>

      {noteSheet && (
        <ActionSheet
          title={noteSheet.text || 'Заметка'}
          onClose={() => setNoteSheet(null)}
          onDelete={() => { deleteNote(noteSheet.id); setNoteSheet(null) }}
        />
      )}
    </div>
  )
}
