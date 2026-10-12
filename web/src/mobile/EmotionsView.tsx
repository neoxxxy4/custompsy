import { useMemo, useState } from 'react'
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  ListChecks,
  ListOrdered,
  Plus,
} from 'lucide-react'
import {
  allEmotionTags,
  EMOTION_WHEEL,
  emotionName,
  emotionRecords,
  plutchikColor,
  PLUTCHIK_EMOTIONS,
  todayKey,
  type Diary,
  type DiaryEntry,
  type EmotionRecordSource,
  type EmotionTag,
  type ListRecord,
  type Note,
  useLS,
} from '../views/practice/store'
import EmotionTagSheet, { type SheetState } from './EmotionTagSheet'
import { fmtWhen } from './utils'

const EMPTY_TAG: Partial<EmotionTag> = {
  emotion: 'joy',
  level: 1,
  feelings: [],
  sensations: [],
}

type PeriodView = 'day' | 'week' | 'month'

interface EmotionPeriod {
  view: PeriodView
  date: string
}

const todayIso = () => new Date().toISOString().slice(0, 10)

const periodBounds = (view: PeriodView, isoDate: string): { start: number; end: number; label: string } => {
  const base = new Date(isoDate + 'T00:00:00')
  if (view === 'day') {
    return { start: base.getTime(), end: base.getTime() + 86400000, label: isoDate }
  }
  if (view === 'week') {
    const dow = (base.getDay() + 6) % 7
    const monday = new Date(base)
    monday.setDate(base.getDate() - dow)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 7)
    return { start: monday.getTime(), end: sunday.getTime(), label: `${fmtIso(monday)} — ${fmtIso(new Date(sunday.getTime() - 1))}` }
  }
  const first = new Date(base.getFullYear(), base.getMonth(), 1)
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 1)
  return { start: first.getTime(), end: last.getTime(), label: `${fmtIso(first)} — ${fmtIso(new Date(last.getTime() - 1))}` }
}

