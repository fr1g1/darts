import type { Dart, X01Out } from './types'

const DOUBLE_PREF = [20, 16, 18, 12, 10, 8, 14, 6, 4, 2, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1, 25]

const allDarts = (): Dart[] => {
  const out: Dart[] = []
  for (let s = 20; s >= 1; s--) out.push({ s, m: 3 })
  out.push({ s: 25, m: 1 }, { s: 25, m: 2 })
  for (let s = 20; s >= 1; s--) out.push({ s, m: 1 })
  for (let s = 20; s >= 1; s--) out.push({ s, m: 2 })
  return out
}
const ALL = allDarts()
const val = (d: Dart) => d.s * d.m

/** preferred single dart scoring exactly v (setup darts) */
function single(v: number): Dart | null {
  if (v >= 1 && v <= 20) return { s: v, m: 1 }
  if (v === 25) return { s: 25, m: 1 }
  if (v === 50) return { s: 25, m: 2 }
  if (v % 3 === 0 && v <= 60) return { s: v / 3, m: 3 }
  if (v % 2 === 0 && v <= 40) return { s: v / 2, m: 2 }
  return null
}

function finishers(out: X01Out): Dart[] {
  const doubles = DOUBLE_PREF.map((s) => ({ s, m: 2 as const }))
  if (out === 'double') return doubles
  const triples: Dart[] = []
  for (let s = 20; s >= 1; s--) triples.push({ s, m: 3 })
  if (out === 'master') return [...doubles, ...triples]
  return [...ALL].sort((a, b) => val(b) - val(a))
}

/** Suggest a checkout for `rem` with at most `darts` darts, or null */
export function suggestCheckout(rem: number, darts: number, out: X01Out): Dart[] | null {
  if (rem <= 0 || darts <= 0 || rem > 180) return null
  const fin = finishers(out)
  for (const f of fin) if (val(f) === rem) return [f]
  if (darts >= 2) {
    for (const f of fin) {
      const a = single(rem - val(f))
      if (a) return [a, f]
    }
  }
  if (darts >= 3) {
    for (const f of fin) {
      for (const a of ALL) {
        const b = single(rem - val(f) - val(a))
        if (b) return [a, b, f]
      }
    }
  }
  return null
}
