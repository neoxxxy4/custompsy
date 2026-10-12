// Чистые функции «Карты самооценки»: геометрия радиального графа,
// цвета узлов, нормализация инверсных параметров, аналитика и выгрузка.
import raw from '../data/selfAssessment'

export interface Category {
  name: string
  params: string[]
}
export interface Group {
  name: string
  categories: number[]
}
export type Snapshot = number[][]
export type Snapshots = Record<string, Snapshot>
export type MapTab = 'snapshot' | 'dynamics' | 'analytics'

interface RawData {
  categories: Category[]
  groups: Group[]
  inverseParams: string[]
  optimalSnapshot: Snapshot
  snapshots: Snapshots
}

export const DATA = raw as unknown as RawData
export const CATEGORIES = DATA.categories
export const GROUPS = DATA.groups
export const OPTIMAL = DATA.optimalSnapshot
const INVERSE = new Set(DATA.inverseParams)

// ─── геометрия графа (как в оригинале) ───
export const VIEWBOX = 800
export const CX = VIEWBOX / 2
export const CY = VIEWBOX / 2
export const R_GROUP = 150
export const R_CATEGORY = 290
export const R_PARAM = 370
export const ROTATION = -Math.PI / 4

export const pointOnCircle = (cx: number, cy: number, radius: number, angle: number) => ({
  x: cx + radius * Math.cos(angle),
  y: cy + radius * Math.sin(angle),
})

export const average = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
export const round2 = (n: number) => Math.round(n * 10) / 10
export const fmtSigned = (n: number) => `${n > 0 ? '+' : ''}${round2(n)}`

export function formatDateRu(isoDate: string) {
  const [y, m, d] = isoDate.split('-')
  return `${d}.${m}.${y}`
}

export function wrapText(text: string, maxChars = 22): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (candidate.length <= maxChars) {
      line = candidate
    } else {
      if (line) lines.push(line)
      line = word.length > maxChars ? word.slice(0, maxChars) + '…' : word
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : [text]
}

// ─── значения ───
export const isInverseParam = (catIndex: number, paramIndex: number) =>
  INVERSE.has(CATEGORIES[catIndex].params[paramIndex])

export function dynamicsError(
  snapshots: Snapshots,
  selectedDate: string | null,
  baselineDate: string | null,
): string | null {
  if (!baselineDate || !snapshots[baselineDate]) return 'Выберите базовую дату для сравнения'
  if (!selectedDate || !snapshots[selectedDate]) return 'Выберите дату для сравнения'
  if (baselineDate >= selectedDate) return 'Базовая дата должна быть раньше сравниваемой'
  return null
}

// значения для графа и панели: raw — исходные (в динамике — разница с базовой датой),
// norm — нормализованные (инверсные параметры перевёрнуты; в динамике у инверсных
// меняется знак разницы). null — снимка нет или пара дат динамики невалидна.
export function computeValueSets(
  snapshots: Snapshots,
  tab: MapTab,
  selectedDate: string | null,
  baselineDate: string | null,
): { raw: Snapshot; norm: Snapshot } | null {
  const cur = selectedDate ? snapshots[selectedDate] : null
  if (!cur) return null
  if (tab === 'dynamics') {
    if (dynamicsError(snapshots, selectedDate, baselineDate) || !baselineDate) return null
    const prev = snapshots[baselineDate]
    const rawDiff = CATEGORIES.map((c, ci) => c.params.map((_, pi) => cur[ci][pi] - prev[ci][pi]))
    const norm = rawDiff.map((cat, ci) => cat.map((v, pi) => (isInverseParam(ci, pi) ? -v : v)))
    return { raw: rawDiff, norm }
  }
  // снимок и аналитика рисуются одинаково
  const norm = CATEGORIES.map((c, ci) => c.params.map((_, pi) => (isInverseParam(ci, pi) ? 12 - cur[ci][pi] : cur[ci][pi])))
  return { raw: cur, norm }
}