const fmtIso = (d: Date) => d.toISOString().slice(0, 10)
const fmtDateRu = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}
const shiftDate = (iso: string, days: number) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return fmtIso(d)
}
const shiftMonth = (iso: string, months: number) => {
  const d = new Date(iso + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return fmtIso(d)
}

export default function EmotionsView() {
  const [topTab, setTopTab] = useState<'diary' | 'therapy' | 'overlay'>('diary')
  const [sheet, setSheet] = useState<SheetState>({ open: false, mode: 'create' })
  const [notes, setNotes] = useLS<Note[]>('aod2-notes', [])
  const [listrecs, setListrecs] = useLS<ListRecord[]>('aod2-listrecs', [])
  const [diary, setDiary] = useLS<Diary>('aod2-diary', {})
  const [period, setPeriod] = useLS<EmotionPeriod>('aod2-emotions-period', { view: 'day', date: todayIso() })

  const allTags = useMemo(() => allEmotionTags(notes, listrecs, diary), [notes, listrecs, diary])
  const recordsWithEmotions = useMemo(() => emotionRecords(notes, listrecs, diary), [notes, listrecs, diary])

  const bounds = useMemo(() => periodBounds(period.view, period.date), [period])
  const periodTags = useMemo(
    () => allTags.filter((t) => t.created >= bounds.start && t.created < bounds.end),
    [allTags, bounds],
  )
  const periodRecords = useMemo(
    () => recordsWithEmotions.filter((r) => r.tags.some((t) => t.created >= bounds.start && t.created < bounds.end)),
    [recordsWithEmotions, bounds],
  )

  const openCreate = (initial?: Partial<EmotionTag>, sourceType?: EmotionRecordSource, sourceId?: string) => {
    setSheet({
      open: true,
      mode: 'create',
      initial: { ...EMPTY_TAG, ...initial },
      sourceType,
      sourceId,
    })
  }

  const openEdit = (sourceType: EmotionRecordSource, sourceId: string, tag: EmotionTag) => {
    setSheet({
      open: true,
      mode: 'edit',
      initial: { ...tag },
      sourceType,
      sourceId,
      tagId: tag.id,
    })
  }

  const saveTag = (
    tag: EmotionTag,
    sourceType: EmotionRecordSource | undefined,
    sourceId: string | undefined,
    mode: SheetState['mode'],
    oldTagId?: string,
  ) => {
    const targetType = sourceType ?? 'diary'
    const targetId = sourceId ?? todayKey()

    const attach = (existing: EmotionTag[] = []): EmotionTag[] => {
      if (mode === 'edit' && oldTagId) {
        return existing.map((t) => (t.id === oldTagId ? tag : t))
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

  const deleteTag = (sourceType: EmotionRecordSource, sourceId: string, tagId: string) => {
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

  return (
    <div className="px-4 pt-5 pb-24 min-h-screen">
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-1 pb-3" style={{ background: 'color-mix(in srgb, var(--bg) 85%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
          Эмоции
        </h1>

        <div
          className="grid grid-cols-3 gap-1 rounded-xl p-1 mt-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          {([
            { id: 'diary', label: 'Дневник' },
            { id: 'therapy', label: 'Терапия' },
            { id: 'overlay', label: 'Самооценка' },
          ] as const).map((v) => (
            <button
              key={v.id}
              onClick={() => setTopTab(v.id)}
              className="rounded-lg py-1.5 transition-colors"
              style={{
                fontSize: 13,
                fontWeight: 600,
                background: topTab === v.id ? 'var(--accent)' : 'transparent',
                color: topTab === v.id ? 'var(--on-fill)' : 'var(--muted)',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {topTab === 'diary' && (
        <>
          <div className="flex justify-end mt-3 mb-3">
            <button
              onClick={() => {
                const dk = todayKey()
                setDiary((d) => {
                  if (d[dk]) return d
                  return { ...d, [dk]: { text: '', emotion: '', focus: 5, updated: Date.now() } }
                })
                openCreate(undefined, 'diary', dk)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: 'var(--accent)', color: 'var(--on-fill)', fontSize: 12, fontWeight: 600 }}
            >
              <Plus size={14} strokeWidth={2} /> запись эмоции
            </button>
          </div>

          <div
            className="grid grid-cols-3 gap-1 rounded-xl p-1"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
          >
            {([
              { id: 'day', label: 'День' },
              { id: 'week', label: 'Неделя' },
              { id: 'month', label: 'Месяц' },
            ] as const).map((v) => (
              <button
                key={v.id}
                onClick={() => setPeriod((p) => ({ ...p, view: v.id }))}
                className="rounded-lg py-1.5 transition-colors"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  background: period.view === v.id ? 'var(--accent)' : 'transparent',
                  color: period.view === v.id ? 'var(--on-fill)' : 'var(--muted)',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() =>
                setPeriod((p) => ({
                  ...p,
                  date:
                    p.view === 'month'
                      ? shiftMonth(p.date, -1)
                      : shiftDate(p.date, p.view === 'week' ? -7 : -1),
                }))
              }
              className="p-1.5 rounded-lg"
              style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--muted)' }}
            >
              <ChevronLeft size={16} strokeWidth={1.8} />
            </button>
            <span className="flex-1 text-center" style={{ fontSize: 13, fontWeight: 500, color: 'var(--light)' }}>
              {period.view === 'day' ? fmtDateRu(period.date) : bounds.label}
            </span>
            <button
              onClick={() =>
                setPeriod((p) => ({
                  ...p,
                  date:
                    p.view === 'month'
                      ? shiftMonth(p.date, 1)
                      : shiftDate(p.date, p.view === 'week' ? 7 : 1),
                }))
              }
              className="p-1.5 rounded-lg"
              style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--muted)' }}
            >
              <ChevronRight size={16} strokeWidth={1.8} />
            </button>
            <label className="p-1.5 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
              <Calendar size={14} strokeWidth={1.8} />
              <input
                type="date"
                value={period.date}
                onChange={(e) => e.target.value && setPeriod((p) => ({ ...p, date: e.target.value }))}
                className="sr-only"
              />
            </label>
          </div>

          <EmotionGraphView
            tags={periodTags}
            view={period.view}
            onTap={(emotion) => openCreate({ emotion, level: 1 })}
          />

          {period.view === 'day' ? (
            <DaySection
              records={periodRecords}
              onEditTag={(sourceType, sourceId, tag) => openEdit(sourceType, sourceId, tag)}
            />
          ) : (
            <PeriodAnalysis tags={periodTags} view={period.view} date={period.date} />
          )}
        </>
      )}

      {topTab === 'therapy' && <EmotionTherapyTab />}

      {topTab === 'overlay' && <EmotionOverlayTab />}

      {sheet.open && topTab === 'diary' && (
        <EmotionTagSheet
          key={`${sheet.mode}-${sheet.tagId ?? 'new'}`}
          state={sheet}
          notes={notes}
          listrecs={listrecs}
          diary={diary}
          allTags={allTags}
          onClose={() => setSheet({ open: false, mode: 'create' })}
          onSave={(tag, sourceType, sourceId) => saveTag(tag, sourceType, sourceId, sheet.mode, sheet.tagId)}
          onDelete={
            sheet.mode === 'edit' && sheet.sourceType && sheet.sourceId && sheet.tagId
              ? () => deleteTag(sheet.sourceType!, sheet.sourceId!, sheet.tagId!)
              : undefined
          }
        />
      )}
    </div>
  )
}

function DaySection({
  records,
  onEditTag,
}: {
  records: ReturnType<typeof emotionRecords>
  onEditTag: (sourceType: EmotionRecordSource, sourceId: string, tag: EmotionTag) => void
}) {
  return (
    <section className="mt-4">
      <h2 className="mb-2" style={{ fontSize: 14, fontWeight: 600, color: 'var(--light)' }}>
        Записи за день
      </h2>
      {records.length === 0 && (
        <p className="py-6 text-center" style={{ fontSize: 13, color: 'var(--muted)' }}>
          Нет эмоциональных тегов за этот день
        </p>
      )}
      <div className="space-y-2">
        {records.slice(0, 30).map((item) => (
          <RecordRow
            key={`${item.source}-${(item.record as Note & ListRecord & { date: string }).id ?? (item.record as { date: string }).date}`}
            item={item}
            onEditTag={(tag) => {
              const id =
                item.source === 'diary'
                  ? (item.record as { date: string }).date
                  : (item.record as Note & ListRecord).id
              onEditTag(item.source, id, tag)
            }}
          />
        ))}
      </div>
    </section>
  )
}

function PeriodAnalysis({
  tags,
  view,
  date,
}: {
  tags: EmotionTag[]
  view: Exclude<PeriodView, 'day'>
  date: string
}) {
  const stats = useMemo(() => {
    const freq: Record<string, number> = {}
    const levelSum: Record<string, number> = {}
    const feelings: Record<string, { count: number; levelSum: number }> = {}
    const sensations: Record<string, { count: number; levelSum: number }> = {}
    tags.forEach((t) => {
      freq[t.emotion] = (freq[t.emotion] || 0) + 1
      levelSum[t.emotion] = (levelSum[t.emotion] || 0) + t.level
      t.feelings?.forEach((f) => {
        const cur = feelings[f.name] || { count: 0, levelSum: 0 }
        feelings[f.name] = { count: cur.count + 1, levelSum: cur.levelSum + f.level }
      })
      t.sensations?.forEach((s) => {
        const cur = sensations[s.name] || { count: 0, levelSum: 0 }
        sensations[s.name] = { count: cur.count + 1, levelSum: cur.levelSum + s.level }
      })
    })
    const avg: Record<string, number> = {}
    Object.keys(freq).forEach((e) => {
      avg[e] = Math.round((levelSum[e] / freq[e]) * 10) / 10
    })
    const top = (map: Record<string, { count: number; levelSum: number }>) =>
      Object.entries(map)
        .sort((a, b) => b[1].count - a[1].count || b[1].levelSum - a[1].levelSum)
        .slice(0, 3)
        .map(([name, data]) => [name, data.count, Math.round((data.levelSum / data.count) * 10) / 10] as const)
    return { freq, avg, topFeelings: top(feelings), topSensations: top(sensations) }
  }, [tags])

  const days = useMemo(() => {
    const bounds = periodBounds(view, date)
    const result: string[] = []
    for (let t = bounds.start; t < bounds.end; t += 86400000) {
      result.push(new Date(t).toISOString().slice(0, 10))
    }
    return result
  }, [view, date])

  const tagsByDay = useMemo(() => {
    const map: Record<string, EmotionTag[]> = {}
    days.forEach((d) => (map[d] = []))
    tags.forEach((t) => {
      const d = new Date(t.created).toISOString().slice(0, 10)
      if (map[d]) map[d].push(t)
    })
    return map
  }, [tags, days])

  const isDark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'tg-dark'

  return (
    <section className="mt-4 space-y-3">
      <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h3 className="mb-2" style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>
          Частота и средний уровень
        </h3>
        {Object.keys(stats.freq).length === 0 && (
          <p className="py-2 text-center" style={{ fontSize: 12, color: 'var(--muted)' }}>
            Нет данных за период
          </p>
        )}
        <div className="space-y-1.5">
          {Object.entries(stats.freq)
            .sort((a, b) => b[1] - a[1])
            .map(([emotion, count]) => {
              const color = plutchikColor(emotion, isDark)
              return (
                <div key={emotion} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-none" style={{ background: color }} />
                  <span className="flex-1" style={{ fontSize: 12, color: 'var(--text)' }}>
                    {emotionName(emotion)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{count}×</span>
                  <span
                    className="px-1.5 rounded"
                    style={{ background: color, color: '#fff', fontSize: 10, fontWeight: 700 }}
                  >
                    {stats.avg[emotion]}
                  </span>
                </div>
              )
            })}
        </div>
      </div>

      <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h3 className="mb-2" style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>
          Топ чувств и ощущений
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Чувства</p>
            {stats.topFeelings.length === 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>}
            {stats.topFeelings.map(([f, c, avg]) => (
              <div key={f} className="flex items-center justify-between gap-2" style={{ fontSize: 12, color: 'var(--text)' }}>
                <span className="truncate">{f}</span>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>{c}× · {avg}</span>
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Ощущения</p>
            {stats.topSensations.length === 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>}
            {stats.topSensations.map(([s, c, avg]) => (
              <div key={s} className="flex items-center justify-between gap-2" style={{ fontSize: 12, color: 'var(--text)' }}>
                <span className="truncate">{s}</span>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>{c}× · {avg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h3 className="mb-2" style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>
          Таймлайн
        </h3>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {days.map((d) => {
            const dayTags = tagsByDay[d] || []
            return (
              <div key={d} className="flex flex-col items-center gap-1 min-w-[32px]">
                <span style={{ fontSize: 9, color: 'var(--muted)' }}>{Number(d.slice(8, 10))}</span>
                <div className="flex flex-wrap justify-center gap-0.5" style={{ width: 28, minHeight: 28 }}>
                  {dayTags.slice(0, 8).map((t) => (
                    <span
                      key={t.id}
                      className="rounded-full"
                      style={{ width: 6, height: 6, background: plutchikColor(t.emotion, isDark) }}
                      title={`${emotionName(t.emotion)} · ${fmtDateRu(d)}`}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function EmotionGraphView({
  tags,
  view,
  onTap,
}: {
  tags: EmotionTag[]
  view: PeriodView
  onTap: (emotion: EmotionTag['emotion']) => void
}) {
  const isDark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'tg-dark'
  const size = 360
  const cx = size / 2
  const cy = size / 2
  const rEmotion = 55
  const rFeeling = 110
  const rSensation = 165
  const angleStep = (Math.PI * 2) / 8
  const threshold = view === 'day' ? 3 : view === 'week' ? 9 : 30

  // Настройки визуализации. Меняй значения и пересобирай, чтобы подобрать под себя.
  // emotionSizeScale: 0 = размер фиксированный, 1 = максимальная зависимость от уровня.
  // emotionColorBoost: множитель интенсивности цвета (0..1+).
  const CONFIG = {
    emotionSizeScale: 0,
    emotionColorBoost: 1,
    subItemSizeScale: 0,
    subItemColorBoost: 1,
    minOpacity: 0.25,
  }

  const { emotionScores, feelingLevels, sensationLevels } = useMemo(() => {
    const emotionScores: Record<string, number> = {}
    const feelingLevels: Record<string, Record<string, number>> = {}
    const sensationLevels: Record<string, Record<string, number>> = {}
    PLUTCHIK_EMOTIONS.forEach((e) => {
      emotionScores[e] = 0
      feelingLevels[e] = {}
      sensationLevels[e] = {}
    })
    tags.forEach((t) => {
      emotionScores[t.emotion] += t.level
      t.feelings?.forEach((f) => {
        const cur = feelingLevels[t.emotion][f.name] ?? 0
        feelingLevels[t.emotion][f.name] = Math.max(cur, f.level)
      })
      t.sensations?.forEach((s) => {
        const cur = sensationLevels[t.emotion][s.name] ?? 0
        sensationLevels[t.emotion][s.name] = Math.max(cur, s.level)
      })
    })
    return { emotionScores, feelingLevels, sensationLevels }
  }, [tags])

  const sectorAngles = (emotionIndex: number, count: number) => {
    const center = emotionIndex * angleStep - Math.PI / 2
    if (count === 0) return []
    const half = angleStep / 2 - 0.04
    if (count === 1) return [center]
    const step = (half * 2) / (count + 1)
    return Array.from({ length: count }, (_, i) => center - half + step * (i + 1))
  }

  return (
    <div className="flex justify-center py-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={rEmotion - 10} fill="none" stroke="var(--line)" strokeWidth={1} strokeOpacity={0.5} />
        <circle cx={cx} cy={cy} r={rFeeling} fill="none" stroke="var(--line)" strokeWidth={1} strokeOpacity={0.5} />
        <circle cx={cx} cy={cy} r={rSensation + 4} fill="none" stroke="var(--line)" strokeWidth={1} />

        {PLUTCHIK_EMOTIONS.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2 - angleStep / 2
          const p = polar(cx, cy, rSensation + 4, angle)
          return (
            <line
              key={`divider-${i}`}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="var(--line)"
              strokeWidth={1}
              strokeOpacity={0.3}
            />
          )
        })}

        {PLUTCHIK_EMOTIONS.map((emotion, i) => {
          const eAngle = i * angleStep - Math.PI / 2
          const ePos = polar(cx, cy, rEmotion, eAngle)
          const color = emotionScores[emotion] > 0 ? plutchikColor(emotion, isDark) : 'var(--line)'
          const feelingNames = EMOTION_WHEEL[emotion]?.feelings ?? []
          const sensationNames = EMOTION_WHEEL[emotion]?.sensations ?? []
          const fAngles = sectorAngles(i, feelingNames.length)
          const sAngles = sectorAngles(i, sensationNames.length)

          return (
            <g key={`links-${emotion}`}>
              <line x1={cx} y1={cy} x2={ePos.x} y2={ePos.y} stroke={color} strokeWidth={1.5} strokeOpacity={0.4} />
              {fAngles.map((a, j) => {
                const fPos = polar(cx, cy, rFeeling, a)
                const fName = feelingNames[j]
                const active = feelingLevels[emotion][fName] > 0
                return (
                  <line
                    key={`ef-${emotion}-${j}`}
                    x1={ePos.x}
                    y1={ePos.y}
                    x2={fPos.x}
                    y2={fPos.y}
                    stroke={active ? plutchikColor(emotion, isDark) : 'var(--line)'}
                    strokeWidth={1}
                    strokeOpacity={active ? 0.5 : 0.25}
                  />
                )
              })}
              {fAngles.map((a, j) => {
                const fPos = polar(cx, cy, rFeeling, a)
                const sAngle = sAngles[Math.min(j, sAngles.length - 1)]
                const sPos = polar(cx, cy, rSensation, sAngle)
                const fName = feelingNames[j]
                const active = feelingLevels[emotion][fName] > 0
                return (
                  <line
                    key={`fs-${emotion}-${j}`}
                    x1={fPos.x}
                    y1={fPos.y}
                    x2={sPos.x}
                    y2={sPos.y}
                    stroke={active ? plutchikColor(emotion, isDark) : 'var(--line)'}
                    strokeWidth={1}
                    strokeOpacity={active ? 0.4 : 0.2}
                  />
                )
              })}
            </g>
          )
        })}

        {PLUTCHIK_EMOTIONS.map((emotion, i) => {
          const angle = i * angleStep - Math.PI / 2
          const p = polar(cx, cy, rEmotion, angle)
          const score = emotionScores[emotion]
          const ratio = Math.min(score / threshold, 1)
          const hasData = score > 0
          const nodeR = 24 + 14 * ratio * CONFIG.emotionSizeScale
          const color = hasData ? plutchikColor(emotion, isDark) : 'var(--muted)'
          const opacity = hasData
            ? CONFIG.minOpacity + (1 - CONFIG.minOpacity) * ratio * CONFIG.emotionColorBoost
            : CONFIG.minOpacity
          return (
            <g key={`node-emotion-${emotion}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r={nodeR}
                fill={color}
                fillOpacity={Math.min(opacity, 1)}
                stroke="var(--surface)"
                strokeWidth={2}
                style={{ cursor: 'pointer' }}
                onClick={() => onTap(emotion)}
              >
                <title>{`${emotionName(emotion)} · ${score}/${threshold}`}</title>
              </circle>
              {hasData && (
                <text
                  x={p.x}
                  y={p.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={9}
                  fontWeight={700}
                  fill="#fff"
                  style={{ pointerEvents: 'none', textShadow: '0 0 3px rgba(0,0,0,0.5)' }}
                >
                  {score}
                </text>
              )}
            </g>
          )
        })}

        {PLUTCHIK_EMOTIONS.map((emotion, i) => {
          const feelingNames = EMOTION_WHEEL[emotion]?.feelings ?? []
          const fAngles = sectorAngles(i, feelingNames.length)
          return feelingNames.map((name, j) => {
            const angle = fAngles[j]
            const p = polar(cx, cy, rFeeling, angle)
            const level = feelingLevels[emotion][name] ?? 0
            const hasData = level > 0
            const ratio = level / 12
            const nodeR = 10 + 10 * ratio * CONFIG.subItemSizeScale
            const color = hasData ? plutchikColor(emotion, isDark) : 'var(--muted)'
            const opacity = hasData
              ? CONFIG.minOpacity + (1 - CONFIG.minOpacity) * ratio * CONFIG.subItemColorBoost
              : CONFIG.minOpacity
            return (
              <g key={`node-feeling-${emotion}-${name}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={nodeR}
                  fill={color}
                  fillOpacity={Math.min(opacity, 1)}
                  stroke="var(--surface)"
                  strokeWidth={1.5}
                >
                  <title>{`${name} · ${level}/12`}</title>
                </circle>
                {hasData && level >= 9 && (
                  <text
                    x={p.x}
                    y={p.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={7}
                    fontWeight={700}
                    fill="#fff"
                    style={{ pointerEvents: 'none' }}
                  >
                    {level}
                  </text>
                )}
              </g>
            )
          })
        })}

        {PLUTCHIK_EMOTIONS.map((emotion, i) => {
          const sensationNames = EMOTION_WHEEL[emotion]?.sensations ?? []
          const sAngles = sectorAngles(i, sensationNames.length)
          return sensationNames.map((name, j) => {
            const angle = sAngles[j]
            const p = polar(cx, cy, rSensation, angle)
            const level = sensationLevels[emotion][name] ?? 0
            const hasData = level > 0
            const ratio = level / 12
            const nodeR = 8 + 8 * ratio * CONFIG.subItemSizeScale
            const color = hasData ? plutchikColor(emotion, isDark) : 'var(--muted)'
            const opacity = hasData
              ? CONFIG.minOpacity + (1 - CONFIG.minOpacity) * ratio * CONFIG.subItemColorBoost
              : CONFIG.minOpacity
            return (
              <g key={`node-sensation-${emotion}-${name}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={nodeR}
                  fill={color}
                  fillOpacity={Math.min(opacity, 1)}
                  stroke="var(--surface)"
                  strokeWidth={1.5}
                >
                  <title>{`${name} · ${level}/12`}</title>
                </circle>
                {hasData && level >= 9 && (
                  <text
                    x={p.x}
                    y={p.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={6}
                    fontWeight={700}
                    fill="#fff"
                    style={{ pointerEvents: 'none' }}
                  >
                    {level}
                  </text>
                )}
              </g>
            )
          })
        })}

        {PLUTCHIK_EMOTIONS.map((emotion, i) => {
          const angle = i * angleStep - Math.PI / 2
          const lineStart = polar(cx, cy, rSensation + 6, angle)
          const labelPos = polar(cx, cy, rSensation + 32, angle)
          const text = emotionName(emotion)
          const approxW = text.length * 6.5 + 12
          const approxH = 18
          const x = labelPos.x - approxW / 2
          const y = labelPos.y - approxH / 2
          const color = emotionScores[emotion] > 0 ? plutchikColor(emotion, isDark) : 'var(--muted)'
          return (
            <g key={`label-${emotion}`} pointerEvents="none">
              <line x1={lineStart.x} y1={lineStart.y} x2={labelPos.x} y2={labelPos.y} stroke={color} strokeWidth={1.5} strokeOpacity={0.7} />
              <rect x={x} y={y} width={approxW} height={approxH} rx={4} fill="var(--surface)" fillOpacity={0.9} stroke="var(--line)" strokeWidth={1} />
              <text x={labelPos.x} y={labelPos.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight={600} fill="var(--text)">
                {text}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function RecordRow({
  item,
  onEditTag,
}: {
  item: ReturnType<typeof emotionRecords>[number]
  onEditTag: (tag: EmotionTag) => void
}) {
  const { source, record, tags } = item
  const isDiary = source === 'diary'
  const title = isDiary
    ? `Дневник · ${(record as { date: string }).date}`
    : (record as Note & ListRecord).title || (source === 'note' ? 'Без названия' : 'Запись')
  const Icon = source === 'note' ? FileText : source === 'listrec' ? ((record as ListRecord).kind === 'checklist' ? ListChecks : ListOrdered) : BookOpen
  const color =
    source === 'note'
      ? 'var(--accent)'
      : source === 'listrec'
        ? (record as ListRecord).kind === 'checklist'
          ? 'var(--ring-checklists)'
          : 'var(--ring-tasks)'
        : 'var(--f-emotions)'

  return (
    <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="grid place-items-center rounded-lg flex-none" style={{ width: 32, height: 32, background: color }}>
          <Icon size={16} strokeWidth={1.8} style={{ color: 'var(--on-fill)' }} />
        </span>
        <span className="flex-1 min-w-0 truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--light)' }}>
          {title}
        </span>
        <span className="flex-none" style={{ fontSize: 11, color: 'var(--muted)' }}>
          {fmtWhen((record as Note & ListRecord & DiaryEntry).updated || 0)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => onEditTag(tag)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ background: plutchikColor(tag.emotion, false) + '22', border: `1px solid ${plutchikColor(tag.emotion, false)}`, fontSize: 11, color: 'var(--text)' }}
          >
            <span style={{ color: plutchikColor(tag.emotion, false) }}>{emotionName(tag.emotion)}</span>
            <LevelBadge level={tag.level} />
            {tag.feelings && tag.feelings.length > 0 && (
              <span className="opacity-75">· {tag.feelings.map((f) => `${f.name}(${f.level})`).join(', ')}</span>
            )}
            {tag.sensations && tag.sensations.length > 0 && (
              <span className="opacity-75">· {tag.sensations.map((s) => `${s.name}(${s.level})`).join(', ')}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function LevelBadge({ level }: { level: 1 | 2 | 3 }) {
  const colors = {
    1: 'var(--muted)',
    2: 'var(--accent)',
    3: 'var(--light)',
  }
  return (
    <span className="px-1 rounded" style={{ background: colors[level], color: level === 3 ? 'var(--bg)' : '#fff', fontSize: 9, fontWeight: 700 }}>
      {level}
    </span>
  )
}

function EmotionTherapyTab() {
  const [notes] = useLS<Note[]>('aod2-notes', [])
  const [listrecs] = useLS<ListRecord[]>('aod2-listrecs', [])
  const [diary] = useLS<Diary>('aod2-diary', {})

  const recent = useMemo(() => {
    return allEmotionTags(notes, listrecs, diary)
      .sort((a, b) => b.created - a.created)
      .slice(0, 10)
  }, [notes, listrecs, diary])

  return (
    <section className="mt-4 space-y-3">
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>Терапия через эмоции</h3>
        <p className="mt-1" style={{ fontSize: 12, color: 'var(--muted)' }}>
          Здесь будут ситуации для проработки со специалистом.
        </p>
      </div>
      {recent.length === 0 && (
        <p className="py-6 text-center" style={{ fontSize: 13, color: 'var(--muted)' }}>Нет эмоциональных записей</p>
      )}
      {recent.map((tag) => (
        <div key={tag.id} className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-none" style={{ background: plutchikColor(tag.emotion) }} />
            <span className="flex-1" style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>{emotionName(tag.emotion)}</span>
            <span className="px-1.5 rounded" style={{ background: plutchikColor(tag.emotion), color: '#fff', fontSize: 10, fontWeight: 700 }}>{tag.level}</span>
          </div>
          {(tag.feelings?.length || tag.sensations?.length) ? (
            <div className="flex flex-wrap gap-1 mt-2">
              {tag.feelings?.map((f) => <span key={f.name} className="px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--text)' }}>{f.name}</span>)}
              {tag.sensations?.map((s) => <span key={s.name} className="px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--text)' }}>{s.name}</span>)}
            </div>
          ) : null}
        </div>
      ))}
    </section>
  )
}

function EmotionOverlayTab() {
  const [stored] = useLS<{ snapshots: Record<string, number[][]> }>('aod2-selfmap-v1', { snapshots: {} })
  const snapshots = stored?.snapshots ?? {}
  const dates = useMemo(() => Object.keys(snapshots).sort(), [snapshots])
  const latestDate = dates[dates.length - 1]
  const latest = latestDate ? snapshots[latestDate] : null

  const topItems = useMemo(() => {
    if (!latest) return []
    const result: { name: string; value: number }[] = []
    // Простая сводка: берём среднее по каждой категории.
    // Здесь можно заменить на реальную логику карты самооценки.
    return result
  }, [latest])

  return (
    <section className="mt-4 space-y-3">
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>Наслоение эмоций и самооценки</h3>
        {latestDate ? (
          <p className="mt-1" style={{ fontSize: 12, color: 'var(--muted)' }}>
            Последний замер самоооценки: {fmtDateRu(latestDate)}
          </p>
        ) : (
          <p className="mt-1" style={{ fontSize: 12, color: 'var(--muted)' }}>Нет данных карты самооценки</p>
        )}
      </div>
      {topItems.length > 0 && (
        <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          {topItems.map((i) => (
            <div key={i.name} className="flex items-center justify-between py-1" style={{ fontSize: 12, color: 'var(--text)' }}>
              <span>{i.name}</span>
              <span style={{ fontWeight: 700 }}>{i.value}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function polar(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  }
}
