import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown, ChevronsUpDown, Columns2, Download, Plus, Rows2, StickyNote } from 'lucide-react'
import { useLS, allEmotionTags, emotionName, plutchikColor, type Note, type ListRecord, type Diary, type EmotionTag } from '../views/practice/store'
import ParamNoteSheet, { normalizeNote, noteHasText, type ParamNoteHistoryItem, type ParamNoteParts } from './ParamNoteSheet'
import {
  CATEGORIES,
  CX,
  CY,
  DATA,
  ERROR_RED,
  GROUPS,
  ROTATION,
  R_CATEGORY,
  R_GROUP,
  R_PARAM,
  average,
  buildExportText,
  computeAnalyticsItems,
  computeValueSets,
  copyValues,
  dynamicsError,
  fmtSigned,
  formatDateRu,
  findParamSnapshotValue,
  isInverseParam,
  mediumValues,
  pointOnCircle,
  rainbowColorSigned,
  radiusForValue,
  round2,
  valueHex,
  wrapText,
  type MapTab,
  type Snapshot,
  type Snapshots,
} from './mapLogic'

// хранилище: снимки + выбранная дата; категории/группы/оптимум — статичные из импорта
// paramNotes: имя параметра → дата снимка → заметка с подблоками (одна на пункт за снимок);
// старые записи могут быть просто строкой (= общее описание)
interface StoredSelfMap {
  snapshots: Snapshots
  selectedDate: string | null
  paramNotes?: Record<string, Record<string, ParamNoteParts | string>>
}

const SEED: StoredSelfMap = {
  snapshots: DATA.snapshots,
  selectedDate: Object.keys(DATA.snapshots).sort()[0] ?? null,
}

