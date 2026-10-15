import { useEffect, useMemo, useRef, useState } from 'react'
import {
  SOCIAL_LAYERS,
  THINKING_TYPES,
  type Person,
  type SocialSet,
  type SocialTag,
} from './socialTypes'

interface NodePos {
  x: number
  y: number
}

function hashId(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h / 4294967296
}

function layerRadius(layerIndex: number) {
  return 70 + layerIndex * 55
}

function initialPos(person: Person, layerIndex: number): NodePos {
  const r = layerRadius(layerIndex)
  const angle = hashId(person.id) * Math.PI * 2
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r }
}

export default function SocialGraph({
  people,
  sets,
  tags,
}: {
  people: Person[]
  sets: SocialSet[]
  tags: SocialTag[]
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 320, h: 400 })
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [positions, setPositions] = useState<Record<string, NodePos>>({})
  const dragRef = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(null)

  const layerIndex = useMemo(() => {
    const map: Record<string, number> = {}
    SOCIAL_LAYERS.forEach((l, i) => (map[l.id] = i))
    return map
  }, [])

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      setSize({ w: rect.width || 320, h: rect.height || 400 })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const basePositions = useMemo(() => {
    const next: Record<string, NodePos> = {}
    people.forEach((p) => {
      next[p.id] = initialPos(p, layerIndex[p.layer] ?? 0)
    })
    return next
  }, [people, layerIndex])

  const currentPositions = useMemo(() => {
    const next: Record<string, NodePos> = {}
    people.forEach((p) => {
      next[p.id] = positions[p.id] ?? basePositions[p.id] ?? initialPos(p, layerIndex[p.layer] ?? 0)
    })
    return next
  }, [people, positions, basePositions, layerIndex])

  const toSvgPoint = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const cx = rect.left + rect.width / 2 + pan.x
    const cy = rect.top + rect.height / 2 + pan.y
    return {
      x: (clientX - cx) / zoom,
      y: (clientY - cy) / zoom,
    }
  }

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault()
    const pos = currentPositions[id]
    if (!pos) return
    const pt = toSvgPoint(e.clientX, e.clientY)
    dragRef.current = { id, startX: pt.x, startY: pt.y, originX: pos.x, originY: pos.y }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    e.preventDefault()
    const pt = toSvgPoint(e.clientX, e.clientY)
    const { id, startX, startY, originX, originY } = dragRef.current
    setPositions((prev) => ({
      ...prev,
      [id]: { x: originX + pt.x - startX, y: originY + pt.y - startY },
    }))
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    ;(e.target as Element).releasePointerCapture(e.pointerId)
    dragRef.current = null
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom((z) => Math.min(Math.max(z * delta, 0.4), 3))
  }

  const onPanStart = (e: React.PointerEvent) => {
    if (e.target !== svgRef.current) return
    dragRef.current = { id: '__pan__', startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y }
    svgRef.current?.setPointerCapture(e.pointerId)
  }

  const onPanMove = (e: React.PointerEvent) => {
    if (!dragRef.current || dragRef.current.id !== '__pan__') return
    const { startX, startY, originX, originY } = dragRef.current
    setPan({ x: originX + e.clientX - startX, y: originY + e.clientY - startY })
  }

  const onPanEnd = (e: React.PointerEvent) => {
    if (!dragRef.current || dragRef.current.id !== '__pan__') return
    svgRef.current?.releasePointerCapture(e.pointerId)
    dragRef.current = null
  }

  const links = useMemo(() => {
    const list: { a: string; b: string; color: string }[] = []
    people.forEach((p, i) => {
      p.setIds.forEach((sid) => {
        const set = sets.find((s) => s.id === sid)
        if (!set) return
        for (let j = i + 1; j < people.length; j++) {
          const other = people[j]
          if (other.setIds.includes(sid)) {
            list.push({ a: p.id, b: other.id, color: set.color })
          }
        }
      })
    })
    return list
  }, [people, sets])

  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{ background: 'var(--surface)', border: '1px solid var(--line)', height: 420 }}
    >
      <svg
        ref={svgRef}
        className="w-full h-full touch-none"
        onPointerDown={onPanStart}
        onPointerMove={onPanMove}
        onPointerUp={onPanEnd}
        onWheel={onWheel}
      >
        <g transform={`translate(${size.w / 2 + pan.x}, ${size.h / 2 + pan.y}) scale(${zoom})`}>
          {SOCIAL_LAYERS.map((l, i) => {
            const r = layerRadius(i)
            return (
              <g key={l.id}>
                <circle
                  cx={0}
                  cy={0}
                  r={r}
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth={1}
                  strokeDasharray={i === 0 ? undefined : '4 4'}
                />
                <text
                  x={r - 6}
                  y={4}
                  textAnchor="end"
                  style={{ fontSize: 9, fill: 'var(--muted)', fontFamily: 'var(--font-body)' }}
                >
                  {l.label}
                </text>
              </g>
            )
          })}

          {links.map((link, idx) => {
            const pa = currentPositions[link.a]
            const pb = currentPositions[link.b]
            if (!pa || !pb) return null
            return (
              <line
                key={idx}
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke={link.color}
                strokeWidth={1}
                opacity={0.35}
              />
            )
          })}

          {people.map((p) => {
            const pos = currentPositions[p.id] ?? initialPos(p, layerIndex[p.layer] ?? 0)
            const type = THINKING_TYPES[p.thinkingType]
            const mainSet = sets.find((s) => p.setIds[0] && s.id === p.setIds[0])
            const color = mainSet?.color || type.color
            return (
              <g
                key={p.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onPointerDown={(e) => onPointerDown(e, p.id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'grab' }}
              >
                <circle
                  r={p.layer === 'core' ? 14 : p.layer === 'close' ? 11 : 8}
                  fill={color}
                  stroke="var(--bg)"
                  strokeWidth={2}
                />
                <text
                  y={p.layer === 'core' ? 26 : 22}
                  textAnchor="middle"
                  style={{ fontSize: 9, fill: 'var(--light)', fontFamily: 'var(--font-body)', pointerEvents: 'none' }}
                >
                  {p.name}
                </text>
                {p.tags.slice(0, 2).map((tid, i) => {
                  const tag = tags.find((t) => t.id === tid)
                  if (!tag) return null
                  return (
                    <circle
                      key={tid}
                      cx={10}
                      cy={-10 + i * 7}
                      r={3}
                      fill={tag.color}
                      stroke="var(--bg)"
                      strokeWidth={0.5}
                    />
                  )
                })}
              </g>
            )
          })}
        </g>
      </svg>

      <div className="absolute bottom-2 right-2 flex gap-1">
        <button
          onClick={() => setZoom((z) => Math.min(z * 1.2, 3))}
          className="w-8 h-8 rounded-full grid place-items-center"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 16 }}
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z / 1.2, 0.4))}
          className="w-8 h-8 rounded-full grid place-items-center"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--light)', fontSize: 16 }}
        >
          −
        </button>
      </div>
    </div>
  )
}
