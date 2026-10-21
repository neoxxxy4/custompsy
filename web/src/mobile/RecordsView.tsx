import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Blocks,
  BookOpen,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder as FolderIcon,
  FolderPlus,
  HeartPulse,
  ListChecks,
  ListOrdered,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Share2,
  SmilePlus,
  Stethoscope,
  Star,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  allEmotionTags,
  cloneTemplateItems,
  cloneTemplateList,
  emotionName,
  moveItem,
  plutchikColor,
  recItemStats,
  seedDayBlocks,
  seedTodayData,
  toggleNestedListItem,
  uid,
  type BlockDef,
  type BlockItem,
  type BlockList,
  type BlockTemplate,
  type Diary,
  type EmotionRecordSource,
  type EmotionTag,
  type Folder,
  type ListRecord,
  type Note,
  type TodayData,
  FULL_ALLOW,
  SEED_BLOCK_FOLDERS,
  SEED_FOLDERS,
  SEED_NOTES,
  SEED_RECORD_FOLDERS,
  todayKey,
  useLS,
} from '../views/practice/store'
import { readLS, writeLS } from '../lib/sync'
import { WD } from '../lib/dayStats'
import EmotionTagSheet, { type SheetState } from './EmotionTagSheet'
import Immersion from './Immersion'
import ListRecordEditor from './ListRecordEditor'
import ActionSheet from './ActionSheet'
import { useDragList } from './useDragList'
import { MCheck, Tile, Toggle } from './ui'
import { fmtWhen, useToast } from './utils'

// верхние разделы «Записей»
type Section = 'records' | 'blocks' | 'psyche' | 'diary'
const SECTIONS: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: 'records', label: 'Записи', icon: FolderIcon },
  { id: 'blocks', label: 'Блоки', icon: Blocks },
  { id: 'psyche', label: 'Психика', icon: HeartPulse },
  { id: 'diary', label: 'Дневник', icon: BookOpen },
]

type PsycheTab = 'therapy' | 'emotion-diary'
const PSYCHE_TABS: { id: PsycheTab; label: string; icon: LucideIcon }[] = [
  { id: 'therapy', label: 'Терапия', icon: Stethoscope },
  { id: 'emotion-diary', label: 'Дн. эмоций', icon: HeartPulse },
]

const ROOT_FOLDER = 'inbox' // legacy folderId для записей в корне

const TILE_COLORS = ['var(--accent)', 'var(--f-metacog)', 'var(--f-neuro)', 'var(--f-emotions)', 'var(--f-environment)']

const WD_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MO_SHORT = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек']
const diaryLabel = (dk: string) => {
  const d = new Date(dk + 'T12:00:00')
  return `${d.getDate()} ${MO_SHORT[d.getMonth()]} · ${WD_SHORT[d.getDay()]}`
}

const recTitle = (r: ListRecord) => r.title || (r.kind === 'checklist' ? 'Чек-лист' : 'Список')
const recSub = (r: ListRecord) => {
  const { done, total } = recItemStats(r)
  return r.kind === 'checklist' ? `${done}/${total} пунктов` : `${total} пунктов`
}

// folderId записи с защитой: 'inbox', отсутствующая или удалённая папка → корень
const normFolderId = (fid: string | undefined, folders: Folder[]): string | null =>
  fid && fid !== ROOT_FOLDER && folders.some((f) => f.id === fid) ? fid : null

// раздел папки: свой scope или scope корня ветки; без него — записи
const scopeOf = (f: Folder, folders: Folder[]): 'records' | 'blocks' => {
  let cur: Folder | undefined = f
  while (cur) {
    if (cur.scope) return cur.scope
    cur = folders.find((x) => x.id === cur!.parentId)
  }
  return 'records'
}

