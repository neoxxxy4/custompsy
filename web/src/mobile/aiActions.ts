import { readLS, writeLS } from '../lib/sync'
import { todayKey, uid, type ListRecord, type Note, type Task } from '../views/practice/store'
import { BELIEF_CATEGORIES } from './beliefsData'

// действия, которые ИИ вставляет в ответ блоками [ACTION]{json}[/ACTION]

export interface AiActionResult {
  ok: boolean
  text: string
}

const clamp12 = (v: unknown) => Math.max(0, Math.min(12, Math.round(Number(v) || 0)))
const cut = (s: string, n = 60) => (s.length > n ? s.slice(0, n) + '…' : s)

const PSYSOC_EMO = ['trauma', 'offense', 'shame', 'guilt', 'fear', 'anger'] as const
const EMO_RU: Record<string, string> = {
  trauma: 'травма', offense: 'обида', shame: 'стыд', guilt: 'вина', fear: 'страх', anger: 'гнев', other: 'другое',
}

interface PsyPerson {
  id: string
  name: string
  situations: { id: string; text: string; emo: string; sign: number }[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exec(a: any): AiActionResult {
  if (!a || typeof a !== 'object' || typeof a.type !== 'string') return { ok: false, text: 'пустое действие' }
  switch (a.type) {
    case 'add_task': {
      const text = String(a.text ?? '').trim()
      if (!text) return { ok: false, text: 'задача без текста' }
      const key = `aod4-tasks-${todayKey()}`
      const tasks = readLS<Task[]>(key, [])
      writeLS(key, [...tasks, { id: uid(), text, done: false }])
      return { ok: true, text: `задача на сегодня: «${cut(text)}»` }
    }
    case 'add_therapy_note': {
      const text = String(a.text ?? '').trim()
      if (!text) return { ok: false, text: 'запись без текста' }
      const category = EMO_RU[a.category] ? a.category : 'other'
      const notes = readLS<unknown[]>('aod4-therapy-notes', [])
      writeLS('aod4-therapy-notes', [{ id: uid(), text, category, ts: Date.now() }, ...notes])
      return { ok: true, text: `запись в Терапию (${EMO_RU[category]}): «${cut(text)}»` }
    }
    case 'add_note': {
      const title = String(a.title ?? '').trim() || 'Заметка от ИИ'
      const body = String(a.body ?? '')
      const notes = readLS<Note[]>('aod4-notes', [])
      writeLS('aod4-notes', [{ id: uid(), folderId: 'inbox', title, body, updated: Date.now() }, ...notes])
      return { ok: true, text: `заметка: «${cut(title)}»` }
    }
    case 'add_listrec': {
      const title = String(a.title ?? '').trim() || (a.kind === 'list' ? 'Список' : 'Чек-лист')
      const kind = a.kind === 'list' ? 'list' : 'checklist'
      const items: unknown[] = Array.isArray(a.items) ? a.items : []
      const recs = readLS<ListRecord[]>('aod4-listrecs', [])
      const rec: ListRecord = {
        id: uid(),
        kind,
        title,
        items: items.map((t) => ({ id: uid(), text: String(t).trim(), done: false })).filter((i) => i.text),
        folderId: 'inbox',
        updated: Date.now(),
      }
      writeLS('aod4-listrecs', [rec, ...recs])
      return { ok: true, text: `${kind === 'list' ? 'список' : 'чек-лист'} «${cut(title)}» (${rec.items.length} пунктов)` }
    }
    case 'add_psysoc_person': {
      const name = String(a.name ?? '').trim()
      if (!name) return { ok: false, text: 'человек без имени' }
      const people = readLS<PsyPerson[]>('aod4-psysoc-v1', [])
      if (people.some((p) => p.name.toLowerCase() === name.toLowerCase()))
        return { ok: false, text: `«${cut(name)}» уже есть в Социуме` }
      writeLS('aod4-psysoc-v1', [...people, { id: uid(), name, situations: [] }])
      return { ok: true, text: `человек в Социум: «${cut(name)}»` }
    }
    case 'add_psysoc_situation': {
      const personName = String(a.person ?? '').trim()
      const text = String(a.text ?? '').trim()
      if (!personName || !text) return { ok: false, text: 'ситуация: нужны person и text' }
      const emo = (PSYSOC_EMO as readonly string[]).includes(a.emo) ? a.emo : 'other'
      const sign = clamp12(a.sign)
      const people = readLS<PsyPerson[]>('aod4-psysoc-v1', [])
      let person = people.find((p) => p.name.toLowerCase() === personName.toLowerCase())
        ?? people.find((p) => p.name.toLowerCase().includes(personName.toLowerCase()))
      let next: PsyPerson[]
      if (!person) {
        person = { id: uid(), name: personName, situations: [] }
        next = [...people, person]
      } else {
        next = people.map((p) => (p.id === person!.id ? person! : p))
      }
      next = next.map((p) =>
        p.id === person!.id ? { ...p, situations: [...p.situations, { id: uid(), text, emo, sign }] } : p,
      )
      writeLS('aod4-psysoc-v1', next)
      return { ok: true, text: `ситуация для «${person.name}» (${EMO_RU[emo]} ${sign}/12): «${cut(text)}»` }
    }
    case 'set_belief': {
      const match = String(a.match ?? '').trim().toLowerCase()
      if (!match) return { ok: false, text: 'set_belief без match' }
      let found: { id: string; text: string } | null = null
      BELIEF_CATEGORIES.forEach((cat, ci) =>
        cat.beliefs.forEach((b, bi) => {
          if (!found && b.text.toLowerCase().includes(match)) found = { id: `b${ci}-${bi}`, text: b.text }
        }),
      )
      if (!found) return { ok: false, text: `убеждение «${cut(match, 30)}» не найдено` }
      const strength = clamp12(a.strength)
      const strengths = { ...readLS<Record<string, number>>('aod4-beliefs-v1', {}) }
      if (strength > 0) strengths[found.id] = strength
      else delete strengths[found.id]
      writeLS('aod4-beliefs-v1', strengths)
      return { ok: true, text: `убеждение «${cut(found.text, 40)}» → сила ${strength}/12` }
    }
    case 'set_path_pct': {
      const pct = Math.max(0, Math.min(100, Math.round(Number(a.pct) || 0)))
      writeLS('aod4-path-pct', pct)
      return { ok: true, text: `шкала ненормальности → ${pct}%` }
    }
    default:
      return { ok: false, text: `неизвестное действие: ${a.type}` }
  }
}

// вытащить действия из ответа ИИ, выполнить их и вернуть чистый текст + результаты
export function runAiActions(reply: string): { clean: string; results: AiActionResult[] } {
  const results: AiActionResult[] = []
  const clean = reply
    .replace(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/g, (_, json) => {
        let r: AiActionResult
        try {
          r = exec(JSON.parse(json))
        } catch {
          r = { ok: false, text: 'не смог разобрать действие (битый JSON)' }
        }
        results.push(r)
        return ''
      })
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  return { clean, results }
}
