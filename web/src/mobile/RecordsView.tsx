import { useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  FileText,
  Folder as FolderIcon,
  ListChecks,
  ListOrdered,
  Plus,
  Search,
  Share2,
  Star,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import {
  type Diary,
  type Folder,
  type ListRecord,
  type Note,
  SEED_FOLDERS,
  SEED_NOTES,
  todayKey,
  uid,
  useLS,
} from '../views/practice/store'
import Immersion from './Immersion'
import ListRecordEditor from './ListRecordEditor'
import { MCheck, Tile } from './ui'
import { fmtWhen, useToast } from './utils'

export type FolderKey = 'all' | 'notes' | 'lists' | 'diary'

const FOLDER_TABS: { id: FolderKey; label: string; icon: LucideIcon }[] = [
  { id: 'all', label: 'Всё', icon: FolderIcon },
  { id: 'notes', label: 'Заметки', icon: FileText },
  { id: 'lists', label: 'Списки', icon: ListChecks },
  { id: 'diary', label: 'Дневник', icon: BookOpen },
]

const TILE_COLORS = ['var(--accent)', 'var(--f-metacog)', 'var(--f-neuro)', 'var(--f-emotions)', 'var(--f-environment)']

const WD_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MO_SHORT = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек']
const diaryLabel = (dk: string) => {
  const d = new Date(dk + 'T12:00:00')
  return `${d.getDate()} ${MO_SHORT[d.getMonth()]} · ${WD_SHORT[d.getDay()]}`
}

const recTitle = (r: ListRecord) => r.title || (r.kind === 'checklist' ? 'Чек-лист' : 'Список')
const recSub = (r: ListRecord) =>
  r.kind === 'checklist'
    ? `${r.items.filter((i) => i.done).length}/${r.items.length} пунктов`
    : `${r.items.length} пунктов`

export default function RecordsView({
  folder,
  onFolder,
  onHome,
}: {
  folder: FolderKey
  onFolder: (f: FolderKey) => void
  onHome: () => void
}) {
  const tk = todayKey()
  const [notes, setNotes] = useLS<Note[]>('aod2-notes', SEED_NOTES)
  const [folders] = useLS<Folder[]>('aod2-folders', SEED_FOLDERS)
  const [listrecs, setListrecs] = useLS<ListRecord[]>('aod2-listrecs', [])
  const [diary, setDiary] = useLS<Diary>('aod2-diary', {})

  const [openNoteId, setOpenNoteId] = useState<string | null>(null)
  const [openDiaryDate, setOpenDiaryDate] = useState<string | null>(null)
  const [openRecId, setOpenRecId] = useState<string | null>(null)
  const [fabMenu, setFabMenu] = useState(false)
  const [listFab, setListFab] = useState(false)
  const toast = useToast()

  const touchX = useRef<number | null>(null)

  const folderName = (fid: string) => folders.find((f) => f.id === fid)?.name ?? 'Входящие'

  const sortedNotes = useMemo(() => [...notes].sort((a, b) => b.updated - a.updated), [notes])
  const sortedRecs = useMemo(() => [...listrecs].sort((a, b) => b.updated - a.updated), [listrecs])

  const diaryDays = useMemo(
    () =>
      Object.keys(diary)
        .filter((k) => diary[k]?.text || diary[k]?.emotion)
        .sort()
        .reverse(),
    [diary]
  )

  // общая лента «Всё»
  const feed = useMemo(() => {
    type Item = {
      kind: 'note' | 'listrec' | 'diary'
      id: string
      title: string
      sub: string
      updated: number
      recKind?: ListRecord['kind']
    }
    const items: Item[] = [
      ...notes.map((n): Item => ({
        kind: 'note', id: n.id,
        title: n.title || 'Без названия',
        sub: n.body.split('\n')[0] || '—',
        updated: n.updated,
      })),
      ...listrecs.map((r): Item => ({
        kind: 'listrec', id: r.id, recKind: r.kind,
        title: recTitle(r),
        sub: recSub(r),
        updated: r.updated,
      })),
      ...diaryDays.map((dk): Item => ({
        kind: 'diary', id: dk,
        title: `Дневник · ${diaryLabel(dk)}`,
        sub: diary[dk].text.split('\n')[0] || diary[dk].emotion,
        updated: diary[dk].updated || 0,
      })),
    ]
    return items.sort((a, b) => b.updated - a.updated)
  }, [notes, listrecs, diaryDays, diary])

  // ─── свайп папок ───
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 60) return
    const idx = FOLDER_TABS.findIndex((t) => t.id === folder)
    const next = dx < 0 ? idx + 1 : idx - 1
    if (next >= 0 && next < FOLDER_TABS.length) onFolder(FOLDER_TABS[next].id)
  }

  // ─── действия ───
  const createNote = () => {
    const n: Note = { id: uid(), folderId: 'inbox', title: '', body: '', updated: Date.now() }
    setNotes((ns) => [n, ...ns])
    setOpenNoteId(n.id)
  }

  const createRec = (kind: ListRecord['kind']) => {
    const r: ListRecord = { id: uid(), kind, title: '', items: [], updated: Date.now() }
    setListrecs((rs) => [r, ...rs])
    setOpenRecId(r.id)
  }
  const patchRec = (id: string, patch: Partial<ListRecord>) =>
    setListrecs((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch, updated: Date.now() } : r)))

  const patchNote = (id: string, patch: Partial<Note>) =>
    setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch, updated: Date.now() } : n)))

  const openNote = notes.find((n) => n.id === openNoteId) ?? null
  const openRec = listrecs.find((r) => r.id === openRecId) ?? null
  const diaryEntry = (dk: string) => diary[dk] || { text: '', emotion: '', focus: 5, updated: 0 }
  const patchDiary = (dk: string, p: Partial<Diary[string]>) =>
    setDiary((d) => ({ ...d, [dk]: { ...diaryEntry(dk), ...p, updated: Date.now() } }))

  const onFab = () => {
    if (folder === 'notes') createNote()
    else if (folder === 'lists') setListFab((o) => !o)
    else if (folder === 'diary') setOpenDiaryDate(tk)
    else setFabMenu((o) => !o)
  }

  return (
    <div className="px-4 pt-5 pb-36 min-h-screen">
      {/* header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
          Записи
        </h1>
        <button onClick={() => toast.show('Поиск — скоро')} className="p-1 pt-2" title="Поиск">
          <Search size={20} strokeWidth={1.7} style={{ color: 'var(--muted)' }} />
        </button>
      </div>

      {/* папки-чипы */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto mb-4">
        {FOLDER_TABS.map((t) => {
          const active = folder === t.id
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => onFolder(t.id)}
              className="flex-none flex items-center gap-1.5 px-4 py-2 rounded-full transition-colors"
              style={{
                background: active ? 'var(--accent)' : 'transparent',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--line-strong)'}`,
                color: active ? '#fff' : 'var(--muted)',
              }}
            >
              <Icon size={14} strokeWidth={1.8} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* контент папки (свайп влево/вправо листает папки) */}
      <div key={folder} className="fadein space-y-2.5" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {folder === 'all' && (
          <>
            {feed.length === 0 && <Empty text="Пока пусто" />}
            {feed.map((it) => (
              <button
                key={`${it.kind}-${it.id}`}
                onClick={() => {
                  if (it.kind === 'note') setOpenNoteId(it.id)
                  else if (it.kind === 'diary') setOpenDiaryDate(it.id)
                  else setOpenRecId(it.id)
                }}
                className="w-full rounded-2xl p-3.5 flex items-center gap-3 text-left"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
              >
                <Tile
                  icon={
                    it.kind === 'note' ? FileText
                    : it.kind === 'listrec' ? (it.recKind === 'checklist' ? ListChecks : ListOrdered)
                    : BookOpen
                  }
                  color={
                    it.kind === 'note' ? 'var(--accent)'
                    : it.kind === 'listrec' ? (it.recKind === 'checklist' ? 'var(--ring-checklists)' : 'var(--ring-tasks)')
                    : 'var(--f-emotions)'
                  }
                  size={36}
                />
                <span className="flex-1 min-w-0">
                  <span className="block truncate" style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--light)' }}>
                    {it.title}
                  </span>
                  <span className="block truncate mt-0.5" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    {it.sub}
                  </span>
                </span>
                {it.updated > 0 && (
                  <span className="flex-none" style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtWhen(it.updated)}</span>
                )}
              </button>
            ))}
          </>
        )}

        {folder === 'notes' && (
          <>
            {sortedNotes.length === 0 && <Empty text="Нет заметок — создай первую через +" />}
            {sortedNotes.map((n, i) => (
              <button
                key={n.id}
                onClick={() => setOpenNoteId(n.id)}
                className="w-full rounded-2xl p-3.5 text-left"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
              >
                <span className="flex items-start gap-3">
                  <Tile icon={FileText} color={TILE_COLORS[i % TILE_COLORS.length]} size={44} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-start justify-between gap-2">
                      <span className="truncate" style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>
                        {n.title || 'Без названия'}
                      </span>
                      <span className="flex-none pt-0.5" style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {fmtWhen(n.updated)}
                      </span>
                    </span>
                    <span className="block mt-1 line-clamp-2" style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--muted)' }}>
                      {n.body || '—'}
                    </span>
                  </span>
                </span>
                <span className="flex items-center justify-between mt-2.5">
                  <span
                    className="px-2.5 py-0.5 rounded-md"
                    style={{ background: 'var(--surface-2)', fontSize: 11, color: 'var(--muted)' }}
                  >
                    {folderName(n.folderId)}
                  </span>
                  <Star
                    size={16}
                    strokeWidth={1.7}
                    onClick={(e) => {
                      e.stopPropagation()
                      patchNote(n.id, { pinned: !n.pinned })
                    }}
                    style={{ color: n.pinned ? 'var(--accent)' : 'var(--muted)' }}
                    fill={n.pinned ? 'var(--accent)' : 'none'}
                  />
                </span>
              </button>
            ))}
          </>
        )}

        {folder === 'lists' && (
          <>
            {sortedRecs.length === 0 && <Empty text="Нет записей — создай чек-лист или список через +" />}
            {sortedRecs.map((r) => (
              <ListRecCard
                key={r.id}
                rec={r}
                onOpen={() => setOpenRecId(r.id)}
                onToggleItem={(itemId) =>
                  patchRec(r.id, {
                    items: r.items.map((x) => (x.id === itemId ? { ...x, done: !x.done } : x)),
                  })
                }
              />
            ))}
          </>
        )}

        {folder === 'diary' && (
          <>
            {diaryDays.length === 0 && <Empty text="Нет записей — напиши первую через +" />}
            {diaryDays.map((dk) => (
              <button
                key={dk}
                onClick={() => setOpenDiaryDate(dk)}
                className="w-full rounded-2xl p-3.5 flex items-center gap-3 text-left"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
              >
                <Tile icon={BookOpen} color="var(--f-emotions)" size={36} />
                <span className="flex-1 min-w-0">
                  <span className="block" style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--light)' }}>
                    {diaryLabel(dk)}
                  </span>
                  <span className="block truncate mt-0.5" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    {diary[dk].text.split('\n')[0] || '—'}
                  </span>
                </span>
                {diary[dk].emotion && (
                  <span
                    className="flex-none px-2.5 py-0.5 rounded-full"
                    style={{ border: '1px solid var(--accent)', fontSize: 11, color: 'var(--accent)' }}
                  >
                    {diary[dk].emotion}
                  </span>
                )}
              </button>
            ))}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={onFab}
        className="fixed right-4 z-40 grid place-items-center rounded-full"
        style={{
          bottom: 'calc(76px + env(safe-area-inset-bottom))',
          width: 56, height: 56,
          background: 'var(--accent)',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}
        title="Создать"
      >
        <Plus size={24} strokeWidth={2} />
      </button>

      {/* меню FAB на «Всё» */}
      {fabMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setFabMenu(false)} />
          <div
            className="fixed right-4 z-50 rounded-2xl py-1.5 fadein"
            style={{
              bottom: 'calc(142px + env(safe-area-inset-bottom))',
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              minWidth: 190,
            }}
          >
            {([
              ['Заметка', FileText, () => { onFolder('notes'); createNote() }],
              ['Чек-лист', ListChecks, () => createRec('checklist')],
              ['Список', ListOrdered, () => createRec('list')],
              ['Запись в дневник', BookOpen, () => { onFolder('diary'); setOpenDiaryDate(tk) }],
            ] as const).map(([label, Icon, fn]) => (
              <button
                key={label}
                onClick={() => { setFabMenu(false); fn() }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left"
                style={{ fontSize: 13.5, color: 'var(--light)' }}
              >
                <Icon size={15} strokeWidth={1.7} style={{ color: 'var(--accent)' }} />
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* мини-меню FAB на «Списках»: Чек-лист / Список */}
      {listFab && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setListFab(false)} />
          <div
            className="fixed right-4 z-50 rounded-2xl py-1.5 fadein"
            style={{
              bottom: 'calc(142px + env(safe-area-inset-bottom))',
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              minWidth: 190,
            }}
          >
            {([
              ['Чек-лист', ListChecks, () => createRec('checklist')],
              ['Список', ListOrdered, () => createRec('list')],
            ] as const).map(([label, Icon, fn]) => (
              <button
                key={label}
                onClick={() => { setListFab(false); fn() }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left"
                style={{ fontSize: 13.5, color: 'var(--light)' }}
              >
                <Icon size={15} strokeWidth={1.7} style={{ color: 'var(--accent)' }} />
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* погружение: заметка */}
      {openNote && (
        <Immersion
          title={openNote.title || 'Заметка'}
          onBack={() => setOpenNoteId(null)}
          onHome={onHome}
          onMic={() => toast.show('Скоро')}
          menu={[
            { label: openNote.pinned ? 'Открепить' : 'Закрепить', icon: Star, onClick: () => patchNote(openNote.id, { pinned: !openNote.pinned }) },
            { label: 'Поделиться', icon: Share2, onClick: () => toast.show('Скоро') },
            {
              label: 'Удалить', icon: Trash2,
              onClick: () => {
                if (window.confirm('Удалить заметку?')) {
                  setNotes((ns) => ns.filter((n) => n.id !== openNote.id))
                  setOpenNoteId(null)
                }
              },
            },
          ]}
        >
          <div className="px-5 py-4">
            <input
              value={openNote.title}
              onChange={(e) => patchNote(openNote.id, { title: e.target.value })}
              placeholder="Заголовок"
              className="w-full bg-transparent outline-none"
              style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 700, color: 'var(--light)' }}
            />
            <p className="mt-1 mb-3" style={{ fontSize: 12, color: 'var(--muted)' }}>
              {fmtWhen(openNote.updated)} · {folderName(openNote.folderId)}
            </p>
            <textarea
              value={openNote.body}
              onChange={(e) => patchNote(openNote.id, { body: e.target.value })}
              placeholder="Текст заметки…"
              className="w-full bg-transparent outline-none resize-none"
              style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.65, color: 'var(--text-2)', minHeight: 320 }}
            />
          </div>
        </Immersion>
      )}

      {/* погружение: чек-лист / список */}
      {openRec && (
        <ListRecordEditor
          rec={openRec}
          onBack={() => setOpenRecId(null)}
          onHome={onHome}
          onMic={() => toast.show('Скоро')}
          onPatch={(patch) => patchRec(openRec.id, patch)}
          onDelete={() => {
            setListrecs((rs) => rs.filter((r) => r.id !== openRec.id))
            setOpenRecId(null)
          }}
        />
      )}

      {/* погружение: дневник */}
      {openDiaryDate && (
        <Immersion
          title={`Дневник · ${diaryLabel(openDiaryDate)}`}
          onBack={() => setOpenDiaryDate(null)}
          onHome={onHome}
          onMic={() => toast.show('Скоро')}
          menu={[
            {
              label: 'Удалить запись', icon: Trash2,
              onClick: () => {
                if (window.confirm('Удалить запись дневника?')) {
                  setDiary((d) => {
                    const next = { ...d }
                    delete next[openDiaryDate]
                    return next
                  })
                  setOpenDiaryDate(null)
                }
              },
            },
          ]}
        >
          <div className="px-5 py-4">
            <textarea
              value={diaryEntry(openDiaryDate).text}
              onChange={(e) => patchDiary(openDiaryDate, { text: e.target.value })}
              placeholder="Как прошёл день?"
              className="w-full bg-transparent outline-none resize-none"
              style={{ fontFamily: 'var(--font-body)', fontSize: 15.5, lineHeight: 1.7, color: 'var(--text-2)', minHeight: 300 }}
            />
            <input
              value={diaryEntry(openDiaryDate).emotion}
              onChange={(e) => patchDiary(openDiaryDate, { emotion: e.target.value })}
              placeholder="эмоция дня"
              className="mt-2 bg-transparent outline-none px-3.5 py-1.5 rounded-full"
              style={{ border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: 13, width: 180 }}
            />
            <div className="mt-6 pb-16">
              <div className="flex items-center justify-between mb-2">
                <span className="mono-label">Фокус</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>
                  {diaryEntry(openDiaryDate).focus}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>0</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={diaryEntry(openDiaryDate).focus}
                  className="force-slider flex-1"
                  style={{ ['--slider-color' as string]: 'var(--accent)' }}
                  onChange={(e) => patchDiary(openDiaryDate, { focus: Number(e.target.value) })}
                />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>10</span>
              </div>
            </div>
          </div>
        </Immersion>
      )}

      {toast.node}
    </div>
  )
}

// карточка записи на вкладке «Списки»: плитка-иконка + заголовок + подпись + счётчик,
// ниже — превью до 5 пунктов (у чек-листа чекбоксы интерактивны)
function ListRecCard({
  rec,
  onOpen,
  onToggleItem,
}: {
  rec: ListRecord
  onOpen: () => void
  onToggleItem: (itemId: string) => void
}) {
  const Icon = rec.kind === 'checklist' ? ListChecks : ListOrdered
  const color = rec.kind === 'checklist' ? 'var(--ring-checklists)' : 'var(--ring-tasks)'
  return (
    <div className="rounded-2xl p-3.5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <button onClick={onOpen} className="w-full flex items-center gap-3 text-left">
        <Tile icon={Icon} color={color} size={44} />
        <span className="flex-1 min-w-0">
          <span className="block truncate" style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>
            {recTitle(rec)}
          </span>
          <span className="block mt-0.5" style={{ fontSize: 12, color: 'var(--muted)' }}>
            {rec.kind === 'checklist' ? 'чек-лист' : 'список'}
          </span>
        </span>
        <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
          {rec.kind === 'checklist'
            ? `${rec.items.filter((i) => i.done).length}/${rec.items.length}`
            : `${rec.items.length} пунктов`}
        </span>
      </button>
      {rec.items.length > 0 && (
        <div className="mt-2 pt-1" style={{ borderTop: '1px solid var(--line)' }}>
          {rec.items.slice(0, 5).map((it, idx) => (
            <div key={it.id} className="flex items-center gap-2.5 py-1.5">
              {rec.kind === 'checklist' ? (
                <button onClick={() => onToggleItem(it.id)} className="flex-none" title="Отметить">
                  <MCheck done={it.done} color={color} size={16} />
                </button>
              ) : (
                <span
                  className="flex-none w-4 text-right"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}
                >
                  {idx + 1}.
                </span>
              )}
              <span
                className="min-w-0 truncate"
                style={{
                  fontSize: 13,
                  color: rec.kind === 'checklist' && it.done ? 'var(--muted)' : 'var(--text-2)',
                  textDecoration: rec.kind === 'checklist' && it.done ? 'line-through' : 'none',
                  textDecorationColor: 'var(--line-strong)',
                }}
              >
                {it.text || '—'}
              </span>
            </div>
          ))}
          {rec.items.length > 5 && (
            <p className="pt-1" style={{ fontSize: 11, color: 'var(--muted)' }}>
              ещё {rec.items.length - 5}…
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <p className="py-10 text-center" style={{ fontSize: 13, color: 'var(--muted)' }}>
      {text}
    </p>
  )
}
