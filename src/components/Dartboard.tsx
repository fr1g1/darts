import { useState } from 'react'
import type { Mult } from '../engine'

const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]
const R = { bullIn: 11, bullOut: 24, tripleIn: 86, tripleOut: 108, doubleIn: 148, doubleOut: 172, numbers: 188 }

function polar(r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180
  return [r * Math.cos(a), r * Math.sin(a)]
}

function sector(r1: number, r2: number, a1: number, a2: number) {
  const [x1, y1] = polar(r2, a1)
  const [x2, y2] = polar(r2, a2)
  const [x3, y3] = polar(r1, a2)
  const [x4, y4] = polar(r1, a1)
  return `M${x1},${y1} A${r2},${r2} 0 0 1 ${x2},${y2} L${x3},${y3} A${r1},${r1} 0 0 0 ${x4},${y4} Z`
}

export function Dartboard({
  onDart,
  disabled,
  highlight,
  className = 'w-full max-w-[min(100%,48dvh)]',
}: {
  onDart: (s: number, m: Mult) => void
  disabled?: boolean
  highlight?: number[] | null
  className?: string
}) {
  const [hit, setHit] = useState<string | null>(null)
  const tap = (key: string, s: number, m: Mult) => {
    if (disabled) return
    setHit(key)
    window.setTimeout(() => setHit((h) => (h === key ? null : h)), 220)
    onDart(s, m)
  }
  const black = 'var(--board-black)'
  const cream = 'var(--board-cream)'
  const red = '#c8302c'
  const green = '#1f8a50'
  const flash = '#f2b134'

  return (
    <svg viewBox="-205 -205 410 410" className={`mx-auto block aspect-square select-none ${className}`} role="img" aria-label="dartboard">
      <circle r="204" fill="#0a0a0a" />
      {ORDER.map((n, i) => {
        const a1 = i * 18 - 9
        const a2 = i * 18 + 9
        const even = i % 2 === 0
        const single = even ? black : cream
        const ring = even ? red : green
        const dim = highlight && !highlight.includes(n) ? 0.35 : 1
        const parts: [string, number, number, Mult, string][] = [
          [`s1-${n}`, R.bullOut, R.tripleIn, 1, single],
          [`t-${n}`, R.tripleIn, R.tripleOut, 3, ring],
          [`s2-${n}`, R.tripleOut, R.doubleIn, 1, single],
          [`d-${n}`, R.doubleIn, R.doubleOut, 2, ring],
        ]
        const [tx, ty] = polar(R.numbers, i * 18)
        return (
          <g key={n} opacity={dim}>
            {parts.map(([key, r1, r2, m, fill]) => (
              <path
                key={key}
                d={sector(r1, r2, a1, a2)}
                fill={hit === key ? flash : fill}
                stroke="#888"
                strokeWidth="0.6"
                onClick={() => tap(key, n, m)}
                className={disabled ? '' : 'cursor-pointer hover:brightness-125'}
              />
            ))}
            <text
              x={tx}
              y={ty}
              fill="#f5f0e6"
              fontSize="19"
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="central"
              className="num pointer-events-none"
            >
              {n}
            </text>
          </g>
        )
      })}
      <g opacity={highlight && !highlight.includes(25) ? 0.35 : 1}>
        <circle r={R.bullOut} fill={hit === 'b25' ? flash : green} stroke="#888" strokeWidth="0.6" onClick={() => tap('b25', 25, 1)} className="cursor-pointer" />
        <circle r={R.bullIn} fill={hit === 'b50' ? flash : red} stroke="#888" strokeWidth="0.6" onClick={() => tap('b50', 25, 2)} className="cursor-pointer" />
      </g>
    </svg>
  )
}
