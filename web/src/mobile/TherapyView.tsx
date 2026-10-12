import { useState } from 'react'
import { Plus } from 'lucide-react'
import { uid, useLS } from '../views/practice/store'
import ActionSheet from './ActionSheet'

interface TherapyNote {
  id: string
  text: string
  ts: number
}

export default function TherapyView() {
  const [notes, setNotes] = useLS<TherapyNote[]>('aod2-therapy-notes', [])
  const [noteSheet, setNoteSheet] = useState<TherapyNote | null>(null)
  const [draft, setDraft] = useState('')

  const addNote = () => {
    const text = draft.trim()
    if (!text) return
    setNotes((ns) => [{ id: uid(), text, ts: Date.now() }, ...ns])
    setDraft('')
  }

  const deleteNote = (id: string) => setNotes((ns) => ns.filter((n) => n.id !== id))

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
        Терапия
      </h1>

      <section className="mt-4 rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>Что обсудить</h2>

        <div className="flex gap-2 mt-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addNote() }}
            placeholder="Новая тема..."
            className="flex-1 min-w-0 rounded-xl px-3 outline-none"
            style={{ height: 36, background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 13 }}
          />
          <button
            onClick={addNote}
            className="flex-none grid place-items-center rounded-xl"
            style={{ width: 36, height: 36, background: 'var(--accent)', color: 'var(--on-fill)' }}
          >
            <Plus size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="mt-3 space-y-1.5">
          {notes.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)' }}>—</p>}
          {notes.map((n) => (
            <button
              key={n.id}
              onClick={() => setNoteSheet(n)}
              className="w-full text-left rounded-xl px-3 py-2"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 13, color: 'var(--text)' }}
            >
              {n.text}
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
