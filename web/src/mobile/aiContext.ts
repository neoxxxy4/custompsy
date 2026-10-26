import { readLS } from '../lib/sync'
import { WD } from '../lib/dayStats'
import { CATEGORIES, isInverseParam, round2 } from './mapLogic'
import { BELIEF_CATEGORIES } from './beliefsData'
import { emotionName, seedDayBlocks, seedTodayData, todayKey, type BlockDef, type BlockTemplate, type Diary, type EmotionTag, type ListRecord, type Note, type Task, type TodayData } from '../views/practice/store'

// компактная сводка данных всех инструментов для ИИ-чата.
// Цель — дать контекст, а не свалку: топ-N + усечение текстов, лимит на всё ~4000 символов.

const cut = (s: string, n = 80) => {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

const EMO_LABELS: Record<string, string> = {
  trauma: 'травма', offense: 'обида', shame: 'стыд', guilt: 'вина', fear: 'страх', anger: 'гнев', other: 'другое',
}

function selfmapSection(): string | null {
  const stored = readLS<{ snapshots?: Record<string, number[][]>; paramNotes?: Record<string, Record<string, { general?: string } | string>> }>('aod4-selfmap-v1', {})
  const snapshots = stored.snapshots ?? {}
  const dates = Object.keys(snapshots).sort()
  const date = dates[dates.length - 1]
  if (!date) return null
  const snap = snapshots[date]
  const lines: string[] = [`снимок от ${date} (шкала 0-12, выше = лучше)`]
  const catAvgs: string[] = []
  const weak: { name: string; norm: number }[] = []
  CATEGORIES.forEach((cat, ci) => {
    const norms = cat.params.map((_, pi) => {
      const raw = snap[ci]?.[pi] ?? 0
      return isInverseParam(ci, pi) ? 12 - raw : raw
    })
    catAvgs.push(`${cat.name} ${round2(norms.reduce((a, x) => a + x, 0) / norms.length)}`)
    cat.params.forEach((name, pi) => weak.push({ name, norm: norms[pi] }))
  })
  lines.push(`средние: ${catAvgs.join(', ')}`)
  weak.sort((a, b) => a.norm - b.norm)
  lines.push(`самые слабые пункты: ${weak.slice(0, 5).map((w) => `${w.name} ${w.norm}`).join('; ')}`)
  const pn = stored.paramNotes ?? {}
  const noted = Object.entries(pn)
    .map(([param, byDate]) => {
      const d = Object.keys(byDate).sort().pop()!
      const v = byDate[d]
      const text = typeof v === 'string' ? v : (v.general ?? '')
      return text.trim() ? `${param}: «${cut(text, 100)}»` : null
    })
    .filter(Boolean)
    .slice(0, 3)
  if (noted.length) lines.push(`заметки: ${noted.join(' | ')}`)
  return `[Самооценка] ${lines.join('. ')}`
}

function beliefsSection(): string | null {
  const strengths = readLS<Record<string, number>>('aod4-beliefs-v1', {})
  const items = Object.entries(strengths)
    .map(([id, s]) => {
      const m = id.match(/^b(\d+)-(\d+)$/)
      if (!m || !s) return null
      const cat = BELIEF_CATEGORIES[Number(m[1])]
      const belief = cat?.beliefs[Number(m[2])]
      return belief ? { text: belief.text, s, cat: cat.name } : null
    })
    .filter((x): x is { text: string; s: number; cat: string } => !!x)
    .sort((a, b) => b.s - a.s)
  if (!items.length) return null
  const top = items.slice(0, 8).map((i) => `«${cut(i.text, 60)}» (${i.cat}, сила ${i.s}/12)`)
  return `[Убеждения] сила 0-12, выше = хуже. Самые сильные: ${top.join('; ')}`
}

interface PsySituation { text: string; emo: string; sign: number }
interface PsyPerson { name: string; situations: PsySituation[] }

function psysocSection(): string | null {
  const people = readLS<PsyPerson[]>('aod4-psysoc-v1', [])
  if (!people.length) return null
  const withW = people
    .map((p) => {
      const w = p.situations.reduce((a, s) => a + s.sign, 0)
      let bestEmo = ''
      let bestSum = 0
      for (const [id, label] of Object.entries(EMO_LABELS)) {
        const sum = p.situations.filter((s) => s.emo === id).reduce((a, s) => a + s.sign, 0)
        if (sum > bestSum) { bestSum = sum; bestEmo = label }
      }
      return { p, w, bestEmo }
    })
    .sort((a, b) => b.w - a.w)
  const items = withW.slice(0, 5).map(({ p, w, bestEmo }) => {
    const sits = [...p.situations].sort((a, b) => b.sign - a.sign).slice(0, 2)
      .map((s) => `«${cut(s.text, 50)}» (${EMO_LABELS[s.emo] ?? s.emo} ${s.sign})`)
    return `${p.name} — вес ${w}${bestEmo ? `, доминирует ${bestEmo}` : ''}${sits.length ? `: ${sits.join(', ')}` : ''}`
  })
  return `[Социум — психологические влияния] вес = сумма значимостей ситуаций, выше = сильнее дестабилизирует. ${items.join('. ')}`
}

const LAYER_LABELS: Record<string, string> = {
  core: 'Ядро', close: 'Близкие', friends: 'Друзья', mates: 'Товарищи', known: 'Знакомые', contacts: 'Контакты', crowd: 'Толпа',
}

function socialSection(): string | null {
  const people = readLS<{ name: string; layer: string }[]>('aod4-social-people', [])
  if (!people.length) return null
  const byLayer = new Map<string, string[]>()
  for (const p of people) byLayer.set(p.layer, [...(byLayer.get(p.layer) ?? []), p.name])
  const parts: string[] = []
  for (const layer of ['core', 'close']) {
    const names = byLayer.get(layer) ?? []
    if (names.length) parts.push(`${LAYER_LABELS[layer]}: ${names.slice(0, 8).join(', ')}`)
  }
  for (const layer of ['friends', 'mates', 'known', 'contacts', 'crowd']) {
    const n = byLayer.get(layer)?.length ?? 0
    if (n) parts.push(`${LAYER_LABELS[layer]}: ${n} чел.`)
  }
  return parts.length ? `[Социум IQ — круги общения] ${parts.join('; ')}` : null
}

function therapySection(): string | null {
  const notes = readLS<{ text: string; category: string; ts: number }[]>('aod4-therapy-notes', [])
  if (!notes.length) return null
  const items = notes.slice(0, 8).map((n) => `[${EMO_LABELS[n.category] ?? n.category}] «${cut(n.text, 70)}»`)
  return `[Терапия — записи] последние: ${items.join('; ')}`
}

function emotionsSection(): string | null {
  const notes = readLS<Note[]>('aod4-notes', [])
  const listrecs = readLS<ListRecord[]>('aod4-listrecs', [])
  const diary = readLS<Diary>('aod4-diary', {})
  const tags: { emo: string; when: number }[] = []
  const collect = (emotions?: EmotionTag[], when?: number) => {
    emotions?.forEach((t) => tags.push({ emo: emotionName(t.emotion), when: t.created || when || 0 }))
  }
  notes.forEach((n) => collect(n.emotions, n.updated))
  listrecs.forEach((l) => collect(l.emotions, l.updated))
  Object.values(diary).forEach((d) => collect(d.emotions, d.updated))
  tags.sort((a, b) => b.when - a.when)
  const parts: string[] = []
  if (tags.length) parts.push(`последние отметки: ${tags.slice(0, 6).map((t) => t.emo).join(', ')}`)
  const diaryDates = Object.keys(diary).sort().slice(-4)
  diaryDates.forEach((d) => {
    const e = diary[d]
    if (e?.text?.trim()) parts.push(`${d}: «${cut(e.text, 70)}»${e.focus ? ` (фокус ${e.focus})` : ''}`)
  })
  return parts.length ? `[Эмоции и дневник] ${parts.join('. ')}` : null
}

function todaySection(): string | null {
  const today = todayKey()
  const data = readLS<TodayData>(`aod4-today-data-${today}`, {})
  const tasks = readLS<Task[]>(`aod4-tasks-${today}`, [])
  let done = 0
  let total = 0
  const undone: string[] = []
  Object.values(data).forEach((block) => {
    block.items?.forEach((i) => {
      total++
      if (i.done) done++
      else if (undone.length < 8) undone.push(cut(i.text, 40))
    })
  })
  tasks.forEach((t) => {
    total++
    if (t.done) done++
    else if (undone.length < 8) undone.push(cut(t.text, 40))
  })
  if (!total) return null
  return `[День сегодня] выполнено ${done}/${total}${undone.length ? `. Не сделано: ${undone.map((u) => `«${u}»`).join(', ')}` : ''}`
}

function notesSection(): string | null {
  const notes = readLS<Note[]>('aod4-notes', [])
  if (!notes.length) return null
  const recent = [...notes].sort((a, b) => b.updated - a.updated).slice(0, 5)
  return `[Заметки] последние: ${recent.map((n) => `«${cut(n.title || n.body, 50)}»`).join(', ')}`
}

function pathSection(): string | null {
  const pct = readLS<number>('aod4-path-pct', 0)
  const level = readLS<number>('aod4-path-level', 0)
  if (!pct && !level) return null
  return `[Путь] текущая «ненормальность» ${pct}% (цель пользователя — снижать до 0), уровень прокачки ${level}`
}

export function buildAiContext(): string {
  const sections = [
    pathSection(),
    selfmapSection(),
    beliefsSection(),
    psysocSection(),
    socialSection(),
    therapySection(),
    emotionsSection(),
    todaySection(),
    notesSection(),
  ].filter(Boolean) as string[]
  if (!sections.length) return ''
  const full = sections.join('\n')
  return full.length > 4000 ? full.slice(0, 4000) + '…' : full
}

// контекст для чата дня: блоки сегодняшнего дня + путь (своя, узкая сводка)
export function buildDayContext(): string {
  const today = todayKey()
  // если день ещё не редактировали, ключей в LS нет — берём те же дефолты, что видит экран
  const data = readLS<TodayData | null>(`aod4-today-data-${today}`, null) ?? seedTodayData(today, WD[new Date().getDay()])
  const defs = readLS<BlockDef[] | null>(`aod4-today-blocks-${today}`, null) ?? seedDayBlocks()
  const parts: string[] = []
  if (data) {
    for (const def of defs) {
      const block = data[def.id]
      if (!block) continue
      const items = block.items ?? []
      const done = items.filter((i) => i.done)
      const undone = items.filter((i) => !i.done)
      let line = `${def.title || 'без названия'}: ${done.length}/${items.length} выполнено`
      if (done.length) line += `, сделано: ${done.slice(0, 8).map((i) => `«${cut(i.text, 30)}»`).join(', ')}`
      if (undone.length) line += `, осталось: ${undone.slice(0, 8).map((i) => `«${cut(i.time ? `${i.time} ${i.text}` : i.text, 30)}»`).join(', ')}`
      for (const l of block.lists ?? []) {
        const li = l.items ?? []
        line += ` | ${l.title || 'список'}: ${li.filter((i) => i.done).length}/${li.length}`
      }
      parts.push(line)
    }
  }
  const templates = readLS<BlockTemplate[]>('aod4-block-templates', [])
  if (templates.length) {
    parts.push(`сохранённые блоки (можно добавить в день): ${templates.slice(0, 15).map((t) => `«${t.title || 'без названия'}»`).join(', ')}`)
  }
  const path = pathSection()
  if (path) parts.push(path)
  if (!parts.length) return ''
  const full = `[День сегодня — что запланировано и что сделано] ${parts.join('. ')}`
  return full.length > 2500 ? full.slice(0, 2500) + '…' : full
}