export default function RecordsView({
  onHome,
}: {
  onHome: () => void
}) {
  const [section, setSection] = useState<string>('records')
  const [psycheTab, setPsycheTab] = useState<PsycheTab>('therapy')
  const [path, setPath] = useState<string[]>([]) // цепочка папок: id от корня до текущей
  const tk = todayKey()

  const [notes, setNotes] = useLS<Note[]>('aod4-notes', SEED_NOTES)
  const [folders, setFolders] = useLS<Folder[]>('aod4-folders', SEED_FOLDERS)
  const [listrecs, setListrecs] = useLS<ListRecord[]>('aod4-listrecs', [])
  const [diary, setDiary] = useLS<Diary>('aod4-diary', {})
  const [templates, setTemplates] = useLS<BlockTemplate[]>('aod4-block-templates', [])

  // стартовые подпапки разделов («Работа», «Утренний блок»…): докидываем недостающие по id
  useEffect(() => {
    setFolders((fs) => {
      const ids = new Set(fs.map((f) => f.id))
      const missing = [...SEED_RECORD_FOLDERS, ...SEED_BLOCK_FOLDERS].filter((f) => !ids.has(f.id))
      return missing.length ? [...missing, ...fs] : fs
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const fixNotes = notes.some((n) => typeof n.body !== 'string' || typeof n.title !== 'string')
    if (fixNotes) {
      setNotes(
        notes.map((n) => ({
          ...n,
          title: typeof n.title === 'string' ? n.title : '',
          body: typeof n.body === 'string' ? n.body : (n as unknown as { text?: string }).text || '',
        })),
      )
    }

    const fixRecs = listrecs.some(
      (r) => !Array.isArray(r.items) || r.items.some((it) => typeof it.text !== 'string' || typeof it.done !== 'boolean'),
    )
    if (fixRecs) {
      setListrecs(
        listrecs
          .filter((r) => r && typeof r.id === 'string')
          .map((r) => ({
            ...r,
            kind: r.kind === 'list' ? 'list' : 'checklist',
            title: typeof r.title === 'string' ? r.title : '',
            items: Array.isArray(r.items)
              ? r.items
                  .filter((it) => it && typeof it.id === 'string')
                  .map((it) => ({
                    id: it.id,
                    text: typeof it.text === 'string' ? it.text : '',
                    done: !!it.done,
                  }))
              : [],
            updated: typeof r.updated === 'number' ? r.updated : Date.now(),
          })),
      )
    }

    const fixDiary = Object.values(diary).some(
      (e) => typeof e.text !== 'string' || typeof e.focus !== 'number',
    )
    if (fixDiary) {
      const next: Diary = {}
      Object.entries(diary).forEach(([k, e]) => {
        if (!e || typeof k !== 'string') return
        next[k] = {
          text: typeof e.text === 'string' ? e.text : '',
          emotion: typeof e.emotion === 'string' ? e.emotion : '',
          focus: typeof e.focus === 'number' ? e.focus : 5,
          updated: typeof e.updated === 'number' ? e.updated : Date.now(),
          emotions: Array.isArray(e.emotions) ? e.emotions : undefined,
          therapy: !!e.therapy,
        }
      })
      setDiary(next)
    }
  }, [notes, listrecs, diary, setNotes, setListrecs, setDiary])

  const [openNoteId, setOpenNoteId] = useState<string | null>(null)
  const [openDiaryDate, setOpenDiaryDate] = useState<string | null>(null)
  const [openRecId, setOpenRecId] = useState<string | null>(null)
  const [openTplId, setOpenTplId] = useState<string | null>(null)
  const [fabMenu, setFabMenu] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [addRowOpen, setAddRowOpen] = useState<'base' | 'sub' | null>(null) // у какой строки папок раскрыто добавление
  const [sectionAddOpen, setSectionAddOpen] = useState(false)
  const [sectionMenu, setSectionMenu] = useState<string | null>(null)
  const [folderMenu, setFolderMenu] = useState<string | null>(null)
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)
  const [tplMenu, setTplMenu] = useState<string | null>(null)
  const [emotionSheet, setEmotionSheet] = useState<SheetState>({ open: false, mode: 'create' })
  const toast = useToast()

  const allEmotionTagsList = useMemo(() => allEmotionTags(notes, listrecs, diary), [notes, listrecs, diary])

  const touchX = useRef<number | null>(null)

  const currentFolder = path.length > 0 ? path[path.length - 1] : null
  const folderName = (fid: string | undefined) =>
    fid ? folders.find((f) => f.id === fid)?.name ?? 'Входящие' : 'Входящие'

  // раздел: стандартный (Записи/Блоки/Психика/Дневник) или пользовательская папка-раздел
  const customSection = folders.find((f) => f.id === section && f.section) ?? null
  const isStandardSection = (SECTIONS as { id: string }[]).some((s) => s.id === section)
  const viewKind: Section = isStandardSection ? (section as Section) : 'records'
  const scope: 'records' | 'blocks' = viewKind === 'blocks' ? 'blocks' : 'records'
  const baseLen = customSection ? 1 : 0
  const baseParent = customSection ? customSection.id : null
  // вторая строка папок: корневые папки раздела (папки-разделы среди них не показываем)
  const baseFolders = folders.filter(
    (f) => normFolderId(f.parentId, folders) === baseParent && scopeOf(f, folders) === scope && !f.section,
  )
  const customSections = folders.filter((f) => f.section)

  const switchSection = (id: string) => {
    setSection(id)
    const f = folders.find((x) => x.id === id && x.section)
    setPath(f ? [f.id] : [])
    setAddRowOpen(null)
    // редактор открыт инлайн — при смене раздела закрываем его
    closeEditors()
  }

  // страховка: папку-раздел удалили, пока он был активен
  useEffect(() => {
    if (!isStandardSection && !customSection) switchSection('records')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStandardSection, customSection])

  // новый пользовательский раздел — папка-раздел, всегда в первой строке
  const addSection = () => {
    const f: Folder = { id: uid(), name: 'Новый раздел', scope: 'records', section: true }
    setFolders((fs) => [...fs, f])
    setSection(f.id)
    setPath([f.id])
    setRenamingFolder(f.id)
    setSectionAddOpen(false)
  }

  // ─── папки ───
  const subfoldersOf = (pid: string | null, scope: 'records' | 'blocks') =>
    folders.filter((f) => normFolderId(f.parentId, folders) === pid && scopeOf(f, folders) === scope)

  const addFolder = (parentId: string | null, scope: 'records' | 'blocks') => {
    const parent = parentId ? folders.find((f) => f.id === parentId) : undefined
    const f: Folder = {
      id: uid(),
      name: 'Новая папка',
      ...(parentId ? { parentId } : {}),
      scope: parent ? scopeOf(parent, folders) : scope,
    }
    setFolders((fs) => [...fs, f])
    setRenamingFolder(f.id)
  }

  const renameFolder = (fid: string, name: string) => {
    if (!name.trim()) return
    setFolders((fs) => fs.map((f) => (f.id === fid ? { ...f, name: name.trim() } : f)))
  }

  // подпапка из меню папки: создаём и заходим внутрь родителя, чтобы сразу её видеть
  const onAddSubfolder = (fid: string) => {
    const parent = folders.find((f) => f.id === fid)
    if (!parent) return
    addFolder(fid, scopeOf(parent, folders))
    if (!settingsOpen) setPath((p) => (p.includes(fid) ? p : [...p, fid]))
  }

  const deleteFolder = (fid: string) => {
    const doomed = new Set<string>([fid])
    let grew = true
    while (grew) {
      grew = false
      folders.forEach((f) => {
        if (f.parentId && doomed.has(f.parentId) && !doomed.has(f.id)) {
          doomed.add(f.id)
          grew = true
        }
      })
    }
    setFolders((fs) => fs.filter((f) => !doomed.has(f.id)))
    setNotes((ns) => ns.map((n) => (n.folderId && doomed.has(n.folderId) ? { ...n, folderId: ROOT_FOLDER } : n)))
    setListrecs((rs) => rs.map((r) => (r.folderId && doomed.has(r.folderId) ? { ...r, folderId: ROOT_FOLDER } : r)))
    setTemplates((ts) => ts.map((t) => (t.folderId && doomed.has(t.folderId) ? { ...t, folderId: undefined } : t)))
    setPath((p) => p.filter((id) => !doomed.has(id)))
  }

  // ─── записи ───
  const sortedNotes = useMemo(() => [...notes].sort((a, b) => b.updated - a.updated), [notes])
  const sortedRecs = useMemo(() => [...listrecs].sort((a, b) => b.updated - a.updated), [listrecs])
  const notesHere = useMemo(
    () => sortedNotes.filter((n) => normFolderId(n.folderId, folders) === currentFolder),
    [sortedNotes, folders, currentFolder],
  )
  const recsHere = useMemo(
    () => sortedRecs.filter((r) => normFolderId(r.folderId, folders) === currentFolder),
    [sortedRecs, folders, currentFolder],
  )
  const subfolders = useMemo(
    () => (viewKind === 'records' || viewKind === 'blocks' ? subfoldersOf(currentFolder, scope) : []),
    [folders, currentFolder, viewKind, scope], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // ─── 3 статичные категории внутри папки: Все / Не сортировано / Папки ───
  type FolderTab = 'all' | 'unsorted' | 'folders'
  const [folderTab, setFolderTab] = useState<FolderTab>('all')
  const drilled = path.length > baseLen
  // при погружении/выходе всегда начинаем с «Все»
  useEffect(() => setFolderTab('all'), [currentFolder])

  // текущая папка + все потомки — для категории «Все»
  const descendantIds = useMemo(() => {
    const set = new Set<string>()
    if (currentFolder) set.add(currentFolder)
    let grew = true
    while (grew) {
      grew = false
      folders.forEach((f) => {
        if (f.parentId && set.has(f.parentId) && !set.has(f.id)) {
          set.add(f.id)
          grew = true
        }
      })
    }
    return set
  }, [folders, currentFolder])

  const notesAll = useMemo(
    () => sortedNotes.filter((n) => descendantIds.has(normFolderId(n.folderId, folders) ?? '')),
    [sortedNotes, folders, descendantIds],
  )
  const recsAll = useMemo(
    () => sortedRecs.filter((r) => descendantIds.has(normFolderId(r.folderId, folders) ?? '')),
    [sortedRecs, folders, descendantIds],
  )

  // редактор открыт инлайн: верх (разделы, папки, настройки) остаётся виден
  const editorOpen = !!(openNoteId || openRecId || openTplId || openDiaryDate)
  const closeEditors = () => {
    setOpenNoteId(null)
    setOpenRecId(null)
    setOpenTplId(null)
    setOpenDiaryDate(null)
  }

  const diaryDays = useMemo(
    () =>
      Object.keys(diary)
        .filter((k) => diary[k]?.text || diary[k]?.emotion)
        .sort()
        .reverse(),
    [diary]
  )

  const therapyNotes = useMemo(() => sortedNotes.filter((n) => n.therapy), [sortedNotes])
  const therapyDiaryDays = useMemo(() => diaryDays.filter((dk) => diary[dk].therapy), [diaryDays, diary])
  const emotionDiaryDays = useMemo(() => diaryDays.filter((dk) => (diary[dk].emotions?.length ?? 0) > 0), [diaryDays, diary])

  const sortedTemplates = useMemo(() => [...templates].sort((a, b) => b.updated - a.updated), [templates])
  const templatesHere = useMemo(
    () => sortedTemplates.filter((t) => normFolderId(t.folderId, folders) === currentFolder),
    [sortedTemplates, folders, currentFolder],
  )
  const templatesAll = useMemo(
    () => sortedTemplates.filter((t) => descendantIds.has(normFolderId(t.folderId, folders) ?? '')),
    [sortedTemplates, folders, descendantIds],
  )

  // ─── свайп разделов ───
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 60) return
    if (editorOpen) return // в открытом редакторе свайп разделы не листает
    const order = [...SECTIONS.map((t) => t.id as string), ...customSections.map((f) => f.id)]
    const idx = order.indexOf(section)
    const next = dx < 0 ? idx + 1 : idx - 1
    if (next >= 0 && next < order.length) switchSection(order[next])
  }

  // ─── действия ───
  const createNote = (therapy = false) => {
    const n: Note = {
      id: uid(),
      folderId: currentFolder ?? ROOT_FOLDER,
      title: '',
      body: '',
      updated: Date.now(),
      ...(therapy ? { therapy: true } : {}),
    }
    setNotes((ns) => [n, ...ns])
    setOpenNoteId(n.id)
  }

  const createRec = (kind: ListRecord['kind']) => {
    const r: ListRecord = { id: uid(), kind, title: '', items: [], folderId: currentFolder ?? ROOT_FOLDER, updated: Date.now() }
    setListrecs((rs) => [r, ...rs])
    setOpenRecId(r.id)
  }

  const createTemplate = () => {
    const t: BlockTemplate = {
      id: uid(),
      title: '',
      withTime: false,
      inDashboard: true,
      allow: { ...FULL_ALLOW },
      items: [],
      lists: [],
      ...(currentFolder ? { folderId: currentFolder } : {}),
      updated: Date.now(),
    }
    setTemplates((ts) => [t, ...ts])
    setOpenTplId(t.id)
  }

  const patchRec = (id: string, patch: Partial<ListRecord>) =>
    setListrecs((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch, updated: Date.now() } : r)))

  const patchNote = (id: string, patch: Partial<Note>) =>
    setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch, updated: Date.now() } : n)))

  const patchTpl = (id: string, patch: Partial<BlockTemplate>) =>
    setTemplates((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch, updated: Date.now() } : t)))

  const openNote = notes.find((n) => n.id === openNoteId) ?? null
  const openRec = listrecs.find((r) => r.id === openRecId) ?? null
  const openTpl = templates.find((t) => t.id === openTplId) ?? null
  const diaryEntry = (dk: string) => diary[dk] || { text: '', emotion: '', focus: 5, updated: 0 }
  const patchDiary = (dk: string, p: Partial<Diary[string]>) =>
    setDiary((d) => ({ ...d, [dk]: { ...diaryEntry(dk), ...p, updated: Date.now() } }))

  // шаблон → блок сегодняшнего дня (пункты клонируются, галочки сброшены);
  // templateId связывает блок с шаблоном — в меню блока дня есть «Обновить шаблон»
  const addTemplateToDay = (tpl: BlockTemplate) => {
    const now = new Date()
    const wdName = WD[now.getDay()]
    const defsKey = `aod4-today-blocks-${tk}`
    const dataKey = `aod4-today-data-${tk}`
    const defs = readLS<BlockDef[]>(defsKey, seedDayBlocks())
    const data = readLS<TodayData>(dataKey, seedTodayData(tk, wdName, false))
    const def: BlockDef = {
      id: uid(),
      title: tpl.title,
      withTime: tpl.withTime,
      inDashboard: tpl.inDashboard,
      allow: { ...(tpl.allow ?? FULL_ALLOW) },
      templateId: tpl.id,
    }
    writeLS(defsKey, [...defs, def])
    writeLS(dataKey, {
      ...data,
      [def.id]: {
        items: cloneTemplateItems(tpl.items, tpl.withTime),
        lists: tpl.lists.map((l) => cloneTemplateList(l, tpl.withTime)),
      },
    })
    // перезагружаем открытые экраны из localStorage, чтобы «Сегодня» увидел блок сразу
    window.dispatchEvent(new Event('aod:sync-hydrated'))
    toast.show(`Блок «${tpl.title || 'Без названия'}» добавлен в сегодня`)
  }

  const openEmotionSheet = (sourceType: EmotionRecordSource, sourceId: string, tag?: EmotionTag) => {
    setEmotionSheet({
      open: true,
      mode: tag ? 'edit' : 'create',
      initial: tag ? { ...tag } : { emotion: 'joy', level: 1, feelings: [], sensations: [] },
      sourceType,
      sourceId,
      tagId: tag?.id,
    })
  }

  const saveEmotionTag = (
    tag: EmotionTag,
    sourceType: EmotionRecordSource | undefined,
    sourceId: string | undefined,
  ) => {
    const targetType = sourceType ?? 'diary'
    const targetId = sourceId ?? todayKey()
    const attach = (existing: EmotionTag[] = []): EmotionTag[] => {
      if (emotionSheet.mode === 'edit' && emotionSheet.tagId) {
        return existing.map((t) => (t.id === emotionSheet.tagId ? tag : t))
      }
      return [tag, ...existing]
    }

    if (targetType === 'note') {
      setNotes((ns) =>
        ns.map((n) =>
          n.id === targetId ? { ...n, emotions: attach(n.emotions), updated: Date.now() } : n,
        ),
      )
    } else if (targetType === 'listrec') {
      setListrecs((rs) =>
        rs.map((r) =>
          r.id === targetId ? { ...r, emotions: attach(r.emotions), updated: Date.now() } : r,
        ),
      )
    } else {
      setDiary((d) => {
        const entry = d[targetId] || { text: '', emotion: '', focus: 5, updated: 0 }
        return {
          ...d,
          [targetId]: { ...entry, emotions: attach(entry.emotions), updated: Date.now() },
        }
      })
    }
  }

  const deleteEmotionTag = (sourceType: EmotionRecordSource, sourceId: string, tagId: string) => {
    if (sourceType === 'note') {
      setNotes((ns) =>
        ns.map((n) =>
          n.id === sourceId
            ? { ...n, emotions: (n.emotions ?? []).filter((t) => t.id !== tagId), updated: Date.now() }
            : n,
        ),
      )
    } else if (sourceType === 'listrec') {
      setListrecs((rs) =>
        rs.map((r) =>
          r.id === sourceId
            ? { ...r, emotions: (r.emotions ?? []).filter((t) => t.id !== tagId), updated: Date.now() }
            : r,
        ),
      )
    } else {
      setDiary((d) => {
        const entry = d[sourceId]
        if (!entry) return d
        return {
          ...d,
          [sourceId]: {
            ...entry,
            emotions: (entry.emotions ?? []).filter((t) => t.id !== tagId),
            updated: Date.now(),
          },
        }
      })
    }
  }

  const onFab = () => {
    if (viewKind === 'records') setFabMenu((o) => !o)
    else if (viewKind === 'blocks') createTemplate()
    else if (viewKind === 'psyche') {
      if (psycheTab === 'therapy') createNote(true)
      else setOpenDiaryDate(tk)
    } else setOpenDiaryDate(tk)
  }

  const renderNoteRow = (n: Note, i: number) => (
    <NoteRow
      key={n.id}
      n={n}
      folderName={folderName(n.folderId)}
      tileColor={TILE_COLORS[i % TILE_COLORS.length]}
      onOpen={() => setOpenNoteId(n.id)}
      onTogglePin={(e) => {
        e.stopPropagation()
        patchNote(n.id, { pinned: !n.pinned })
      }}
      onEditEmotion={(tag) => openEmotionSheet('note', n.id, tag)}
      onAddEmotion={() => openEmotionSheet('note', n.id)}
    />
  )

  const renderDiaryRow = (dk: string) => (
    <DiaryRow
      key={dk}
      dk={dk}
      diary={diary}
      onOpen={() => setOpenDiaryDate(dk)}
      onEditEmotion={(tag) => openEmotionSheet('diary', dk, tag)}
      onAddEmotion={() => openEmotionSheet('diary', dk)}
    />
  )

  const renderRecCard = (r: ListRecord) => (
    <ListRecCard
      key={r.id}
      rec={r}
      onOpen={() => setOpenRecId(r.id)}
      onToggleItem={(itemId) =>
        patchRec(r.id, {
          items: r.items.map((x) => (x.id === itemId ? { ...x, done: !x.done } : x)),
        })
      }
      onToggleListItem={(listId, itemId) =>
        patchRec(r.id, { lists: toggleNestedListItem(r.lists ?? [], listId, itemId) })
      }
      onEditEmotion={(tag) => openEmotionSheet('listrec', r.id, tag)}
      onAddEmotion={() => openEmotionSheet('listrec', r.id)}
    />
  )

  // карточка шаблона блока: тап — редактор, «В день» — добавить в сегодня, ⋯ — меню
  const renderTplCard = (t: BlockTemplate) => {
    const itemsCount = t.items.length + t.lists.reduce((acc, l) => acc + l.items.length, 0)
    return (
      <div
        key={t.id}
        className="rounded-2xl p-3.5"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => setOpenTplId(t.id)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
            <Tile icon={Blocks} color="var(--accent)" size={40} />
            <span className="flex-1 min-w-0">
              <span className="block truncate" style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--light)' }}>
                {t.title || 'Без названия'}
              </span>
              <span className="block truncate mt-0.5" style={{ fontSize: 12, color: 'var(--muted)' }}>
                {[
                  itemsCount > 0 ? `${itemsCount} пунктов` : 'пусто',
                  t.lists.length > 0 ? `${t.lists.length} списков` : '',
                  t.withTime ? 'со временем' : '',
                  t.inDashboard ? 'в дашборд' : '',
                  folderTab === 'all' && drilled ? folderName(t.folderId) : '',
                ].filter(Boolean).join(' · ')}
              </span>
            </span>
          </button>
          <button
            onClick={() => addTemplateToDay(t)}
            className="flex-none flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
            style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 12, fontWeight: 600 }}
            title="Добавить в сегодня"
          >
            <CalendarPlus size={14} strokeWidth={2} />
            В день
          </button>
          <button onClick={() => setTplMenu(t.id)} className="flex-none p-1" style={{ color: 'var(--muted)' }}>
            <MoreHorizontal size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    )
  }


  // вторая строка: корневые папки раздела (всегда видна, даже в редакторе);
  // тап — внутрь (повторный тап по активной — обратно на корень), long-press — настройка папки;
  // «+» в конце раскрывает «добавить папку»
  const renderBaseRow = () => {
    const open = addRowOpen === 'base'
    return (
      <div className="no-scrollbar -mx-4 px-4 mb-3 flex items-center gap-1.5 overflow-x-auto">
        {baseFolders.map((f) =>
          renamingFolder === f.id ? (
            <input
              key={f.id}
              autoFocus
              defaultValue={f.name}
              onBlur={(e) => { renameFolder(f.id, e.target.value); setRenamingFolder(null) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  renameFolder(f.id, (e.target as HTMLInputElement).value)
                  setRenamingFolder(null)
                }
              }}
              className="flex-none rounded-full px-3 py-1.5 outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--accent)', fontSize: 12.5, fontWeight: 600, color: 'var(--light)', width: 120 }}
            />
          ) : (
            <FolderChip
              key={f.id}
              label={f.name}
              active={path[baseLen] === f.id && path.length > baseLen}
              onClick={() => {
                if (path[baseLen] === f.id) setPath(path.slice(0, baseLen))
                else setPath([...path.slice(0, baseLen), f.id])
              }}
              onLongPress={() => setFolderMenu(f.id)}
            />
          ),
        )}
        <button
          onClick={() => setAddRowOpen(open ? null : 'base')}
          className="flex-none grid place-items-center rounded-full"
          style={{ width: 30, height: 30, background: 'var(--surface)', border: '1px solid var(--line)' }}
          title={open ? 'Скрыть добавление' : 'Добавить папку'}
        >
          <Plus size={15} strokeWidth={2} style={{ color: open ? 'var(--accent)' : 'var(--muted)' }} />
        </button>
        {open && (
          <button
            onClick={() => { addFolder(baseParent, scope); setAddRowOpen(null) }}
            className="flex-none flex items-center gap-1.5 rounded-full px-3 py-1.5 fadein"
            style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 12.5, fontWeight: 600 }}
          >
            <FolderPlus size={13} strokeWidth={2} /> добавить папку
          </button>
        )}
      </div>
    )
  }

  // третья линия при погружении: назад + цепочка от первой папки до текущей
  const renderChainRow = () => (
    <div className="no-scrollbar -mx-4 px-4 mb-3 flex items-center gap-1.5 overflow-x-auto">
      <button
        onClick={() => setPath(path.slice(0, -1))}
        className="flex-none grid place-items-center rounded-full"
        style={{ width: 30, height: 30, background: 'var(--surface-2)', border: '1px solid var(--line)' }}
        title="Назад"
      >
        <ChevronLeft size={15} strokeWidth={2} style={{ color: 'var(--muted)' }} />
      </button>
      {path.slice(baseLen).map((fid, i, arr) => (
        <FolderChip
          key={`c-${fid}`}
          label={folderName(fid)}
          active={i === arr.length - 1}
          onClick={() => setPath(path.slice(0, baseLen + 1 + i))}
          onLongPress={() => setFolderMenu(fid)}
        />
      ))}
    </div>
  )

  // 3 статичные категории внутри папки: Все / Не сортировано / Папки
  const FOLDER_TABS: { id: 'all' | 'unsorted' | 'folders'; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'unsorted', label: 'Не сортировано' },
    { id: 'folders', label: 'Папки' },
  ]
  const renderFolderTabs = () => (
    <div className="flex gap-2 mb-3">
      {FOLDER_TABS.map((t) => {
        const active = folderTab === t.id
        return (
          <button
            key={t.id}
            onClick={() => setFolderTab(t.id)}
            className="flex-none flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-colors"
            style={{
              background: active ? 'var(--surface-2)' : 'transparent',
              border: `1px solid ${active ? 'var(--line-strong)' : 'var(--line)'}`,
              color: active ? 'var(--light)' : 'var(--muted)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )

  // категория «Папки»: подпапки текущей — вертикальным столбиком, тап проваливает внутрь
  const renderFolderColumn = () => (
    <div className="space-y-2">
      {subfolders.length === 0 && <Empty text="Нет подпапок — добавь первую ниже" />}
      {subfolders.map((f) => (
        <FolderColRow
          key={f.id}
          folder={f}
          count={
            viewKind === 'blocks'
              ? templates.filter((t) => normFolderId(t.folderId, folders) === f.id).length
              : notes.filter((n) => normFolderId(n.folderId, folders) === f.id).length +
                listrecs.filter((r) => normFolderId(r.folderId, folders) === f.id).length
          }
          renaming={renamingFolder === f.id}
          onRename={(name) => { renameFolder(f.id, name); setRenamingFolder(null) }}
          onClick={() => setPath([...path, f.id])}
          onLongPress={() => setFolderMenu(f.id)}
        />
      ))}
      <button
        onClick={() => addFolder(currentFolder, scope)}
        className="mt-1 flex w-full items-center gap-2 rounded-xl border border-dashed px-3 py-2"
        style={{ borderColor: 'var(--line-strong)', color: 'var(--muted)', fontSize: 13 }}
      >
        <FolderPlus size={14} strokeWidth={1.8} /> добавить папку
      </button>
    </div>
  )

  return (
    <div className="px-4 pt-3 pb-36 min-h-screen">
      {/* первая строка: стандартные разделы (неудаляемые) + пользовательские папки-разделы
          + «+» добавления раздела; справа — поиск и настройки папок */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto mb-3">
        {SECTIONS.map((t) => {
          const active = section === t.id
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => switchSection(t.id)}
              className="flex-none flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-colors"
              style={{
                background: active ? 'var(--accent)' : 'transparent',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--line-strong)'}`,
                color: active ? '#fff' : 'var(--muted)',
              }}
            >
              <Icon size={13} strokeWidth={1.8} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t.label}
              </span>
            </button>
          )
        })}
        {customSections.map((f) =>
          renamingFolder === f.id ? (
            <input
              key={f.id}
              autoFocus
              defaultValue={f.name}
              onBlur={(e) => { renameFolder(f.id, e.target.value); setRenamingFolder(null) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  renameFolder(f.id, (e.target as HTMLInputElement).value)
                  setRenamingFolder(null)
                }
              }}
              className="flex-none rounded-full px-3 py-1.5 outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--accent)', fontSize: 12, fontWeight: 600, color: 'var(--light)', width: 120 }}
            />
          ) : (
            <FolderChip
              key={f.id}
              label={f.name}
              pill
              active={section === f.id}
              onClick={() => switchSection(f.id)}
              onLongPress={() => setSectionMenu(f.id)}
            />
          ),
        )}
        <button
          onClick={() => setSectionAddOpen((v) => !v)}
          className="flex-none grid place-items-center rounded-full"
          style={{ width: 30, height: 30, background: 'var(--surface)', border: '1px solid var(--line)' }}
          title={sectionAddOpen ? 'Скрыть добавление' : 'Добавить раздел'}
        >
          <Plus size={15} strokeWidth={2} style={{ color: sectionAddOpen ? 'var(--accent)' : 'var(--muted)' }} />
        </button>
        {sectionAddOpen && (
          <button
            onClick={addSection}
            className="flex-none flex items-center gap-1.5 rounded-full px-3 py-1.5 fadein"
            style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 12, fontWeight: 600 }}
          >
            <FolderPlus size={13} strokeWidth={2} /> добавить раздел
          </button>
        )}
        <span className="flex-1" />
        <button onClick={() => toast.show('Поиск — скоро')} title="Поиск" className="flex-none p-1">
          <Search size={18} strokeWidth={1.7} style={{ color: 'var(--muted)' }} />
        </button>
        <button onClick={() => setSettingsOpen(true)} title="Настройка папок" className="flex-none p-1">
          <Settings2 size={18} strokeWidth={1.7} style={{ color: 'var(--muted)' }} />
        </button>
      </div>

      <div key={section} className="fadein" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* ─── Записи: строки папок + содержимое текущей папки ─── */}
        {viewKind === 'records' && (
          <>
            {renderBaseRow()}
            {drilled && renderChainRow()}
            {drilled && !editorOpen && renderFolderTabs()}

            {!editorOpen && (
              <div className="space-y-2.5">
                {!drilled && (
                  <>
                    {baseFolders.length === 0 && notesHere.length === 0 && recsHere.length === 0 && (
                      <Empty text="Пока пусто — создай запись или папку через +" />
                    )}
                    {notesHere.map(renderNoteRow)}
                    {recsHere.map(renderRecCard)}
                  </>
                )}
                {drilled && folderTab === 'all' && (
                  <>
                    {notesAll.length === 0 && recsAll.length === 0 && subfolders.length === 0 && (
                      <Empty text="В папке и подпапках пусто — добавь через +" />
                    )}
                    {notesAll.map(renderNoteRow)}
                    {recsAll.map(renderRecCard)}
                  </>
                )}
                {drilled && folderTab === 'unsorted' && (
                  <>
                    {notesHere.length === 0 && recsHere.length === 0 && (
                      <Empty text="Прямо в этой папке пусто" />
                    )}
                    {notesHere.map(renderNoteRow)}
                    {recsHere.map(renderRecCard)}
                  </>
                )}
                {drilled && folderTab === 'folders' && renderFolderColumn()}
              </div>
            )}
          </>
        )}

        {/* ─── Блоки: папки с шаблонами для добавления в день ─── */}
        {viewKind === 'blocks' && (
          <>
            {renderBaseRow()}
            {drilled && renderChainRow()}
            {drilled && !editorOpen && renderFolderTabs()}

            {!editorOpen && (
              <div className="space-y-2.5">
                {!drilled && (
                  <>
                    {baseFolders.length === 0 && templatesHere.length === 0 && (
                      <Empty text="Нет шаблонов — создай первый через +" />
                    )}
                    {templatesHere.map(renderTplCard)}
                  </>
                )}
                {drilled && folderTab === 'all' && (
                  <>
                    {templatesAll.length === 0 && subfolders.length === 0 && (
                      <Empty text="В папке и подпапках пусто — создай шаблон через +" />
                    )}
                    {templatesAll.map(renderTplCard)}
                  </>
                )}
                {drilled && folderTab === 'unsorted' && (
                  <>
                    {templatesHere.length === 0 && <Empty text="Прямо в этой папке пусто" />}
                    {templatesHere.map(renderTplCard)}
                  </>
                )}
                {drilled && folderTab === 'folders' && renderFolderColumn()}
              </div>
            )}
          </>
        )}

        {/* ─── Психика: терапия + дневник эмоций ─── */}
        {viewKind === 'psyche' && !editorOpen && (
          <>
            <div className="flex gap-2 mb-4">
              {PSYCHE_TABS.map((t) => {
                const active = psycheTab === t.id
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => setPsycheTab(t.id)}
                    className="flex-none flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-colors"
                    style={{
                      background: active ? 'var(--surface-2)' : 'transparent',
                      border: `1px solid ${active ? 'var(--line-strong)' : 'var(--line)'}`,
                      color: active ? 'var(--light)' : 'var(--muted)',
                    }}
                  >
                    <Icon size={13} strokeWidth={1.8} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{t.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="space-y-2.5">
              {psycheTab === 'therapy' && (
                <>
                  {therapyNotes.length === 0 && therapyDiaryDays.length === 0 && (
                    <Empty text="Нет терапевтических записей — отметь заметку или дневник терапией" />
                  )}
                  {therapyNotes.map(renderNoteRow)}
                  {therapyDiaryDays.map(renderDiaryRow)}
                </>
              )}
              {psycheTab === 'emotion-diary' && (
                <>
                  {emotionDiaryDays.length === 0 && <Empty text="Нет записей с эмоциональными тегами" />}
                  {emotionDiaryDays.map(renderDiaryRow)}
                </>
              )}
            </div>
          </>
        )}

        {/* ─── Дневник ─── */}
        {viewKind === 'diary' && !editorOpen && (
          <div className="space-y-2.5">
            {diaryDays.length === 0 && <Empty text="Нет записей — напиши первую через +" />}
            {diaryDays.map(renderDiaryRow)}
          </div>
        )}

        {/* ─── редакторы инлайн: верх (разделы, папки, настройки) остаётся виден ─── */}
        {editorOpen && (
          <div className="fadein">
            {openNote && (
              <Immersion
                inline
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
                  <button
                    onClick={() => patchNote(openNote.id, { therapy: !openNote.therapy })}
                    className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{
                      background: openNote.therapy ? 'var(--accent)' : 'var(--surface-2)',
                      color: openNote.therapy ? 'var(--on-fill)' : 'var(--muted)',
                      border: '1px solid var(--line)',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <Stethoscope size={13} strokeWidth={1.8} /> {openNote.therapy ? 'Терапия' : 'Отметить как терапию'}
                  </button>
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <EmotionChips tags={openNote.emotions} onClick={(tag) => openEmotionSheet('note', openNote.id, tag)} />
                    <button
                      onClick={() => openEmotionSheet('note', openNote.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-full"
                      style={{ background: 'var(--surface-2)', border: '1px dashed var(--line-strong)', fontSize: 11, color: 'var(--muted)' }}
                    >
                      <SmilePlus size={12} strokeWidth={1.8} /> эмоция
                    </button>
                  </div>
                </div>
              </Immersion>
            )}

            {openRec && (
              <ListRecordEditor
                inline
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

            {openTpl && (
              <TemplateEditor
                inline
                tpl={openTpl}
                onBack={() => setOpenTplId(null)}
                onHome={onHome}
                onPatch={(patch) => patchTpl(openTpl.id, patch)}
                onAddToDay={() => addTemplateToDay(openTpl)}
                onDelete={() => {
                  setTemplates((ts) => ts.filter((t) => t.id !== openTpl.id))
                  setOpenTplId(null)
                }}
              />
            )}

            {openDiaryDate && (
              <Immersion
                inline
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
                  <button
                    onClick={() => patchDiary(openDiaryDate, { therapy: !diaryEntry(openDiaryDate).therapy })}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{
                      background: diaryEntry(openDiaryDate).therapy ? 'var(--accent)' : 'var(--surface-2)',
                      color: diaryEntry(openDiaryDate).therapy ? 'var(--on-fill)' : 'var(--muted)',
                      border: '1px solid var(--line)',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <Stethoscope size={13} strokeWidth={1.8} /> {diaryEntry(openDiaryDate).therapy ? 'Терапия' : 'Отметить как терапию'}
                  </button>
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <EmotionChips
                      tags={diaryEntry(openDiaryDate).emotions}
                      onClick={(tag) => openEmotionSheet('diary', openDiaryDate, tag)}
                    />
                    <button
                      onClick={() => openEmotionSheet('diary', openDiaryDate)}
                      className="flex items-center gap-1 px-2 py-1 rounded-full"
                      style={{ background: 'var(--surface-2)', border: '1px dashed var(--line-strong)', fontSize: 11, color: 'var(--muted)' }}
                    >
                      <SmilePlus size={12} strokeWidth={1.8} /> эмоция
                    </button>
                  </div>
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
          </div>
        )}
      </div>

      {/* FAB — скрыт, пока открыт инлайн-редактор */}
      {!editorOpen && (
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
      )}

      {/* меню FAB на «Записях» */}
      {fabMenu && !editorOpen && (
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
              ['Заметка', FileText, () => createNote()],
              ['Чек-лист', ListChecks, () => createRec('checklist')],
              ['Список', ListOrdered, () => createRec('list')],
              ['Папка', FolderPlus, () => addFolder(currentFolder, 'records')],
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

      {/* настройка папок */}
      {settingsOpen && (
        <FolderSettings
          folders={folders}
          setFolders={setFolders}
          renaming={renamingFolder}
          setRenaming={setRenamingFolder}
          setFolderMenu={setFolderMenu}
          onAddFolder={addFolder}
          onRename={renameFolder}
          onClose={() => { setSettingsOpen(false); setRenamingFolder(null) }}
        />
      )}

      {/* меню папки: long-press по чипсу или три точки в дереве настроек */}
      {folderMenu && (
        <ActionSheet
          title={folders.find((f) => f.id === folderMenu)?.name || 'Папка'}
          onClose={() => setFolderMenu(null)}
          onRename={() => setRenamingFolder(folderMenu)}
          extras={[
            { icon: FolderPlus, label: 'Добавить подпапку', onClick: () => onAddSubfolder(folderMenu) },
          ]}
          onDelete={() => deleteFolder(folderMenu)}
        />
      )}

      {/* меню пользовательского раздела (long-press по пилюле в первой строке) */}
      {sectionMenu && (
        <ActionSheet
          title={folders.find((f) => f.id === sectionMenu)?.name || 'Раздел'}
          onClose={() => setSectionMenu(null)}
          onRename={() => setRenamingFolder(sectionMenu)}
          onDelete={() => {
            deleteFolder(sectionMenu)
            if (section === sectionMenu) switchSection('records')
          }}
        />
      )}
      {/* шаблон: меню */}
      {tplMenu && (
        <ActionSheet
          title={templates.find((t) => t.id === tplMenu)?.title || 'Шаблон'}
          onClose={() => setTplMenu(null)}
          onRename={() => { setOpenTplId(tplMenu) }}
          renameLabel="Редактировать"
          onDelete={() => {
            setTemplates((ts) => ts.filter((t) => t.id !== tplMenu))
            if (openTplId === tplMenu) setOpenTplId(null)
          }}
        />
      )}

      {/* шторка эмоций */}
      {emotionSheet.open && (
        <EmotionTagSheet
          key={`${emotionSheet.mode}-${emotionSheet.tagId ?? 'new'}`}
          state={emotionSheet}
          notes={notes}
          listrecs={listrecs}
          diary={diary}
          allTags={allEmotionTagsList}
          onClose={() => setEmotionSheet({ open: false, mode: 'create' })}
          onSave={saveEmotionTag}
          onDelete={
            emotionSheet.mode === 'edit' && emotionSheet.sourceType && emotionSheet.sourceId && emotionSheet.tagId
              ? () => deleteEmotionTag(emotionSheet.sourceType!, emotionSheet.sourceId!, emotionSheet.tagId!)
              : undefined
          }
        />
      )}

      {toast.node}
    </div>
  )
}

// чипс папки в горизонтальной строке: тап — зайти, long-press (~450ms) — настройка;
// pill — стиль пилюли раздела (первая строка), active — текущий уровень/раздел
function FolderChip({
  label,
  active,
  pill,
  onClick,
  onLongPress,
}: {
  label: string
  active?: boolean
  pill?: boolean
  onClick: () => void
  onLongPress: () => void
}) {
  const timer = useRef<number | undefined>(undefined)
  const fired = useRef(false)
  const start = () => {
    fired.current = false
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      fired.current = true
      onLongPress()
    }, 450)
  }
  const cancel = () => window.clearTimeout(timer.current)
  return (
    <button
      onTouchStart={start}
      onTouchEnd={cancel}
      onTouchMove={cancel}
      onTouchCancel={cancel}
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onClick={() => {
        if (fired.current) {
          fired.current = false
          return
        }
        onClick()
      }}
      className={
        pill
          ? 'flex-none flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-colors'
          : 'flex-none flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors'
      }
      style={
        pill
          ? {
              background: active ? 'var(--accent)' : 'transparent',
              border: `1px solid ${active ? 'var(--accent)' : 'var(--line-strong)'}`,
              color: active ? '#fff' : 'var(--muted)',
            }
          : {
              background: active ? 'var(--surface-2)' : 'var(--surface)',
              border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--light)',
            }
      }
    >
      <FolderIcon size={13} strokeWidth={1.8} style={{ color: pill ? (active ? '#fff' : 'var(--muted)') : 'var(--f-environment)' }} />
      {pill ? (
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
      ) : (
        label
      )}
    </button>
  )
}

// строка папки в вертикальном столбике (категория «Папки» внутри папки):
// тап — провалиться внутрь, long-press (~450ms) — настройка; справа счётчик записей и ›
function FolderColRow({
  folder,
  count,
  renaming,
  onRename,
  onClick,
  onLongPress,
}: {
  folder: Folder
  count: number
  renaming: boolean
  onRename: (name: string) => void
  onClick: () => void
  onLongPress: () => void
}) {
  const timer = useRef<number | undefined>(undefined)
  const fired = useRef(false)
  const start = () => {
    fired.current = false
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      fired.current = true
      onLongPress()
    }, 450)
  }
  const cancel = () => window.clearTimeout(timer.current)
  if (renaming) {
    return (
      <input
        autoFocus
        defaultValue={folder.name}
        onBlur={(e) => onRename(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') onRename((e.target as HTMLInputElement).value)
        }}
        className="w-full rounded-2xl px-3.5 py-3 outline-none"
        style={{ background: 'var(--surface)', border: '1px solid var(--accent)', fontSize: 14, fontWeight: 600, color: 'var(--light)' }}
      />
    )
  }
  return (
    <button
      onTouchStart={start}
      onTouchEnd={cancel}
      onTouchMove={cancel}
      onTouchCancel={cancel}
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onClick={() => {
        if (fired.current) {
          fired.current = false
          return
        }
        onClick()
      }}
      className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left"
      style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
    >
      <FolderIcon size={16} strokeWidth={1.8} style={{ color: 'var(--f-environment)', flex: 'none' }} />
      <span className="flex-1 min-w-0 truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--light)' }}>
        {folder.name}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{count || ''}</span>
      <ChevronRight size={16} strokeWidth={1.8} style={{ color: 'var(--muted)', flex: 'none' }} />
    </button>
  )
}
function FolderSettings({
  folders,
  setFolders,
  renaming,
  setRenaming,
  setFolderMenu,
  onAddFolder,
  onRename,
  onClose,
}: {
  folders: Folder[]
  setFolders: (f: Folder[] | ((prev: Folder[]) => Folder[])) => void
  renaming: string | null
  setRenaming: (id: string | null) => void
  setFolderMenu: (id: string | null) => void
  onAddFolder: (parentId: string | null, scope: 'records' | 'blocks') => void
  onRename: (id: string, name: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 top-14 rounded-t-2xl overflow-y-auto"
        style={{ background: 'var(--bg, var(--surface))', border: '1px solid var(--line)', borderBottom: 'none' }}
      >
        <div className="px-4 pt-4 pb-24">
          <div className="flex items-center justify-between mb-1">
            <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700, color: 'var(--light)' }}>
              Папки
            </h2>
            <button onClick={onClose} className="p-1" style={{ color: 'var(--muted)' }}>
              <X size={20} strokeWidth={1.8} />
            </button>
          </div>
          <p className="mb-4" style={{ fontSize: 12, color: 'var(--muted)' }}>
            Папки и подпапки разделов. Перетаскивай удержанием, три точки — настройки папки.
          </p>

          <FolderTree
            title="Записи"
            scope="records"
            folders={folders}
            setFolders={setFolders}
            renaming={renaming}
            setRenaming={setRenaming}
            setFolderMenu={setFolderMenu}
            onAddFolder={onAddFolder}
            onRename={onRename}
          />

          <FolderTree
            title="Блоки"
            scope="blocks"
            folders={folders}
            setFolders={setFolders}
            renaming={renaming}
            setRenaming={setRenaming}
            setFolderMenu={setFolderMenu}
            onAddFolder={onAddFolder}
            onRename={onRename}
          />
        </div>
      </div>
    </div>
  )
}

// одно дерево папок раздела: плоский список с отступами, drag среди соседей
function FolderTree({
  title,
  scope,
  folders,
  setFolders,
  renaming,
  setRenaming,
  setFolderMenu,
  onAddFolder,
  onRename,
}: {
  title: string
  scope: 'records' | 'blocks'
  folders: Folder[]
  setFolders: (f: Folder[] | ((prev: Folder[]) => Folder[])) => void
  renaming: string | null
  setRenaming: (id: string | null) => void
  setFolderMenu: (id: string | null) => void
  onAddFolder: (parentId: string | null, scope: 'records' | 'blocks') => void
  onRename: (id: string, name: string) => void
}) {
  const flat = useMemo(() => {
    const out: { f: Folder; depth: number }[] = []
    const validPid = (f: Folder) => (f.parentId && folders.some((x) => x.id === f.parentId) ? f.parentId : null)
    const walk = (pid: string | null, depth: number) => {
      folders
        .filter((f) => validPid(f) === pid && scopeOf(f, folders) === scope)
        .forEach((f) => {
          out.push({ f, depth })
          walk(f.id, depth + 1)
        })
    }
    walk(null, 0)
    return out
  }, [folders, scope])

  // перестановка разрешена только между соседями (одна и та же родительская папка)
  const reorder = (from: number, to: number) => {
    const a = flat[from]
    const b = flat[to]
    if (!a || !b) return
    const pa = a.f.parentId ?? null
    const pb = b.f.parentId ?? null
    if (pa !== pb) return
    const siblings = folders.filter((f) => (f.parentId ?? null) === pa)
    const si = siblings.findIndex((f) => f.id === a.f.id)
    const ti = siblings.findIndex((f) => f.id === b.f.id)
    if (si < 0 || ti < 0) return
    const nextSiblings = [...siblings]
    const [moved] = nextSiblings.splice(si, 1)
    nextSiblings.splice(ti, 0, moved)
    const sibIds = new Set(siblings.map((f) => f.id))
    const firstIdx = folders.findIndex((f) => sibIds.has(f.id))
    const rest = folders.filter((f) => !sibIds.has(f.id))
    rest.splice(Math.min(firstIdx, rest.length), 0, ...nextSiblings)
    setFolders(rest)
  }

  const drag = useDragList({
    onReorder: reorder,
    onLongPress: (i) => {
      const row = flat[i]
      if (row) setFolderMenu(row.f.id)
    },
  })

  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--light)' }}>{title}</h3>
        <button
          onClick={() => onAddFolder(null, scope)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg"
          style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 12, fontWeight: 600 }}
        >
          <Plus size={13} strokeWidth={2} /> Папка
        </button>
      </div>
      <div {...drag.containerProps} className="space-y-2">
        {flat.length === 0 && (
          <p className="py-4 text-center" style={{ fontSize: 13, color: 'var(--muted)' }}>
            Нет папок
          </p>
        )}
        {flat.map(({ f, depth }, idx) => (
          <div
            key={f.id}
            {...drag.bindRow(idx)}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              marginLeft: depth * 20,
              ...drag.rowStyle(idx),
            }}
          >
            <FolderIcon size={15} strokeWidth={1.8} style={{ color: 'var(--f-environment)', flex: 'none' }} />
            {renaming === f.id ? (
              <input
                defaultValue={f.name}
                autoFocus
                onBlur={(e) => { onRename(f.id, e.target.value); setRenaming(null) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    if (e.key === 'Enter') onRename(f.id, (e.target as HTMLInputElement).value)
                    setRenaming(null)
                  }
                }}
                className="flex-1 min-w-0 rounded-lg px-2 py-1 outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 14 }}
              />
            ) : (
              <span className="flex-1 min-w-0 truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--light)' }}>
                {f.name}
              </span>
            )}
            <button onClick={() => setFolderMenu(f.id)} className="p-1" style={{ color: 'var(--muted)' }}>
              <MoreHorizontal size={17} strokeWidth={1.8} />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── редактор шаблона блока ───
function TemplateEditor({
  tpl,
  onBack,
  onHome,
  onPatch,
  onAddToDay,
  onDelete,
  inline,
}: {
  tpl: BlockTemplate
  onBack: () => void
  onHome: () => void
  onPatch: (patch: Partial<BlockTemplate>) => void
  onAddToDay: () => void
  onDelete: () => void
  inline?: boolean // инлайн-режим: верхняя навигация Записей остаётся видна
}) {
  const [editItemId, setEditItemId] = useState<string | null>(null)
  // состав блока — как в меню блока «Прогресса»; у старых шаблонов поля нет → всё разрешено
  const allow = tpl.allow ?? FULL_ALLOW
  const setAllow = (key: keyof typeof FULL_ALLOW, v: boolean) =>
    onPatch({ allow: { ...allow, [key]: v } })
  const allowRows: { key: keyof typeof FULL_ALLOW; label: string }[] = [
    { key: 'checklists', label: 'Чек-листы' },
    { key: 'sub', label: 'Подблоки' },
    { key: 'lists', label: 'Списки' },
    { key: 'items', label: 'Пункты' },
  ]

  const patchItem = (itemId: string, patch: Partial<BlockItem>) =>
    onPatch({ items: tpl.items.map((x) => (x.id === itemId ? { ...x, ...patch } : x)) })

  const addItem = () => {
    const it: BlockItem = { id: uid(), text: '', done: false, ...(tpl.withTime ? { time: '12:00' } : {}) }
    onPatch({ items: [...tpl.items, it] })
    setEditItemId(it.id)
  }

  const addList = (kind: BlockList['kind']) => {
    const l: BlockList = { id: uid(), kind, title: '', items: [] }
    onPatch({ lists: [...tpl.lists, l] })
  }

  const patchList = (listId: string, patch: Partial<BlockList>) =>
    onPatch({ lists: tpl.lists.map((l) => (l.id === listId ? { ...l, ...patch } : l)) })

  const itemsDrag = useDragList({
    onReorder: (from, to) => onPatch({ items: moveItem(tpl.items, from, to) }),
    onLongPress: () => {},
  })

  return (
    <Immersion
      title={tpl.title || 'Шаблон блока'}
      onBack={onBack}
      onHome={onHome}
      onMic={() => {}}
      inline={inline}
      menu={[
        { label: 'Добавить в сегодня', icon: CalendarPlus, onClick: onAddToDay },
        { label: 'Удалить шаблон', icon: Trash2, onClick: onDelete },
      ]}
    >
      <div className="px-5 py-4 pb-24">
        <input
          value={tpl.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          placeholder="Название блока"
          className="w-full bg-transparent outline-none"
          style={{ fontFamily: 'var(--font-body)', fontSize: 22, fontWeight: 700, color: 'var(--light)' }}
        />

        {/* флаги блока */}
        <div className="flex flex-wrap gap-2 mt-3 mb-3">
          <button
            onClick={() => onPatch({ withTime: !tpl.withTime })}
            className="px-3 py-1.5 rounded-full"
            style={{
              background: tpl.withTime ? 'var(--accent)' : 'var(--surface-2)',
              color: tpl.withTime ? 'var(--on-fill)' : 'var(--muted)',
              border: '1px solid var(--line)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Со временем
          </button>
          <button
            onClick={() => onPatch({ inDashboard: !tpl.inDashboard })}
            className="px-3 py-1.5 rounded-full"
            style={{
              background: tpl.inDashboard ? 'var(--accent)' : 'var(--surface-2)',
              color: tpl.inDashboard ? 'var(--on-fill)' : 'var(--muted)',
              border: '1px solid var(--line)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            В дашборд
          </button>
        </div>

        {/* состав блока — те же переключатели, что в меню блока в «Прогрессе»;
            переносятся в блок дня при добавлении из шаблона */}
        <div
          className="mb-5 rounded-2xl px-3 py-2"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}
        >
          <p className="pt-1 pb-1" style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Состав блока
          </p>
          {allowRows.map((r) => (
            <div key={r.key} className="flex items-center gap-3 py-2">
              <span className="flex-1" style={{ fontSize: 14, color: 'var(--text-2)' }}>
                {r.label}
              </span>
              <Toggle on={allow[r.key]} onChange={(v) => setAllow(r.key, v)} />
            </div>
          ))}
        </div>

        {/* пункты */}
        <div {...itemsDrag.containerProps}>
          {tpl.items.map((it, idx) => (
            <TemplateItemRow
              key={it.id}
              it={it}
              editing={editItemId === it.id}
              onEdit={() => setEditItemId(it.id)}
              onDoneEdit={() => setEditItemId(null)}
              onPatch={(p) => patchItem(it.id, p)}
              onDelete={() => onPatch({ items: tpl.items.filter((x) => x.id !== it.id) })}
              dragBind={itemsDrag.bindRow(idx)}
              dragStyle={itemsDrag.rowStyle(idx)}
            />
          ))}
        </div>

        {/* списки */}
        {tpl.lists.map((l) => (
          <TemplateListCard
            key={l.id}
            list={l}
            onPatch={(p) => patchList(l.id, p)}
            onDelete={() => onPatch({ lists: tpl.lists.filter((x) => x.id !== l.id) })}
          />
        ))}

        {/* добавление — как в блоке дня; скрытое в «Составе блока» не предлагается */}
        <div className="mt-4">
          {allow.items && <TplAddRow label="добавить пункт" onClick={addItem} />}
          {allow.sub && <TplAddRow label="добавить подблок" onClick={() => addList('sub')} />}
          {allow.checklists && <TplAddRow label="добавить чек-лист" onClick={() => addList('checklist')} />}
          {allow.lists && <TplAddRow label="добавить список" onClick={() => addList('list')} />}
        </div>
      </div>
    </Immersion>
  )
}

function TplAddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-1 flex w-full items-center gap-2 rounded-xl border border-dashed px-3 py-2"
      style={{ borderColor: 'var(--line-strong)', color: 'var(--muted)', fontSize: 13 }}
    >
      <Plus size={14} strokeWidth={1.8} /> {label}
    </button>
  )
}

// строка пункта шаблона: редактирование только по тапу на текст
function TemplateItemRow({
  it,
  editing,
  onEdit,
  onDoneEdit,
  onPatch,
  onDelete,
  dragBind,
  dragStyle,
}: {
  it: BlockItem
  editing: boolean
  onEdit: () => void
  onDoneEdit: () => void
  onPatch: (p: Partial<BlockItem>) => void
  onDelete: () => void
  dragBind: Record<string, unknown>
  dragStyle: React.CSSProperties
}) {
  return (
    <div
      {...dragBind}
      className="flex items-center gap-2.5 py-2"
      style={dragStyle}
    >
      <MCheck done={false} color="var(--accent)" size={16} />
      {editing ? (
        <input
          defaultValue={it.text}
          autoFocus
          onBlur={(e) => { onPatch({ text: e.target.value }); onDoneEdit() }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
              if (e.key === 'Enter') onPatch({ text: (e.target as HTMLInputElement).value })
              onDoneEdit()
            }
          }}
          className="flex-1 min-w-0 rounded-lg px-2 py-1 outline-none"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 14 }}
        />
      ) : (
        <button onClick={onEdit} className="flex-1 min-w-0 text-left truncate" style={{ fontSize: 14, color: 'var(--text-2)' }}>
          {it.text || 'Пункт — нажми, чтобы заполнить'}
        </button>
      )}
      <button onClick={onDelete} className="flex-none p-1" style={{ color: 'var(--muted)' }}>
        <X size={14} strokeWidth={1.8} />
      </button>
    </div>
  )
}

// карточка вложенного списка шаблона: название + пункты (один уровень)
function TemplateListCard({
  list,
  onPatch,
  onDelete,
}: {
  list: BlockList
  onPatch: (p: Partial<BlockList>) => void
  onDelete: () => void
}) {
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState(false)

  const addItem = () => {
    const it: BlockItem = { id: uid(), text: '', done: false }
    onPatch({ items: [...list.items, it] })
    setEditItemId(it.id)
  }

  const drag = useDragList({
    onReorder: (from, to) => onPatch({ items: moveItem(list.items, from, to) }),
    onLongPress: () => {},
  })

  const Icon = list.kind === 'list' ? ListOrdered : ListChecks
  const defaultTitle = list.kind === 'checklist' ? 'Чек-лист' : list.kind === 'list' ? 'Список' : 'Подблок'

  return (
    <div className="rounded-2xl p-3 mt-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={15} strokeWidth={1.8} style={{ color: 'var(--accent)', flex: 'none' }} />
        {editTitle ? (
          <input
            defaultValue={list.title}
            autoFocus
            onBlur={(e) => { onPatch({ title: e.target.value }); setEditTitle(false) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                if (e.key === 'Enter') onPatch({ title: (e.target as HTMLInputElement).value })
                setEditTitle(false)
              }
            }}
            className="flex-1 min-w-0 rounded-lg px-2 py-0.5 outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 13.5 }}
          />
        ) : (
          <button onClick={() => setEditTitle(true)} className="flex-1 min-w-0 text-left" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--light)' }}>
            {list.title || defaultTitle}
          </button>
        )}
        <button onClick={onDelete} className="p-1" style={{ color: 'var(--muted)' }}>
          <Trash2 size={14} strokeWidth={1.8} />
        </button>
      </div>
      <div {...drag.containerProps}>
        {list.items.map((it, idx) => (
          <TemplateItemRow
            key={it.id}
            it={it}
            editing={editItemId === it.id}
            onEdit={() => setEditItemId(it.id)}
            onDoneEdit={() => setEditItemId(null)}
            onPatch={(p) => onPatch({ items: list.items.map((x) => (x.id === it.id ? { ...x, ...p } : x)) })}
            onDelete={() => onPatch({ items: list.items.filter((x) => x.id !== it.id) })}
            dragBind={drag.bindRow(idx)}
            dragStyle={drag.rowStyle(idx)}
          />
        ))}
      </div>
      <TplAddRow label="добавить пункт" onClick={addItem} />
    </div>
  )
}

// карточка записи: плитка-иконка + заголовок + подпись + счётчик,
// ниже — превью до 5 пунктов (у чек-листа чекбоксы интерактивны);
// вложенные подблоки — заголовок с прогрессом + до 4 пунктов с чекбоксами
function ListRecCard({
  rec,
  onOpen,
  onToggleItem,
  onToggleListItem,
  onEditEmotion,
  onAddEmotion,
}: {
  rec: ListRecord
  onOpen: () => void
  onToggleItem: (itemId: string) => void
  onToggleListItem: (listId: string, itemId: string) => void
  onEditEmotion: (tag: EmotionTag) => void
  onAddEmotion: () => void
}) {
  const Icon = rec.kind === 'checklist' ? ListChecks : ListOrdered
  const color = rec.kind === 'checklist' ? 'var(--ring-checklists)' : 'var(--ring-tasks)'
  const stats = recItemStats(rec)
  const itemRow = (it: BlockItem, idx: number, onToggle: () => void) => (
    <div key={it.id} className="flex items-center gap-2.5 py-1.5">
      {rec.kind === 'checklist' ? (
        <button onClick={onToggle} className="flex-none" title="Отметить">
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
  )
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
            {rec.lists?.length ? ` · ${rec.lists.length} подблоков` : ''}
          </span>
        </span>
        <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
          {rec.kind === 'checklist' ? `${stats.done}/${stats.total}` : `${stats.total} пунктов`}
        </span>
      </button>
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <EmotionChips tags={rec.emotions} onClick={onEditEmotion} />
        <button
          onClick={onAddEmotion}
          className="flex-none grid place-items-center rounded-full"
          style={{ width: 18, height: 18, background: 'var(--surface-2)', color: 'var(--muted)' }}
          title="Добавить эмоцию"
        >
          <Plus size={12} strokeWidth={2} />
        </button>
      </div>
      {(rec.items?.length ?? 0) > 0 && (
        <div className="mt-2 pt-1" style={{ borderTop: '1px solid var(--line)' }}>
          {rec.items.slice(0, 5).map((it, idx) => itemRow(it, idx, () => onToggleItem(it.id)))}
          {(rec.items?.length ?? 0) > 5 && (
            <p className="pt-1" style={{ fontSize: 11, color: 'var(--muted)' }}>
              ещё {(rec.items?.length ?? 0) - 5}…
            </p>
          )}
        </div>
      )}
      {rec.lists?.map((l) => {
        const done = l.items.filter((i) => i.done).length
        return (
          <div key={l.id} className="mt-2 pt-1" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between gap-2 py-1">
              <span className="min-w-0 truncate" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--light)' }}>
                {l.title || 'Подблок'}
              </span>
              <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                {done}/{(l.items?.length ?? 0)}
              </span>
            </div>
            {(l.items ?? []).slice(0, 4).map((it, idx) => itemRow(it, idx, () => onToggleListItem(l.id, it.id)))}
            {(l.items?.length ?? 0) > 4 && (
              <p className="pt-1" style={{ fontSize: 11, color: 'var(--muted)' }}>
                ещё {(l.items?.length ?? 0) - 4}…
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function NoteRow({
  n,
  folderName,
  tileColor,
  onOpen,
  onTogglePin,
  onEditEmotion,
  onAddEmotion,
}: {
  n: Note
  folderName: string
  tileColor: string
  onOpen: () => void
  onTogglePin: (e: React.MouseEvent) => void
  onEditEmotion: (tag: EmotionTag) => void
  onAddEmotion: () => void
}) {
  return (
    <button
      onClick={onOpen}
      className="w-full rounded-2xl p-3.5 text-left"
      style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
    >
      <span className="flex items-start gap-3">
        <Tile icon={FileText} color={tileColor} size={44} />
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
        <span className="flex items-center gap-1.5 flex-wrap">
          <span
            className="px-2.5 py-0.5 rounded-md"
            style={{ background: 'var(--surface-2)', fontSize: 11, color: 'var(--muted)' }}
          >
            {folderName}
          </span>
          {n.therapy && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
              style={{ background: 'var(--surface-2)', fontSize: 10, color: 'var(--muted)' }}
            >
              <Stethoscope size={10} strokeWidth={1.8} /> терапия
            </span>
          )}
          <EmotionChips tags={n.emotions} onClick={onEditEmotion} />
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddEmotion()
            }}
            className="flex-none grid place-items-center rounded-full"
            style={{ width: 18, height: 18, background: 'var(--surface-2)', color: 'var(--muted)' }}
            title="Добавить эмоцию"
          >
            <Plus size={12} strokeWidth={2} />
          </button>
        </span>
        <Star
          size={16}
          strokeWidth={1.7}
          onClick={onTogglePin}
          style={{ color: n.pinned ? 'var(--accent)' : 'var(--muted)' }}
          fill={n.pinned ? 'var(--accent)' : 'none'}
        />
      </span>
    </button>
  )
}

function DiaryRow({
  dk,
  diary,
  onOpen,
  onEditEmotion,
  onAddEmotion,
}: {
  dk: string
  diary: Diary
  onOpen: () => void
  onEditEmotion: (tag: EmotionTag) => void
  onAddEmotion: () => void
}) {
  return (
    <button
      onClick={onOpen}
      className="w-full rounded-2xl p-3.5 text-left"
      style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
    >
      <span className="flex items-center gap-3">
        <Tile icon={BookOpen} color="var(--f-emotions)" size={36} />
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--light)' }}>
            {diaryLabel(dk)}
          </span>
          <span className="block truncate mt-0.5" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            {diary[dk]?.text?.split('\n')[0] || '—'}
          </span>
        </span>
        {diary[dk]?.therapy && (
          <span
            className="flex-none flex items-center gap-1 px-1.5 py-0.5 rounded-md"
            style={{ background: 'var(--surface-2)', fontSize: 10, color: 'var(--muted)' }}
          >
            <Stethoscope size={10} strokeWidth={1.8} /> терапия
          </span>
        )}
      </span>
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <EmotionChips tags={diary[dk]?.emotions} onClick={onEditEmotion} />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAddEmotion()
          }}
          className="flex-none grid place-items-center rounded-full"
          style={{ width: 18, height: 18, background: 'var(--surface-2)', color: 'var(--muted)' }}
          title="Добавить эмоцию"
        >
          <Plus size={12} strokeWidth={2} />
        </button>
      </div>
    </button>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <p className="py-10 text-center" style={{ fontSize: 13, color: 'var(--muted)' }}>
      {text}
    </p>
  )
}

function EmotionChips({ tags, onClick }: { tags?: EmotionTag[]; onClick: (tag: EmotionTag) => void }) {
  if (!tags?.length) return null
  return (
    <>
      {tags.map((tag) => {
        const color = plutchikColor(tag.emotion)
        return (
          <button
            key={tag.id}
            onClick={(e) => {
              e.stopPropagation()
              onClick(tag)
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ background: color + '1a', border: `1px solid ${color}`, fontSize: 11, color: 'var(--text)' }}
          >
            <span style={{ color }}>{emotionName(tag.emotion)}</span>
            <span className="px-1 rounded" style={{ background: color, color: '#fff', fontSize: 9, fontWeight: 700 }}>
              {tag.level}
            </span>
            {tag.feelings && tag.feelings.length > 0 && (
              <span className="opacity-75">· {tag.feelings.map((f) => `${f.name}(${f.level})`).join(', ')}</span>
            )}
            {tag.sensations && tag.sensations.length > 0 && (
              <span className="opacity-75">· {tag.sensations.map((s) => `${s.name}(${s.level})`).join(', ')}</span>
            )}
          </button>
        )
      })}
    </>
  )
}
