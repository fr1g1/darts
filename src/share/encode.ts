import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { Game, GameEvent, Mult } from '../engine'

// dart code: (segIndex * 3 + m - 1), segIndex 0..21 (21 = bull) → 0..65, as char 48+code
// winner event: '~' + (p+1) char or '~0' for draw
const encEvents = (evs: GameEvent[]) =>
  evs
    .map((e) => {
      if (e.k === 'w') return '~' + String.fromCharCode(48 + (e.p === null ? 0 : e.p + 1))
      const idx = e.s === 25 ? 21 : e.s
      return String.fromCharCode(48 + idx * 3 + (e.m - 1))
    })
    .join('')

const decEvents = (s: string): GameEvent[] => {
  const out: GameEvent[] = []
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '~') {
      const v = s.charCodeAt(++i) - 48
      out.push({ k: 'w', p: v === 0 ? null : v - 1 })
      continue
    }
    const code = s.charCodeAt(i) - 48
    const idx = Math.floor(code / 3)
    out.push({ k: 'd', s: idx === 21 ? 25 : idx, m: ((code % 3) + 1) as Mult })
  }
  return out
}

interface Packed {
  v: 1 | 2
  c: Game['config']
  /** v2: [nickname, color]; v1: [name, nickname, color] */
  p: string[][]
  e: string
  t: number
  f?: number
}

export function encodeGame(g: Game): string {
  const packed: Packed = {
    v: 2,
    c: g.config,
    p: g.players.map((p) => [p.name, p.color]),
    e: encEvents(g.events),
    t: g.startedAt,
    f: g.finishedAt,
  }
  return compressToEncodedURIComponent(JSON.stringify(packed))
}

export function decodeGame(data: string): Game | null {
  try {
    const json = decompressFromEncodedURIComponent(data)
    if (!json) return null
    const p = JSON.parse(json) as Packed
    if ((p.v !== 1 && p.v !== 2) || !p.c?.mode || !Array.isArray(p.p)) return null
    return {
      id: 'shared',
      config: p.c,
      players: p.p.map((x, i) =>
        p.v === 1 ? { id: 's' + i, name: x[1] || x[0], color: x[2] } : { id: 's' + i, name: x[0], color: x[1] },
      ),
      events: decEvents(p.e ?? ''),
      startedAt: p.t,
      finishedAt: p.f,
    }
  } catch {
    return null
  }
}

export const shareUrl = (g: Game) => `${location.origin}${location.pathname}#/r/${encodeGame(g)}`
