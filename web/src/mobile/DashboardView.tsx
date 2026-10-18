import { useMemo } from 'react'
import { TrendingUp, CheckCircle2, Users } from 'lucide-react'
import { useLS } from '../views/practice/store'
import { WD } from '../lib/dayStats'
import { SOCIAL_LAYERS } from './socialTypes'

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function DashboardView() {
  const date = todayIso()
  const wdName = WD[new Date(date + 'T00:00:00').getDay()]
  const [todayData] = useLS<Record<string, { items: { done: boolean }[] }>>(`aod4-today-data-${date}`, {})
  const [people] = useLS<{ layer: string }[]>('aod4-social-people', [])

  const taskStats = useMemo(() => {
    let done = 0
    let total = 0
    Object.values(todayData).forEach((block) => {
      total += block.items?.length ?? 0
      done += block.items?.filter((i) => i.done).length ?? 0
    })
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
  }, [todayData])

  const peopleByLayer = useMemo(() => {
    const map: Record<string, number> = {}
    people.forEach((p) => { map[p.layer] = (map[p.layer] ?? 0) + 1 })
    return map
  }, [people])

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 28, fontWeight: 700, color: 'var(--light)' }}>
        Дашборд
      </h1>
      <p className="mb-4" style={{ fontSize: 13, color: 'var(--muted)' }}>
        {date} · {wdName}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={16} strokeWidth={1.8} style={{ color: 'var(--done)' }} />
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>День</span>
          </div>
          <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--light)' }}>{taskStats.done}/{taskStats.total}</p>
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            <div className="h-full rounded-full" style={{ width: `${taskStats.pct}%`, background: 'var(--done)' }} />
          </div>
        </div>

        <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} strokeWidth={1.8} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Социум</span>
          </div>
          <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--light)' }}>{people.length}</p>
          <p style={{ fontSize: 11, color: 'var(--muted)' }}>
            {SOCIAL_LAYERS.map((l) => `${l.label}: ${peopleByLayer[l.id] ?? 0}`).join(' · ')}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <TrendingUp size={24} strokeWidth={1.8} style={{ color: 'var(--muted)', margin: '0 auto' }} />
        <p className="mt-2" style={{ fontSize: 13, color: 'var(--muted)' }}>
          Быстрая аналитика из инструментов — скоро здесь появятся графики, тренды и инсайты.
        </p>
      </div>
    </div>
  )
}
