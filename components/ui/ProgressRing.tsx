interface Props { pct: number; size?: number; color?: string; stroke?: number }

export default function ProgressRing({ pct, size = 36, color = '#f59e0b', stroke = 3 }: Props) {
  const r   = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * (1 - pct / 100)

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#274672" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={dash}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  )
}