export const emptyValues = (): Snapshot => CATEGORIES.map((c) => c.params.map(() => 0))
export const mediumValues = (): Snapshot => CATEGORIES.map((c) => c.params.map(() => 6))
export const copyValues = (v: Snapshot): Snapshot => v.map((cat) => cat.slice())

// ─── цвета (семантические, общие для обеих тем) ───
export const rainbowColor = (value: number) => {
  const t = Math.max(0, Math.min(1, value / 12))
  return `hsl(${t * 280}, 80%, 55%)`
}

// динамика: ухудшение → красный, 0 → жёлтый, улучшение → фиолетово-синий
export const rainbowColorSigned = (value: number) => {
  const v = Math.max(-12, Math.min(12, value))
  if (v < 0) {
    const t = Math.abs(v) / 12
    return `hsl(${50 * (1 - t)}, 85%, 55%)`
  }
  return `hsl(${50 + (v / 12) * 230}, 80%, 55%)`
}

export const radiusForValue = (isDynamics: boolean, value: number, isCenter = false) =>
  isDynamics
    ? isCenter
      ? 28 + Math.min(Math.abs(value), 12) * 1.1
      : 6 + Math.min(Math.abs(value), 12) * 1.4
    : isCenter
      ? 32 + Math.min(value, 12) * 1.1
      : 7 + Math.min(value, 12) * 1.3

// цветовая индикация значений 0–12: унифицированные цвета по диапазонам
const RED = '#ef4444'
const YELLOW = '#eab308'
const GREEN = '#22c55e'
const BLUE = '#3b82f6'
const PURPLE = '#a855f7'

function rangeColor(value: number): string {
  const v = Math.max(0, Math.min(12, Math.round(value)))
  if (v <= 2) return RED
  if (v <= 5) return YELLOW
  if (v === 6) return GREEN
  if (v <= 9) return BLUE
  return PURPLE
}

export const ERROR_RED = RED

export function valueHex(isDynamics: boolean, value: number): string {
  if (isDynamics) return value >= 0 ? GREEN : RED
  return rangeColor(value)
}

// ─── аналитика: отклонение от оптимального снимка ───
export interface AnalyticsItem {
  catIndex: number
  paramIndex: number
  paramName: string
  categoryName: string
  currentRaw: number
  optimalRaw: number
  currentNorm: number
  optimalNorm: number
  diff: number
}

export function findParamIndex(paramName: string): { catIndex: number; paramIndex: number } | null {
  for (let ci = 0; ci < CATEGORIES.length; ci++) {
    const pi = CATEGORIES[ci].params.indexOf(paramName)
    if (pi >= 0) return { catIndex: ci, paramIndex: pi }
  }
  return null
}

export function computeAnalyticsItems(snapshot: Snapshot): AnalyticsItem[] {
  const items: AnalyticsItem[] = []
  CATEGORIES.forEach((cat, catIndex) => {
    cat.params.forEach((paramName, paramIndex) => {
      const currentRaw = snapshot[catIndex][paramIndex]
      const optimalRaw = OPTIMAL[catIndex][paramIndex]
      const inverse = isInverseParam(catIndex, paramIndex)
      const currentNorm = inverse ? 12 - currentRaw : currentRaw
      const optimalNorm = inverse ? 12 - optimalRaw : optimalRaw
      items.push({
        catIndex,
        paramIndex,
        paramName,
        categoryName: cat.name,
        currentRaw,
        optimalRaw,
        currentNorm,
        optimalNorm,
        diff: Math.round((currentNorm - optimalNorm) * 10) / 10,
      })
    })
  })
  return items
}

// ─── выгрузка снимка в .txt ───
export function buildExportText(date: string, values: Snapshot): string {
  const lines: string[] = [formatDateRu(date), '']
  CATEGORIES.forEach((cat, catIndex) => {
    lines.push(`${catIndex + 1}. ${cat.name}`, '')
    cat.params.forEach((param, paramIndex) => {
      lines.push(`${param} ${values[catIndex][paramIndex]}`)
    })
    lines.push('')
  })
  return lines.join('\n')
}