const TABS: { id: MapTab; label: string }[] = [
  { id: 'snapshot', label: 'Снимок' },
  { id: 'dynamics', label: 'Динамика' },
  { id: 'analytics', label: 'Аналитика' },
]

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function MapView() {
  const [stored, setStored] = useLS<StoredSelfMap>('aod4-selfmap-v1', SEED)
  const [tab, setTab] = useState<MapTab>('snapshot')
  const [baseline, setBaseline] = useState<string | null>(null)

  // развёрнутость графа: группы и категории (тап по узлу)
  const [graphGroups, setGraphGroups] = useState<Set<number>>(() => new Set(GROUPS.map((_, i) => i)))
  const [graphCats, setGraphCats] = useState<Set<number>>(() => new Set(CATEGORIES.map((_, i) => i)))
  // развёрнутость панели (отдельно для снимка/динамики и аналитики, как в оригинале)
  const [panelGroups, setPanelGroups] = useState<Set<number>>(() => new Set(GROUPS.map((_, i) => i)))
  const [panelCats, setPanelCats] = useState<Set<number>>(() => new Set())
  const [anGroups, setAnGroups] = useState<Set<number>>(() => new Set(GROUPS.map((_, i) => i)))
  const [anCats, setAnCats] = useState<Set<number>>(() => new Set())
  const [allExpanded, setAllExpanded] = useState(false)

  const [addOpenCats, setAddOpenCats] = useState<Set<number>>(new Set())
  const [touchedParams, setTouchedParams] = useState<Set<string>>(new Set())

  // форма «Добавить»
  const [isAdding, setIsAdding] = useState(false)
  const [draft, setDraft] = useState<Snapshot | null>(null)

  // заметки к пунктам: открытый sheet + выбранная в нём дата + заметки черновика нового снимка
  const [noteParam, setNoteParam] = useState<string | null>(null)
  const [noteDate, setNoteDate] = useState<string | null>(null)
  const [draftNotes, setDraftNotes] = useState<Record<string, ParamNoteParts>>({})

  const [anView, setAnView] = useState<'gaps' | 'strengths'>('gaps')
  const [anPanelView, setAnPanelView] = useLS<'list' | 'columns'>('aod4-map-analytics-view', 'list')
  const [anGroupView, setAnGroupView] = useLS<'flat' | 'groups'>('aod4-map-analytics-grouping', 'groups')
  const [dataView, setDataView] = useLS<'list' | 'columns'>('aod4-map-data-view', 'list')
  const [emotionsOpen, setEmotionsOpen] = useState(false)

  // данные эмоций для подсветки графа
  const [notes] = useLS<Note[]>('aod4-notes', [])
  const [listrecs] = useLS<ListRecord[]>('aod4-listrecs', [])
  const [diary] = useLS<Diary>('aod4-diary', {})

  const snapshots = stored.snapshots
  const dates = useMemo(() => Object.keys(snapshots).sort(), [snapshots])
  // выбранная дата персистится; если её снимок пропал — первая доступная
  const selectedDate =
    stored.selectedDate && snapshots[stored.selectedDate] ? stored.selectedDate : (dates[0] ?? null)

  // базовая дата динамики: только даты раньше выбранной; невалидная автозаменяется
  // на последнюю валидную (как renderBaselineSelect в оригинале)
  const validBaselines = useMemo(
    () => dates.filter((d) => selectedDate && d < selectedDate),
    [dates, selectedDate],
  )
  const effBaseline =
    tab === 'dynamics'
      ? baseline && validBaselines.includes(baseline)
        ? baseline
        : (validBaselines[validBaselines.length - 1] ?? null)
      : null

  const dynError = tab === 'dynamics' ? dynamicsError(snapshots, selectedDate, effBaseline) : null
  const valueSets = computeValueSets(snapshots, tab, selectedDate, effBaseline)

  // ─── подсветка эмоций на графе ───
  const emotionHighlights = useMemo(() => {
    if (!selectedDate) return new Map<string, { color: string; level: number; emotion: string }>()
    const start = new Date(selectedDate + 'T00:00:00').getTime()
    const end = start + 86400000
    const tags = allEmotionTags(notes, listrecs, diary).filter((t) => t.created >= start && t.created < end)

    const mapping: Record<string, string> = {
      joy: 'Уровень радости',
      sadness: 'Уровень печали',
      fear: 'Уровень страха',
      anger: 'Склонность к конфликтам',
      trust: 'Способность себя хвалить',
      anticipation: 'Способность достигать целей',
      surprise: 'Бодрость',
      disgust: 'Ощущение удовлетворенности',
    }

    const result = new Map<string, { color: string; level: number; emotion: string }>()
    for (const tag of tags) {
      const paramName = mapping[tag.emotion]
      if (!paramName) continue
      const existing = result.get(paramName)
      if (!existing || tag.level > existing.level) {
        result.set(paramName, { color: plutchikColor(tag.emotion), level: tag.level, emotion: tag.emotion })
      }
    }
    return result
  }, [notes, listrecs, diary, selectedDate])

  const isDynamics = tab === 'dynamics'
  const colorOf = (v: number) =>
    isDynamics ? rainbowColorSigned(v) : valueHex(false, v)
  const radiusOf = (v: number, isCenter = false) => radiusForValue(isDynamics, v, isCenter)

  // ─── заметки к пунктам ───
  const paramNotes = stored.paramNotes ?? {}
  const notePartsFor = (param: string, date: string): ParamNoteParts => normalizeNote(paramNotes[param]?.[date])
  const noteDraftDate = todayIso()
  // дата, к которой привязана заметка открытого sheet: явно выбранная в нём,
  // в форме — будущий снимок, иначе выбранный
  const noteSheetDate = noteDate ?? (isAdding ? noteDraftDate : (selectedDate ?? noteDraftDate))
  // в динамике заметку можно вести по любой из двух сравниваемых дат
  const noteSheetDates =
    !isAdding && tab === 'dynamics' && selectedDate && effBaseline
      ? [selectedDate, effBaseline]
      : undefined

  const openNote = (param: string, date?: string) => {
    setNoteParam(param)
    setNoteDate(date ?? null)
  }

  const closeNote = () => {
    setNoteParam(null)
    setNoteDate(null)
  }

  // пишет один подблок; запись удаляется, когда все подблоки пусты
  const saveNote = (param: string, date: string, part: keyof ParamNoteParts, value: string | string[]) => {
    setStored((s) => {
      const pn = { ...(s.paramNotes ?? {}) }
      const byDate = { ...(pn[param] ?? {}) }
      const parts = { ...normalizeNote(byDate[date]) }
      const hasValue = Array.isArray(value) ? value.some((v) => v.trim()) : value.trim()
      if (hasValue) parts[part] = value as never
      else delete parts[part]
      if (noteHasText(parts)) byDate[date] = parts
      else delete byDate[date]
      if (Object.keys(byDate).length > 0) pn[param] = byDate
      else delete pn[param]
      return { ...s, paramNotes: pn }
    })
  }

  const saveSheetNote = (param: string, part: keyof ParamNoteParts, value: string | string[]) => {
    if (isAdding) {
      setDraftNotes((d) => {
        const next = { ...d }
        const parts = { ...normalizeNote(next[param]) }
        const hasValue = Array.isArray(value) ? value.some((v) => v.trim()) : value.trim()
        if (hasValue) parts[part] = value as never
        else delete parts[part]
        if (noteHasText(parts)) next[param] = parts
        else delete next[param]
        return next
      })
    } else {
      saveNote(param, noteSheetDate, part, value)
    }
  }

  const noteHistory = (param: string): ParamNoteHistoryItem[] =>
    Object.entries(paramNotes[param] ?? {})
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([d, raw]) => {
        const found = findParamSnapshotValue(snapshots[d], param)
        return { date: d, value: found, parts: normalizeNote(raw) }
      })

  // ─── действия ───
  const selectDate = (date: string) => {
    if (!snapshots[date]) return
    setStored((s) => ({ ...s, selectedDate: date }))
    setIsAdding(false)
    setDraft(null)
    setDraftNotes({})
    closeNote()
  }

  const switchTab = (t: MapTab) => {
    setTab(t)
    setIsAdding(false)
    setDraft(null)
    setDraftNotes({})
    closeNote()
    if (t === 'dynamics') {
      // по умолчанию baseline — предыдущая дата перед выбранной
      const idx = dates.indexOf(selectedDate ?? '')
      setBaseline(idx > 0 ? dates[idx - 1] : null)
    } else {
      setBaseline(null)
    }
  }

  const toggleIn = (set: Set<number>, i: number, apply: (s: Set<number>) => void) => {
    const next = new Set(set)
    if (next.has(i)) next.delete(i)
    else next.add(i)
    apply(next)
  }

  // «Развернуть/Сжать»: все группы и категории панели разом
  const toggleAll = () => {
    const expand = !allExpanded
    setAllExpanded(expand)
    const g = new Set(GROUPS.map((_, i) => i))
    const c = expand ? new Set(CATEGORIES.map((_, i) => i)) : new Set<number>()
    setPanelGroups(g)
    setPanelCats(c)
    setAnGroups(new Set(g))
    setAnCats(new Set(c))
  }

  const toggleAddMode = () => {
    if (isAdding) {
      setIsAdding(false)
      setDraft(null)
      setTouchedParams(new Set())
      setDraftNotes({})
      closeNote()
      return
    }
    setDraft(mediumValues())
    setIsAdding(true)
    setTouchedParams(new Set())
    setDraftNotes({})
  }

  const addDate = () => {
    const date = todayIso()
    const values = draft ? copyValues(draft) : mediumValues()
    setStored((s) => {
      const pn = { ...(s.paramNotes ?? {}) }
      for (const [param, parts] of Object.entries(draftNotes)) {
        if (!noteHasText(parts)) continue
        pn[param] = { ...(pn[param] ?? {}), [date]: parts }
      }
      return { snapshots: { ...s.snapshots, [date]: values }, selectedDate: date, paramNotes: pn }
    })
    setIsAdding(false)
    setDraft(null)
    setTouchedParams(new Set())
    setDraftNotes({})
    closeNote()
  }

  const exportText = () => {
    if (!selectedDate || !snapshots[selectedDate]) return
    const text = buildExportText(selectedDate, snapshots[selectedDate])
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${formatDateRu(selectedDate)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ─── граф ───
  const graphLabel = isDynamics ? 'Динамика' : selectedDate ? formatDateRu(selectedDate) : '—'
  let centerText = '—'
  let links: ReactNode = null
  let nodes: ReactNode = null
  let labels: ReactNode = null

  if (dynError) {
    // красная плашка-ошибка прямо на графе
    labels = (
      <g>
        <rect
          x={CX - 180}
          y={CY - 40}
          width={360}
          height={80}
          rx={8}
          fill="var(--surface)"
          stroke={ERROR_RED}
          strokeWidth={2}
        />
        <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize={14} fontWeight={600} fill={ERROR_RED}>
          {dynError}
        </text>
      </g>
    )
  } else if (valueSets) {
    const catAvgs = CATEGORIES.map((_, i) => average(valueSets.norm[i]))
    const groupAvgs = GROUPS.map((g) => average(g.categories.map((i) => catAvgs[i])))
    const overallAvg = average(groupAvgs)
    centerText = isDynamics ? fmtSigned(overallAvg) : round2(overallAvg).toFixed(1)

    const linkEls: ReactNode[] = []
    const nodeEls: ReactNode[] = []
    const labelEls: ReactNode[] = []

    // метка с переносом строк и фоном-плашкой
    const label = (key: string, x: number, y: number, text: string, color: string, fontSize = 11) => {
      const lines = wrapText(text)
      const lineHeight = fontSize + 2
      const totalH = lines.length * lineHeight
      const startY = y - totalH / 2 + lineHeight / 2
      const maxLen = Math.max(...lines.map((l) => l.length)) * (fontSize * 0.55)
      labelEls.push(
        <g key={key} pointerEvents="none">
          <rect
            x={x - maxLen / 2 - 3}
            y={y - totalH / 2 - 2}
            width={maxLen + 6}
            height={totalH + 4}
            rx={3}
            fill="var(--surface)"
            fillOpacity={0.85}
          />
          {lines.map((ln, i) => (
            <text
              key={i}
              x={x}
              y={startY + i * lineHeight}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={fontSize}
              fill={color}
              style={{ textShadow: '0 1px 2px var(--bg)' }}
            >
              {ln}
            </text>
          ))}
        </g>,
      )
    }

    // число внутри узла
    const nodeValue = (key: string, x: number, y: number, value: string, isCenter = false) => {
      nodeEls.push(
        <text
          key={key}
          x={x}
          y={y + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          pointerEvents="none"
          fontSize={isCenter ? 14 : 11}
          fontWeight={600}
          fill="var(--text)"
          style={{ textShadow: '0 0 3px var(--surface), 0 0 3px var(--surface)' }}
        >
          {value}
        </text>,
      )
    }

    // центральный узел — общая средняя
    nodeEls.push(
      <circle key="center" cx={CX} cy={CY} r={radiusOf(overallAvg, true)} fill={colorOf(overallAvg)} stroke="var(--text)" strokeWidth={3}>
        <title>{`Общая средняя: ${round2(overallAvg)}`}</title>
      </circle>,
    )
    nodeValue('center-v', CX, CY, centerText, true)

    const groupAngleStep = (Math.PI * 2) / GROUPS.length
    const categoryAngleStep = (Math.PI * 2) / CATEGORIES.length

    // сортировка параметров: обычные в исходном порядке, затем инвертированные в исходном порядке
    const sortedParamIndices = (catIndex: number) => {
      const indices = CATEGORIES[catIndex].params.map((_, pi) => pi)
      const normal = indices.filter((pi) => !isInverseParam(catIndex, pi))
      const inverse = indices.filter((pi) => isInverseParam(catIndex, pi))
      return [...normal, ...inverse]
    }

    GROUPS.forEach((group, gIndex) => {
      const groupAngle = gIndex * groupAngleStep - Math.PI / 2 + ROTATION
      const gPos = pointOnCircle(CX, CY, R_GROUP, groupAngle)
      const gAvg = groupAvgs[gIndex]
      const gColor = colorOf(gAvg)
      const isGroupActive = graphGroups.has(gIndex)
      const gRadius = radiusOf(gAvg, true)

      linkEls.push(
        <line key={`lg-${gIndex}-a`} x1={CX} y1={CY} x2={gPos.x} y2={gPos.y} stroke={colorOf(overallAvg)} strokeWidth={5} strokeOpacity={0.85} />,
        <line key={`lg-${gIndex}-b`} x1={CX} y1={CY} x2={gPos.x} y2={gPos.y} stroke={gColor} strokeWidth={2.5} strokeOpacity={0.9} />,
      )
      nodeEls.push(
        <circle
          key={`g-${gIndex}`}
          cx={gPos.x}
          cy={gPos.y}
          r={gRadius}
          fill={gColor}
          stroke={isGroupActive ? 'var(--accent)' : 'var(--text)'}
          strokeWidth={isGroupActive ? 4 : 2.5}
          style={{ cursor: 'pointer' }}
          onClick={() => toggleIn(graphGroups, gIndex, setGraphGroups)}
        >
          <title>{`${group.name}: ${round2(gAvg)}`}</title>
        </circle>,
      )
      nodeValue(`gv-${gIndex}`, gPos.x, gPos.y, isDynamics ? fmtSigned(gAvg) : round2(gAvg).toFixed(1))
      const gLabelPos = pointOnCircle(CX, CY, R_GROUP + gRadius + 14, groupAngle)
      label(`gl-${gIndex}`, gLabelPos.x, gLabelPos.y, group.name, isGroupActive ? 'var(--accent)' : 'var(--text)', 12)

      if (!isGroupActive) return

      group.categories.forEach((catIndex, cIndex) => {
        const catAngle = groupAngle + (cIndex - 1) * categoryAngleStep
        const pos = pointOnCircle(CX, CY, R_CATEGORY, catAngle)
        const avg = catAvgs[catIndex]
        const catColor = colorOf(avg)
        const isActive = graphCats.has(catIndex)
        const catRadius = radiusOf(avg)

        linkEls.push(
          <line key={`lc-${catIndex}-a`} x1={gPos.x} y1={gPos.y} x2={pos.x} y2={pos.y} stroke={gColor} strokeWidth={5} strokeOpacity={0.85} />,
          <line key={`lc-${catIndex}-b`} x1={gPos.x} y1={gPos.y} x2={pos.x} y2={pos.y} stroke={catColor} strokeWidth={2.5} strokeOpacity={0.9} />,
        )
        nodeEls.push(
          <circle
            key={`c-${catIndex}`}
            cx={pos.x}
            cy={pos.y}
            r={catRadius}
            fill={catColor}
            stroke={isActive ? 'var(--accent)' : 'var(--text)'}
            strokeWidth={isActive ? 4 : 2.5}
            style={{ cursor: 'pointer' }}
            onClick={() => toggleIn(graphCats, catIndex, setGraphCats)}
          >
            <title>{`${CATEGORIES[catIndex].name}: ${round2(avg)}`}</title>
          </circle>,
        )
        const labelPos = pointOnCircle(CX, CY, R_CATEGORY + catRadius + 14, catAngle)
        label(`cl-${catIndex}`, labelPos.x, labelPos.y, CATEGORIES[catIndex].name, isActive ? 'var(--accent)' : 'var(--text)')

        if (!isActive) return

        // параметры категории веером (отсортированные)
        const params = CATEGORIES[catIndex].params
        const sortedParams = sortedParamIndices(catIndex)
        const paramAngleSpan = categoryAngleStep * 0.8
        const startAngle = catAngle - paramAngleSpan / 2
        const step = sortedParams.length > 1 ? paramAngleSpan / (sortedParams.length - 1) : 0

        sortedParams.forEach((paramIndex, j) => {
          const paramName = params[paramIndex]
          const paramAngle = startAngle + step * j
          const pPos = pointOnCircle(CX, CY, R_PARAM, paramAngle)
          const value = valueSets.norm[catIndex][paramIndex]
          const rawV = valueSets.raw[catIndex][paramIndex]
          const highlight = emotionHighlights.get(paramName)
          const baseColor = colorOf(value)
          const paramColor = highlight ? highlight.color : baseColor
          const radius = highlight ? radiusOf(value) * (1.15 + 0.075 * highlight.level) : radiusOf(value)

          // двойная линия: толстая цвета категории + тонкая цвета параметра
          linkEls.push(
            <line
              key={`lp-${catIndex}-${paramIndex}-a`}
              x1={pos.x}
              y1={pos.y}
              x2={pPos.x}
              y2={pPos.y}
              stroke={catColor}
              strokeWidth={5}
              strokeOpacity={0.85}
            />,
            <line
              key={`lp-${catIndex}-${paramIndex}-b`}
              x1={pos.x}
              y1={pos.y}
              x2={pPos.x}
              y2={pPos.y}
              stroke={paramColor}
              strokeWidth={highlight ? 4 : 2.5}
              strokeOpacity={0.9}
            />,
          )
          nodeEls.push(
            <circle
              key={`p-${catIndex}-${paramIndex}`}
              cx={pPos.x}
              cy={pPos.y}
              r={radius}
              fill={paramColor}
              stroke={highlight ? highlight.color : 'var(--text)'}
              strokeWidth={highlight ? 3 : 1.5}
              style={highlight ? { filter: `drop-shadow(0 0 ${4 + highlight.level * 2}px ${highlight.color})` } : undefined}
            >
              <title>{`${paramName}: ${isDynamics ? fmtSigned(rawV) : rawV}${highlight ? ` · ${emotionName(highlight.emotion)} (${highlight.level})` : ''}`}</title>
            </circle>,
          )
          const pLabelPos = pointOnCircle(CX, CY, R_PARAM + radius + 10, paramAngle)
          label(`pl-${catIndex}-${paramIndex}`, pLabelPos.x, pLabelPos.y, paramName, highlight ? highlight.color : 'var(--muted)', 10)
        })
      })
    })

    links = linkEls
    nodes = nodeEls
    labels = labelEls
  }

  // ─── панель: снимок / динамика ───
  const renderDataPanel = () => {
    if (dynError) {
      return (
        <div
          className="rounded-2xl px-3 py-3"
          style={{ background: 'var(--surface)', border: `1px solid ${ERROR_RED}`, color: ERROR_RED, fontSize: 13 }}
        >
          {dynError}
        </div>
      )
    }
    if (!valueSets) return null
    const norm = valueSets.norm
    const rawV = valueSets.raw

    const sortedParamIndices = (catIndex: number) => {
      const indices = CATEGORIES[catIndex].params.map((_, pi) => pi)
      const normal = indices.filter((pi) => !isInverseParam(catIndex, pi))
      const inverse = indices.filter((pi) => isInverseParam(catIndex, pi))
      return [...normal, ...inverse]
    }

    const paramRow = (catIndex: number, paramIndex: number, pl: number) => {
      const paramName = CATEGORIES[catIndex].params[paramIndex]
      const raw = rawV[catIndex][paramIndex]
      const n = norm[catIndex][paramIndex]
      const hasNote = selectedDate
        ? [selectedDate, ...(isDynamics && effBaseline ? [effBaseline] : [])].some(
            (d) => noteHasText(notePartsFor(paramName, d)),
          )
        : false
      return (
        <div
          key={paramIndex}
          className="flex items-center gap-2 px-3 py-1.5"
          style={{ paddingLeft: pl, borderTop: '1px solid var(--line)' }}
        >
          <span className="flex-1 min-w-0" style={{ fontSize: 12, color: 'var(--text)' }}>
            {paramName}
          </span>
          <span
            className="flex-none"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: valueHex(isDynamics, n) }}
          >
            {isDynamics ? fmtSigned(raw) : raw}
          </span>
          {selectedDate && (
            <button
              onClick={() => openNote(paramName)}
              aria-label={`Заметка: ${paramName}`}
              className="flex-none grid place-items-center rounded-lg"
              style={{ width: 24, height: 24, color: hasNote ? 'var(--accent)' : 'var(--muted)' }}
            >
              <StickyNote size={13} strokeWidth={1.8} />
            </button>
          )}
        </div>
      )
    }

    const viewToggle = (
      <div className="flex items-center gap-1">
        <button
          onClick={() => setDataView('list')}
          className="grid place-items-center rounded-lg"
          style={{ width: 28, height: 28, background: dataView === 'list' ? 'var(--active-bg)' : 'transparent' }}
        >
          <Rows2 size={14} strokeWidth={1.6} style={{ color: dataView === 'list' ? 'var(--accent)' : 'var(--muted)' }} />
        </button>
        <button
          onClick={() => setDataView('columns')}
          className="grid place-items-center rounded-lg"
          style={{ width: 28, height: 28, background: dataView === 'columns' ? 'var(--active-bg)' : 'transparent' }}
        >
          <Columns2 size={14} strokeWidth={1.6} style={{ color: dataView === 'columns' ? 'var(--accent)' : 'var(--muted)' }} />
        </button>
      </div>
    )

    const headerCard = (
      <div className="rounded-2xl p-2 mb-2" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between px-1">
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{graphLabel}</span>
          {viewToggle}
        </div>
      </div>
    )

    if (dataView === 'columns') {
      return (
        <div>
          {headerCard}
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {GROUPS.map((group, gIndex) => {
              const groupAvg = round2(average(group.categories.map((i) => round2(average(norm[i])))))
              const gColor = valueHex(isDynamics, groupAvg)
              return (
                <section
                  key={gIndex}
                  className="flex-none rounded-2xl overflow-hidden"
                  style={{ width: 240, background: 'var(--surface)', border: '1px solid var(--line)' }}
                >
                  <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--line)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: gColor }}>{group.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>ср. {isDynamics ? fmtSigned(groupAvg) : groupAvg}</div>
                  </div>
                  <div className="p-2 space-y-2">
                    {group.categories.map((catIndex) => {
                      const cat = CATEGORIES[catIndex]
                      const catAvg = round2(average(norm[catIndex]))
                      const cColor = valueHex(isDynamics, catAvg)
                      return (
                        <div key={catIndex} className="rounded-xl p-2" style={{ background: 'var(--surface-2)' }}>
                          <div className="flex items-center justify-between gap-2">
                            <span style={{ fontSize: 12, fontWeight: 600, color: cColor }}>{cat.name}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: cColor }}>
                              {isDynamics ? fmtSigned(catAvg) : catAvg}
                            </span>
                          </div>
                          <div className="mt-1 space-y-1">
                            {sortedParamIndices(catIndex).map((paramIndex) =>
                              paramRow(catIndex, paramIndex, 0),
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )
    }

    return (
      <div>
        {headerCard}
        {GROUPS.map((group, gIndex) => {
          const groupOpen = panelGroups.has(gIndex)
          const groupAvg = round2(average(group.categories.map((i) => round2(average(norm[i])))))
          const gColor = valueHex(isDynamics, groupAvg)
          return (
            <section
              key={gIndex}
              className="rounded-2xl mb-2 overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            >
              <button className="w-full flex items-center gap-2 px-3 py-2.5" onClick={() => toggleIn(panelGroups, gIndex, setPanelGroups)}>
                <ChevronDown
                  size={15}
                  strokeWidth={1.8}
                  className="flex-none transition-transform"
                  style={{ color: 'var(--muted)', transform: groupOpen ? 'rotate(180deg)' : 'none' }}
                />
                <span className="flex-1 min-w-0 text-left" style={{ fontSize: 13, fontWeight: 600, color: gColor }}>
                  {group.name}
                </span>
                <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: gColor }}>
                  {isDynamics ? fmtSigned(groupAvg) : groupAvg}
                </span>
              </button>
              {groupOpen &&
                group.categories.map((catIndex) => {
                  const cat = CATEGORIES[catIndex]
                  const catOpen = panelCats.has(catIndex)
                  const catAvg = round2(average(norm[catIndex]))
                  const cColor = valueHex(isDynamics, catAvg)
                  return (
                    <div key={catIndex} style={{ borderTop: '1px solid var(--line)' }}>
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 pl-7"
                        onClick={() => toggleIn(panelCats, catIndex, setPanelCats)}
                      >
                        <ChevronDown
                          size={13}
                          strokeWidth={1.8}
                          className="flex-none transition-transform"
                          style={{ color: 'var(--muted)', transform: catOpen ? 'rotate(180deg)' : 'none' }}
                        />
                        <span className="flex-1 min-w-0 text-left" style={{ fontSize: 12, fontWeight: 500, color: cColor }}>
                          {cat.name}
                        </span>
                        <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: cColor }}>
                          {isDynamics ? fmtSigned(catAvg) : catAvg}
                        </span>
                      </button>
                      {catOpen && sortedParamIndices(catIndex).map((paramIndex) => paramRow(catIndex, paramIndex, 44))}
                    </div>
                  )
                })}
            </section>
          )
        })}
      </div>
    )
  }

  // ─── панель: аналитика (узкие места / места силы) ───
  const renderAnalyticsPanel = () => {
    const snapshot = selectedDate ? snapshots[selectedDate] : null
    if (!snapshot || !valueSets) {
      return (
        <div className="rounded-2xl px-3 py-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)', fontSize: 13, color: 'var(--muted)' }}>
          Выберите дату для аналитики
        </div>
      )
    }
    const items = computeAnalyticsItems(snapshot)
    const isGaps = anView === 'gaps'
    const filtered = items
      .filter((i) => (isGaps ? i.currentNorm >= 0 && i.currentNorm <= 2 : i.currentNorm >= 10 && i.currentNorm <= 12))
      .sort((a, b) => {
        const byNorm = isGaps ? a.currentNorm - b.currentNorm : b.currentNorm - a.currentNorm
        if (byNorm !== 0) return byNorm
        if (a.categoryName !== b.categoryName) return a.categoryName.localeCompare(b.categoryName)
        return a.paramName.localeCompare(b.paramName)
      })
    const norm = valueSets.norm

    const headerCard = (
      <div className="rounded-2xl p-2 mb-2" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="grid grid-cols-2 gap-1 rounded-xl p-1" style={{ background: 'var(--surface-2)' }}>
          {(
            [
              { id: 'gaps', label: 'Узкие места' },
              { id: 'strengths', label: 'Места силы' },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              onClick={() => setAnView(v.id)}
              className="rounded-lg py-1.5 transition-colors"
              style={{
                fontSize: 12,
                fontWeight: 600,
                background: anView === v.id ? 'var(--accent)' : 'transparent',
                color: anView === v.id ? 'var(--on-fill)' : 'var(--muted)',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 px-1 gap-2">
          <span className="flex-none" style={{ fontSize: 11, color: 'var(--muted)' }}>
            {selectedDate ? formatDateRu(selectedDate) : '—'}
          </span>
          <div className="flex items-center gap-2">
            {anPanelView === 'list' && (
              <div className="flex items-center rounded-lg p-0.5" style={{ background: 'var(--surface)' }}>
                {(
                  [
                    { id: 'flat', label: 'Общий список' },
                    { id: 'groups', label: 'По группам' },
                  ] as const
                ).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setAnGroupView(v.id)}
                    className="rounded-md px-2 py-1 transition-colors"
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      background: anGroupView === v.id ? 'var(--active-bg)' : 'transparent',
                      color: anGroupView === v.id ? 'var(--accent)' : 'var(--muted)',
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setAnPanelView('list')}
                className="grid place-items-center rounded-lg"
                style={{ width: 28, height: 28, background: anPanelView === 'list' ? 'var(--active-bg)' : 'transparent' }}
              >
                <Rows2 size={14} strokeWidth={1.6} style={{ color: anPanelView === 'list' ? 'var(--accent)' : 'var(--muted)' }} />
              </button>
              <button
                onClick={() => setAnPanelView('columns')}
                className="grid place-items-center rounded-lg"
                style={{ width: 28, height: 28, background: anPanelView === 'columns' ? 'var(--active-bg)' : 'transparent' }}
              >
                <Columns2 size={14} strokeWidth={1.6} style={{ color: anPanelView === 'columns' ? 'var(--accent)' : 'var(--muted)' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )

    if (filtered.length === 0) {
      return (
        <div>
          {headerCard}
          <div className="rounded-2xl px-3 py-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)', fontSize: 13, color: 'var(--muted)' }}>
            {isGaps ? 'Нет красных параметров (0–2)' : 'Нет фиолетовых параметров (10–12)'}
          </div>
        </div>
      )
    }

    const itemRow = (item: (typeof filtered)[number], indent = 0) => {
      const hasNote = selectedDate ? noteHasText(notePartsFor(item.paramName, selectedDate)) : false
      return (
        <div
          key={`${item.catIndex}-${item.paramIndex}`}
          className="flex items-center gap-2 px-3 py-1.5"
          style={{ paddingLeft: indent, borderTop: '1px solid var(--line)' }}
        >
          <span className="flex-1 min-w-0" style={{ fontSize: 12, color: 'var(--text)' }}>
            {item.paramName}
          </span>
          <span
            className="flex-none"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: valueHex(false, item.currentNorm) }}
          >
            {item.currentRaw}
          </span>
          {selectedDate && (
            <button
              onClick={() => openNote(item.paramName)}
              aria-label={`Заметка: ${item.paramName}`}
              className="flex-none grid place-items-center rounded-lg"
              style={{ width: 24, height: 24, color: hasNote ? 'var(--accent)' : 'var(--muted)' }}
            >
              <StickyNote size={13} strokeWidth={1.8} />
            </button>
          )}
        </div>
      )
    }

    if (anPanelView === 'columns') {
      return (
        <div>
          {headerCard}
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {GROUPS.map((group, gIndex) => {
              const catIndices = group.categories.filter((i) => filtered.some((f) => f.catIndex === i))
              if (!catIndices.length) return null
              const groupAvg = round2(average(catIndices.map((i) => round2(average(norm[i])))))
              const gColor = valueHex(false, groupAvg)
              return (
                <section
                  key={gIndex}
                  className="flex-none rounded-2xl overflow-hidden"
                  style={{ width: 240, background: 'var(--surface)', border: '1px solid var(--line)' }}
                >
                  <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--line)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: gColor }}>{group.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>ср. {groupAvg}</div>
                  </div>
                  <div className="p-2 space-y-2">
                    {catIndices.map((catIndex) => {
                      const cat = CATEGORIES[catIndex]
                      const catItems = filtered.filter((i) => i.catIndex === catIndex)
                      const cColor = valueHex(false, round2(average(norm[catIndex])))
                      return (
                        <div key={catIndex} className="rounded-xl p-2" style={{ background: 'var(--surface-2)' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: cColor }}>{cat.name}</div>
                          <div className="mt-1 space-y-1">{catItems.map((item) => itemRow(item))}</div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )
    }

    if (anGroupView === 'flat') {
      return (
        <div>
          {headerCard}
          <section className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            {filtered.map((item, idx) => {
              const hasNote = selectedDate ? noteHasText(notePartsFor(item.paramName, selectedDate)) : false
              return (
                <div
                  key={`${item.catIndex}-${item.paramIndex}`}
                  className="flex items-center gap-2 px-3 py-1.5"
                  style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--line)' }}
                >
                  <span className="flex-1 min-w-0" style={{ fontSize: 12, color: 'var(--text)' }}>
                    {item.paramName}
                    <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}>{item.categoryName}</span>
                  </span>
                  <span
                    className="flex-none"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: valueHex(false, item.currentNorm) }}
                  >
                    {item.currentRaw}
                  </span>
                  {selectedDate && (
                    <button
                      onClick={() => openNote(item.paramName)}
                      aria-label={`Заметка: ${item.paramName}`}
                      className="flex-none grid place-items-center rounded-lg"
                      style={{ width: 24, height: 24, color: hasNote ? 'var(--accent)' : 'var(--muted)' }}
                    >
                      <StickyNote size={13} strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              )
            })}
          </section>
        </div>
      )
    }

    return (
      <div>
        {headerCard}
        {GROUPS.map((group, gIndex) => {
          const catIndices = group.categories.filter((i) => filtered.some((f) => f.catIndex === i))
          if (!catIndices.length) return null
          const groupOpen = anGroups.has(gIndex)
          const groupAvg = round2(average(catIndices.map((i) => round2(average(norm[i])))))
          const gColor = valueHex(false, groupAvg)
          return (
            <section
              key={gIndex}
              className="rounded-2xl mb-2 overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            >
              <button className="w-full flex items-center gap-2 px-3 py-2.5" onClick={() => toggleIn(anGroups, gIndex, setAnGroups)}>
                <ChevronDown
                  size={15}
                  strokeWidth={1.8}
                  className="flex-none transition-transform"
                  style={{ color: 'var(--muted)', transform: groupOpen ? 'rotate(180deg)' : 'none' }}
                />
                <span className="flex-1 min-w-0 text-left" style={{ fontSize: 13, fontWeight: 600, color: gColor }}>
                  {group.name}
                </span>
                <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: gColor }}>
                  {groupAvg}
                </span>
              </button>
              {groupOpen &&
                catIndices.map((catIndex) => {
                  const cat = CATEGORIES[catIndex]
                  const catOpen = anCats.has(catIndex)
                  const catAvg = round2(average(norm[catIndex]))
                  const cColor = valueHex(false, catAvg)
                  const catItems = filtered.filter((i) => i.catIndex === catIndex)
                  return (
                    <div key={catIndex} style={{ borderTop: '1px solid var(--line)' }}>
                      <button className="w-full flex items-center gap-2 px-3 py-2 pl-7" onClick={() => toggleIn(anCats, catIndex, setAnCats)}>
                        <ChevronDown
                          size={13}
                          strokeWidth={1.8}
                          className="flex-none transition-transform"
                          style={{ color: 'var(--muted)', transform: catOpen ? 'rotate(180deg)' : 'none' }}
                        />
                        <span className="flex-1 min-w-0 text-left" style={{ fontSize: 12, fontWeight: 500, color: cColor }}>
                          {cat.name}
                        </span>
                        <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: cColor }}>
                          {catAvg}
                        </span>
                      </button>
                      {catOpen && catItems.map((item) => itemRow(item, 44))}
                    </div>
                  )
                })}
            </section>
          )
        })}
      </div>
    )
  }

  // ─── панель: эмоции за выбранную дату ───
  const renderEmotionsPanel = () => {
    if (!selectedDate) return null
    const start = new Date(selectedDate + 'T00:00:00').getTime()
    const end = start + 86400000
    const tags = allEmotionTags(notes, listrecs, diary).filter((t) => t.created >= start && t.created < end)
    if (tags.length === 0) return null

    const grouped = tags.reduce<Record<string, EmotionTag[]>>((acc, t) => {
      acc[t.emotion] = acc[t.emotion] || []
      acc[t.emotion].push(t)
      return acc
    }, {})

    return (
      <section className="rounded-2xl mb-3 overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <button
          className="w-full flex items-center gap-2 px-3 py-2.5"
          onClick={() => setEmotionsOpen((o) => !o)}
        >
          <ChevronDown
            size={15}
            strokeWidth={1.8}
            className="flex-none transition-transform"
            style={{ color: 'var(--muted)', transform: emotionsOpen ? 'rotate(180deg)' : 'none' }}
          />
          <span className="flex-1 text-left" style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>
            Эмоции
          </span>
          <span className="flex-none" style={{ fontSize: 12, color: 'var(--muted)' }}>
            {tags.length}
          </span>
        </button>
        {emotionsOpen && (
          <div className="px-3 pb-3 space-y-2" style={{ borderTop: '1px solid var(--line)' }}>
            {Object.entries(grouped).map(([emotion, emotionTags]) => {
              const color = plutchikColor(emotion)
              const maxLevel = Math.max(...emotionTags.map((t) => t.level))
              return (
                <div key={emotion}>
                  <div className="flex items-center gap-2 py-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: color }} />
                    <span className="flex-1" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                      {emotionName(emotion)}
                    </span>
                    <span className="px-1.5 rounded" style={{ background: color, color: '#fff', fontSize: 10, fontWeight: 700 }}>
                      {maxLevel}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 pl-5">
                    {emotionTags.map((t) => (
                      <span
                        key={t.id}
                        className="px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--muted)' }}
                      >
                        {[
                          t.feelings?.[0] ? `${t.feelings[0].name} (${t.feelings[0].level})` : '',
                          t.sensations?.[0] ? `${t.sensations[0].name} (${t.sensations[0].level})` : '',
                        ].filter(Boolean).join(' · ') || `ур.${t.level}`}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    )
  }

  // ─── панель: форма нового снимка ───
  const buildTrackGradient = (inverted: boolean) => {
    const stops: string[] = []
    for (let i = 0; i <= 12; i++) {
      const v = inverted ? 12 - i : i
      const color = valueHex(false, v)
      const start = i === 0 ? 0 : ((i - 0.5) / 12) * 100
      const end = i === 12 ? 100 : ((i + 0.5) / 12) * 100
      stops.push(`${color} ${start.toFixed(2)}%`)
      stops.push(`${color} ${end.toFixed(2)}%`)
    }
    return `linear-gradient(to right, ${stops.join(', ')})`
  }

  const TouchSlider = ({
    value,
    onChange,
    onTouch,
    aria,
    inverted,
    kind = 'quality',
  }: {
    value: number
    onChange: (v: number) => void
    onTouch?: () => void
    aria: string
    inverted?: boolean
    kind?: 'quality' | 'intensity'
  }) => {
    const trackRef = useRef<HTMLDivElement>(null)
    const [dragging, setDragging] = useState(false)
    const normValue = inverted ? 12 - value : value
    const color = valueHex(false, normValue)
    const trackBg = useMemo(() => buildTrackGradient(!!inverted), [inverted])

    const scaleLabels = kind === 'quality'
      ? ['оч. плохо', 'плохо', 'норм', 'хорошо', 'отлично']
      : ['оч. низкий', 'низкий', 'средний', 'высокий', 'оч. высокий']
    const valueLabels = kind === 'quality'
      ? ['очень плохо', 'очень плохо', 'очень плохо', 'плохо', 'плохо', 'плохо', 'нормально', 'хорошо', 'хорошо', 'хорошо', 'отлично', 'отлично', 'отлично']
      : ['очень низкий', 'очень низкий', 'очень низкий', 'низкий', 'низкий', 'низкий', 'средний', 'высокий', 'высокий', 'высокий', 'очень высокий', 'очень высокий', 'очень высокий']
    const currentLabel = valueLabels[Math.max(0, Math.min(12, value))]

    const updateFromClientX = (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect) return
      const ratio = (clientX - rect.left) / rect.width
      const next = Math.max(0, Math.min(12, Math.round(ratio * 12)))
      if (next !== value) {
        onChange(next)
        onTouch?.()
      }
    }

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(true)
      onTouch?.()
      updateFromClientX(e.clientX)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (dragging) updateFromClientX(e.clientX)
    }
    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // capture мог быть уже снят
      }
    }

    return (
      <div className="relative mt-1 mb-2">
        <div className="relative mb-1" style={{ height: 12 }}>
          {[0, 3, 6, 9, 12].map((i, idx) => (
            <span
              key={i}
              className="absolute top-0"
              style={{
                left: `${(i / 12) * 100}%`,
                transform: 'translateX(-50%)',
                fontSize: 8,
                color: 'var(--muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {scaleLabels[idx]}
            </span>
          ))}
        </div>
        <div
          ref={trackRef}
          role="slider"
          aria-label={aria}
          aria-valuemin={0}
          aria-valuemax={12}
          aria-valuenow={value}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative select-none"
          style={{
            height: 22,
            cursor: 'pointer',
            touchAction: 'none',
          }}
        >
          <div
            className="absolute left-0 right-0 overflow-hidden rounded-md"
            style={{
              top: 8,
              bottom: 8,
              background: trackBg,
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              top: 1,
              width: 20,
              height: 20,
              left: `${(value / 12) * 100}%`,
              transform: 'translateX(-50%)',
              background: color,
              border: '3px solid var(--surface)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
            }}
          />
        </div>
        <div className="relative" style={{ height: 14 }}>
          {Array.from({ length: 13 }, (_, i) => {
            const left = (i / 12) * 100
            return (
              <div
                key={i}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: i % 3 === 0 ? 6 : 3,
                    height: i % 3 === 0 ? 6 : 3,
                    background: valueHex(false, inverted ? 12 - i : i),
                    opacity: 0.9,
                  }}
                />
                {i % 3 === 0 && (
                  <span style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
                    {i}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div className="text-right" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
          {currentLabel}
        </div>
      </div>
    )
  }

  const renderAddPanel = () => {
    if (!draft) return null
    return (
      <div>
        <div className="rounded-2xl p-3 mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="flex gap-2">
            <button
              onClick={toggleAddMode}
              className="flex-1 rounded-xl py-2"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}
            >
              Отмена
            </button>
            <button
              onClick={addDate}
              className="flex-1 rounded-xl py-2"
              style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 13, fontWeight: 600 }}
            >
              + Добавить снимок
            </button>
          </div>
        </div>

        {/* категории — сворачиваемые подблоки */}
        {CATEGORIES.map((cat, catIndex) => {
          const open = addOpenCats.has(catIndex)
          const sortedParams = cat.params
            .map((_, pi) => pi)
            .filter((pi) => !isInverseParam(catIndex, pi))
            .concat(cat.params.map((_, pi) => pi).filter((pi) => isInverseParam(catIndex, pi)))
          const allTouched = sortedParams.every((pi) => touchedParams.has(`${catIndex}-${pi}`))
          return (
            <section
              key={catIndex}
              className="rounded-2xl mb-2 overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            >
              <button
                className="w-full flex items-center gap-2 px-3 py-2.5"
                onClick={() =>
                  setAddOpenCats((s) => {
                    const next = new Set(s)
                    if (next.has(catIndex)) next.delete(catIndex)
                    else next.add(catIndex)
                    return next
                  })
                }
              >
                <ChevronDown
                  size={15}
                  strokeWidth={1.8}
                  className="flex-none transition-transform"
                  style={{ color: 'var(--muted)', transform: open ? 'rotate(180deg)' : 'none' }}
                />
                <span className="flex-1 min-w-0 text-left" style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>
                  {cat.name}
                </span>
                {allTouched ? (
                  <Check size={14} strokeWidth={2.5} style={{ color: 'var(--accent)' }} />
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {sortedParams.filter((pi) => touchedParams.has(`${catIndex}-${pi}`)).length}/{sortedParams.length}
                  </span>
                )}
              </button>
              {open &&
                sortedParams.map((paramIndex) => {
                  const paramName = cat.params[paramIndex]
                  const touched = touchedParams.has(`${catIndex}-${paramIndex}`)
                  return (
                    <div
                      key={paramIndex}
                      className="px-3 py-2"
                      style={{ borderTop: '1px solid var(--line)' }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'var(--text)' }}>
                          {paramName}
                          {touched && <Check size={12} strokeWidth={2.5} style={{ color: 'var(--accent)' }} />}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openNote(paramName)}
                            aria-label={`Заметка: ${paramName}`}
                            className="grid place-items-center rounded-lg"
                            style={{
                              width: 24,
                              height: 24,
                              color: noteHasText(normalizeNote(draftNotes[paramName])) ? 'var(--accent)' : 'var(--muted)',
                            }}
                          >
                            <StickyNote size={14} strokeWidth={1.8} />
                          </button>
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: valueHex(false, isInverseParam(catIndex, paramIndex) ? 12 - draft[catIndex][paramIndex] : draft[catIndex][paramIndex]) }}
                          />
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 12,
                              fontWeight: 600,
                              color: valueHex(false, isInverseParam(catIndex, paramIndex) ? 12 - draft[catIndex][paramIndex] : draft[catIndex][paramIndex]),
                            }}
                          >
                            {draft[catIndex][paramIndex]}
                          </span>
                        </div>
                      </div>
                      <TouchSlider
                        value={draft[catIndex][paramIndex]}
                        onChange={(v) =>
                          setDraft((d) => d && d.map((c, ci) => (ci === catIndex ? c.map((x, pi) => (pi === paramIndex ? v : x)) : c)))
                        }
                        onTouch={() =>
                          setTouchedParams((s) => new Set(s).add(`${catIndex}-${paramIndex}`))
                        }
                        aria={paramName}
                        inverted={isInverseParam(catIndex, paramIndex)}
                        kind={isInverseParam(catIndex, paramIndex) ? 'intensity' : 'quality'}
                      />
                    </div>
                  )
                })}
            </section>
          )
        })} 
      </div>
    )
  }

  const iconBtn = (title: string, onClick: () => void, icon: ReactNode) => (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex-none grid place-items-center rounded-xl"
      style={{ width: 36, height: 36, background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--muted)' }}
    >
      {icon}
    </button>
  )

  return (
    <div className="px-4 pt-5 pb-24">
      {/* шапка: выбор даты + действия */}
      <div className="flex items-center gap-2 mb-2">
        <select
          value={selectedDate ?? ''}
          onChange={(e) => selectDate(e.target.value)}
          aria-label="Выбранная дата"
          className="flex-1 min-w-0 rounded-xl px-3 outline-none"
          style={{ height: 36, background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 13 }}
        >
          {dates.length === 0 && <option value="">Нет дат</option>}
          {dates.map((d) => (
            <option key={d} value={d}>
              {formatDateRu(d)}
            </option>
          ))}
        </select>
        {iconBtn(isAdding ? 'Отмена' : 'Добавить', toggleAddMode, <Plus size={16} strokeWidth={1.8} />)}
        {iconBtn('Выгрузить', exportText, <Download size={16} strokeWidth={1.8} />)}
        {iconBtn(allExpanded ? 'Сжать' : 'Развернуть', toggleAll, <ChevronsUpDown size={16} strokeWidth={1.8} />)}
      </div>

      {/* сегмент режимов */}
      <div
        className="grid grid-cols-3 gap-1 rounded-xl p-1 mb-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            role="tab"
            aria-selected={tab === t.id}
            className="rounded-lg py-1.5 transition-colors"
            style={{
              fontSize: 13,
              fontWeight: 600,
              background: tab === t.id ? 'var(--accent)' : 'transparent',
              color: tab === t.id ? 'var(--on-fill)' : 'var(--muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* граф на всю ширину */}
      <section className="rounded-2xl p-2 mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="flex-none" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
            {graphLabel}
          </span>
          {isDynamics && (
            <>
              <span className="flex-none" style={{ fontSize: 12, color: 'var(--muted)' }}>
                от
              </span>
              <select
                value={effBaseline ?? ''}
                onChange={(e) => e.target.value && setBaseline(e.target.value)}
                disabled={!validBaselines.length}
                aria-label="Базовая дата"
                className="flex-1 min-w-0 rounded-lg px-2 py-1 outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 12 }}
              >
                {!validBaselines.length && <option value="">Нет дат</option>}
                {validBaselines.map((d) => (
                  <option key={d} value={d}>
                    {formatDateRu(d)}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        <svg viewBox="0 0 800 800" preserveAspectRatio="xMidYMid meet" className="w-full h-auto block">
          <g>{links}</g>
          <g>{nodes}</g>
          <g>{labels}</g>
        </svg>
        <div
          className="text-center py-1"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--light)' }}
        >
          {centerText}
        </div>
      </section>

      {/* панель эмоций */}
      {renderEmotionsPanel()}

      {/* панель под графом */}
      {isAdding ? renderAddPanel() : tab === 'analytics' ? renderAnalyticsPanel() : renderDataPanel()}

      {/* заметка пункта: редактирование + история по всем снимкам */}
      {noteParam && (
        <ParamNoteSheet
          paramName={noteParam}
          date={noteSheetDate}
          dates={noteSheetDates}
          note={isAdding ? normalizeNote(draftNotes[noteParam]) : notePartsFor(noteParam, noteSheetDate)}
          history={noteHistory(noteParam)}
          onSave={(part, text) => saveSheetNote(noteParam, part, text)}
          onPickDate={(d) => setNoteDate(d)}
          onClose={closeNote}
        />
      )}
    </div>
  )
}
