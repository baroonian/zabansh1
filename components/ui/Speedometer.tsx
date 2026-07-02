'use client'
import { useEffect, useState } from 'react'

interface Props {
  pct: number
  size?: number
  label?: string
}

export default function Speedometer({ pct, size = 280, label = '' }: Props) {
  const [animated, setAnimated] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(pct), 300)
    return () => clearTimeout(timer)
  }, [pct])

  const r  = size * 0.38
  const cx = size / 2
  const cy = size * 0.57

  const toXY = (angle: number, rad: number) => ({
    x: cx + rad * Math.cos(angle),
    y: cy + rad * Math.sin(angle),
  })

  const arc = (from: number, to: number, rad: number) => {
    const s = toXY(from, rad), e = toXY(to, rad)
    const large = to - from > Math.PI ? 1 : 0
    return `M ${s.x} ${s.y} A ${rad} ${rad} 0 ${large} 1 ${e.x} ${e.y}`
  }

  const START = Math.PI
  const needleAngle = START + (animated / 100) * Math.PI
  const tip   = toXY(needleAngle, r * 0.82)
  const base1 = toXY(needleAngle + Math.PI / 2, r * 0.065)
  const base2 = toXY(needleAngle - Math.PI / 2, r * 0.065)

  const color = animated < 34 ? '#ef4444' : animated < 67 ? '#f59e0b' : '#10b981'
  const ticks = [0, 25, 50, 75, 100]

  return (
    <svg width={size} height={size * 0.66} viewBox={`0 0 ${size} ${size * 0.66}`}>
      <defs>
        <linearGradient id="bg-arc" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#ef4444" stopOpacity="0.2" />
          <stop offset="50%"  stopColor="#f59e0b" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="fill-arc" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#ef4444" />
          <stop offset="50%"  stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background track */}
      <path d={arc(START, START + Math.PI, r)} fill="none"
        stroke="url(#bg-arc)" strokeWidth={r * 0.17} strokeLinecap="round" />

      {/* Filled arc */}
      {animated > 0 && (
        <path d={arc(START, START + (animated / 100) * Math.PI, r)} fill="none"
          stroke="url(#fill-arc)" strokeWidth={r * 0.17} strokeLinecap="round"
          filter="url(#glow)"
          style={{ transition: 'all 1s cubic-bezier(0.34,1.56,0.64,1)' }} />
      )}

      {/* Ticks */}
      {ticks.map(t => {
        const a = START + (t / 100) * Math.PI
        const i = toXY(a, r * 0.73), o = toXY(a, r * 0.89)
        const l = toXY(a, r * 0.6)
        return (
          <g key={t}>
            <line x1={i.x} y1={i.y} x2={o.x} y2={o.y} stroke="#274672" strokeWidth={1.5} />
            <text x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle"
              fill="#3d6494" fontSize={9} fontFamily="Inter">{t}</text>
          </g>
        )
      })}

      {/* Needle */}
      <polygon
        points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
        fill={color} filter="url(#glow)"
        style={{ transition: 'all 1s cubic-bezier(0.34,1.56,0.64,1)' }} />
      <circle cx={cx} cy={cy} r={r * 0.09} fill="#112240" stroke={color} strokeWidth={2.5} />

      {/* Percentage */}
      <text x={cx} y={cy - r * 0.28} textAnchor="middle" fill={color}
        fontSize={size * 0.135} fontWeight="700" fontFamily="Inter" filter="url(#glow)"
        style={{ transition: 'fill 0.5s' }}>
        {Math.round(animated)}%
      </text>
      {label && (
        <text x={cx} y={cy - r * 0.08} textAnchor="middle" fill="#7fa5c8"
          fontSize={11} fontFamily="Vazirmatn">
          {label}
        </text>
      )}
    </svg>
  )
}
