import { useMemo, useState } from 'react'
import { type Folder, type Note, SEED_FOLDERS, SEED_NOTES, uid, useLS } from './store'

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function NotesTab() {
  const [folders, setFolders] = useLS<Folder[]>('aod2-folders', SEED_FOLDERS)
  const [notes, setNotes] = useLS<Note[]>('aod2-notes', SEED_NOTES)
  const [activeFolder, setActiveFolder] = useState<string>('inbox')
  const [activeNote, setActiveNote] = useState<string | null>(null)
  const [folderDraft, setFolderDraft] = useState('')
  const [addingFolder, setAddingFolder] = useState(false)

  const folderNotes = useMemo(
    () => notes.filter((n) => n.folderId === activeFolder).sort((a, b) => b.updated - a.updated),
    [notes, activeFolder]
  )
  const note = notes.find((n) => n.id === activeNote) || null

  const count = (fid: string) => notes.filter((n) => n.folderId === fid).length

  const createNote = () => {
    const n: Note = { id: uid(), folderId: activeFolder, title: '', body: '', updated: Date.now() }
    setNotes((ns) => [n, ...ns])
    setActiveNote(n.id)
  }

  const patchNote = (id: string, patch: Partial<Note>) =>
    setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch, updated: Date.now() } : n)))

  const addFolder = () => {
    if (!folderDraft.trim()) return
    const f = { id: uid(), name: folderDraft.trim() }
    setFolders((fs) => [...fs, f])
    setFolderDraft('')
    setAddingFolder(false)
    setActiveFolder(f.id)
  }

  const deleteFolder = (fid: string) => {
    if (fid === 'inbox') return
    if (!window.confirm('Удалить папку? Заметки переедут во «Входящие».')) return
    setNotes((ns) => ns.map((n) => (n.folderId === fid ? { ...n, folderId: 'inbox' } : n)))
    setFolders((fs) => fs.filter((f) => f.id !== fid))
    if (activeFolder === fid) setActiveFolder('inbox')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[180px_240px_1fr] gap-3" style={{ minHeight: 480 }}>
      {/* folders */}
      <div className="panel rounded-md p-3 h-fit">
        <div className="flex items-center justify-between px-2 py-1">
          <p className="mono-label">Папки</p>
          <button onClick={() => setAddingFolder((v) => !v)} className="mono-label-bright hover:opacity-70">+</button>
        </div>
        {addingFolder && (
          <div className="px-1 pb-2 fadein">
            <input
              autoFocus
              value={folderDraft}
              onChange={(e) => setFolderDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFolder()}
              placeholder="Имя папки…"
              className="w-full bg-transparent rounded-sm px-2 py-1.5 text-[12px] outline-none"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--light)' }}
            />
          </div>
        )}
        <div className="flex lg:flex-col gap-1 overflow-x-auto">
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => { setActiveFolder(f.id); setActiveNote(null) }}
              className="group flex items-center gap-2 px-2.5 py-2 rounded-sm text-left transition-colors whitespace-nowrap"
              style={{
                background: activeFolder === f.id ? 'var(--active-bg)' : 'transparent',
                color: activeFolder === f.id ? 'var(--light)' : 'var(--text)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-none">
                <path d="M1 3C1 2.4 1.4 2 2 2H4.5L5.5 3H10C10.6 3 11 3.4 11 4V9C11 9.6 10.6 10 10 10H2C1.4 10 1 9.6 1 9V3Z"
                  stroke={activeFolder === f.id ? 'var(--accent)' : 'var(--muted)'} strokeWidth="1.1" />
              </svg>
              <span className="flex-1 text-[12.5px] truncate">{f.name}</span>
              <span className="mono-label" style={{ fontSize: 8 }}>{count(f.id)}</span>
              {f.id !== 'inbox' && (
                <span
                  onClick={(e) => { e.stopPropagation(); deleteFolder(f.id) }}
                  className="mono-label opacity-0 group-hover:opacity-100 hover:!opacity-60 px-0.5"
                  style={{ fontSize: 9 }}>✕</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* notes list */}
      <div className="panel rounded-md p-3 h-fit lg:max-h-[560px] lg:overflow-y-auto">
        <button onClick={createNote}
          className="w-full mono-label-bright px-3 py-2 rounded-sm mb-2 hover:opacity-85 transition-opacity"
          style={{ background: 'var(--accent)', color: '#fff' }}>
          + заметка
        </button>
        {folderNotes.length === 0 && (
          <p className="mono-label px-2 py-4 text-center" style={{ fontSize: 9, lineHeight: 1.8 }}>Пусто</p>
        )}
        {folderNotes.map((n) => (
          <button
            key={n.id}
            onClick={() => setActiveNote(n.id)}
            className="w-full text-left px-3 py-2.5 rounded-sm mb-1 transition-colors"
            style={{
              background: activeNote === n.id ? 'var(--hover)' : 'transparent',
              border: `1px solid ${activeNote === n.id ? 'var(--line-strong)' : 'transparent'}`,
            }}
          >
            <p className="text-[13px] truncate" style={{ color: 'var(--light)' }}>
              {n.title || 'Без названия'}
            </p>
            <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--muted)' }}>
              {n.body ? n.body.split('\n')[0] : '—'}
            </p>
            <p className="mono-label mt-1" style={{ fontSize: 8 }}>{fmtTime(n.updated)}</p>
          </button>
        ))}
      </div>

      {/* editor */}
      <div className="panel rounded-md p-5 flex flex-col">
        {note ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <select
                value={note.folderId}
                onChange={(e) => patchNote(note.id, { folderId: e.target.value })}
                className="bg-transparent rounded-sm px-2 py-1.5 text-[11px] outline-none cursor-pointer"
                style={{ border: '1px solid var(--line)', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
              >
                {folders.map((f) => (
                  <option key={f.id} value={f.id} style={{ background: 'var(--surface)' }}>{f.name}</option>
                ))}
              </select>
              <span className="mono-label flex-1" style={{ fontSize: 8 }}>изм. {fmtTime(note.updated)}</span>
              <button
                onClick={() => {
                  if (window.confirm('Удалить заметку?')) {
                    setNotes((ns) => ns.filter((n) => n.id !== note.id))
                    setActiveNote(null)
                  }
                }}
                className="mono-label hover:opacity-60">удалить</button>
            </div>
            <input
              value={note.title}
              onChange={(e) => patchNote(note.id, { title: e.target.value })}
              placeholder="Заголовок"
              className="w-full bg-transparent outline-none display mb-3"
              style={{ fontSize: 26, color: 'var(--light)', borderBottom: '1px solid var(--line)', paddingBottom: 10 }}
            />
            <textarea
              value={note.body}
              onChange={(e) => patchNote(note.id, { body: e.target.value })}
              placeholder="Текст заметки…"
              className="flex-1 w-full bg-transparent outline-none resize-none text-[13.5px] leading-relaxed"
              style={{ color: 'var(--text)', minHeight: 280, fontFamily: 'var(--font-body)' }}
            />
            <p className="mono-label mt-3" style={{ fontSize: 8 }}>сохраняется автоматически в этом браузере</p>
          </>
        ) : (
          <div className="flex-1 grid place-items-center">
            <p className="mono-label text-center" style={{ lineHeight: 2.2 }}>
              Выбери заметку<br />или создай новую
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
