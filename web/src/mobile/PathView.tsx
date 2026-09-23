import { useState, type ComponentType } from 'react'
import { ArrowLeft, ChevronRight, Map, Network, Scale, type LucideIcon } from 'lucide-react'
import GraphView from '../views/GraphView'
import RoadmapView from '../views/RoadmapView'
import BalanceView from '../views/BalanceView'
import { ScreenHeader, Tile } from './ui'

const ITEMS: { id: string; label: string; sub: string; icon: LucideIcon; color: string; view: ComponentType }[] = [
  { id: 'graph', label: 'Граф системы', sub: 'смысл · состояние · путь · организация', icon: Network, color: 'var(--f-metacog)', view: GraphView },
  { id: 'roadmap', label: 'Роадмапа', sub: 'v1.0 → v3.1, спринты и сезоны', icon: Map, color: 'var(--f-environment)', view: RoadmapView },
  { id: 'balance', label: 'Баланс', sub: 'колесо 6 сил', icon: Scale, color: 'var(--f-neuro)', view: BalanceView },
]

// вкладка «Путь»: меню существующих разделов, вложенные экраны — существующие вьюхи
export default function PathView() {
  const [sub, setSub] = useState<string | null>(null)

  const item = ITEMS.find((i) => i.id === sub)
  if (item) {
    const View = item.view
    return (
      <div className="relative min-h-screen pb-24">
        <button
          onClick={() => setSub(null)}
          className="absolute top-3 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--accent)', fontSize: 12.5, fontWeight: 600 }}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Путь
        </button>
        <div className="mobile-embed">
          <View />
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-5 pb-28 min-h-screen">
      <ScreenHeader title="Путь" sub="версии архитектуры и баланс сил" />
      <div className="space-y-2.5">
        {ITEMS.map((i) => (
          <button
            key={i.id}
            onClick={() => setSub(i.id)}
            className="w-full rounded-2xl p-3.5 flex items-center gap-3 text-left"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
          >
            <Tile icon={i.icon} color={i.color} size={40} />
            <span className="flex-1 min-w-0">
              <span className="block" style={{ fontSize: 15, fontWeight: 600, color: 'var(--light)' }}>{i.label}</span>
              <span className="block mt-0.5" style={{ fontSize: 12, color: 'var(--muted)' }}>{i.sub}</span>
            </span>
            <ChevronRight size={16} strokeWidth={1.8} style={{ color: 'var(--muted)' }} />
          </button>
        ))}
      </div>
    </div>
  )
}
