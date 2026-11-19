import type {
  BaseballConfig, CricketConfig, Dart, GameConfig, HighScoreConfig, ShanghaiConfig, X01Config,
} from './types'

export interface DartCtx {
  round: number
  /** darts already thrown in this turn (before the current one) */
  turnDarts: Dart[]
}

export interface DartResult<S> {
  state: S
  endTurn?: boolean
  bust?: boolean
  legWon?: boolean
  flag?: 'shanghai'
}

export interface ModeDef<C extends GameConfig, S> {
  initLeg(cfg: C, n: number): S
  dart(cfg: C, s: S, p: number, d: Dart, ctx: DartCtx): DartResult<S>
  roundLimit(cfg: C): number | null
  /** <0 when a is better than b */
  compare(cfg: C, s: S, a: number, b: number): number
  /** Value shown for a turn (points scored / marks) */
  turnValue(cfg: C, before: S, after: S, p: number): number
  /** Called when round limit hits: 'manual' requests bull-off; otherwise winner (null = draw). Undefined → default rule */
  resolveLimit?(cfg: C, s: S, ranked: number[]): number | null | 'manual' | undefined
}

// ---------- X01 ----------
export interface X01State {
  rem: number[]
  opened: boolean[]
}

export const x01: ModeDef<X01Config, X01State> = {
  initLeg: (cfg, n) => ({
    rem: Array(n).fill(cfg.start),
    opened: Array(n).fill(cfg.inMode === 'straight'),
  }),
  dart(cfg, s, p, d) {
    const opened = [...s.opened]
    if (!opened[p]) {
      if (d.m !== 2 || d.s === 0) return { state: s }
      opened[p] = true
    }
    const val = d.s * d.m
    const left = s.rem[p] - val
    const rem = [...s.rem]
    rem[p] = left
    const state = { rem, opened }
    if (left < 0) return { state: s, bust: true }
    if (cfg.outMode !== 'straight' && left === 1) return { state: s, bust: true }
    if (left === 0) {
      const ok =
        cfg.outMode === 'straight' ||
        (cfg.outMode === 'double' && d.m === 2) ||
        (cfg.outMode === 'master' && d.m >= 2)
      if (!ok) return { state: s, bust: true }
      return { state, legWon: true }
    }
    return { state }
  },
  roundLimit: (cfg) => cfg.maxRounds,
  compare: (_cfg, s, a, b) => s.rem[a] - s.rem[b],
  turnValue: (_cfg, before, after, p) => before.rem[p] - after.rem[p],
  resolveLimit: (cfg) => (cfg.limitRule === 'bulloff' ? 'manual' : undefined),
}

// ---------- HIGH SCORE ----------
export interface ScoreState {
  score: number[]
}

const scoreCompare = (_c: unknown, s: ScoreState, a: number, b: number) => s.score[b] - s.score[a]
const scoreTurn = (_c: unknown, before: ScoreState, after: ScoreState, p: number) => after.score[p] - before.score[p]
const addScore = (s: ScoreState, p: number, v: number): ScoreState => {
  const score = [...s.score]
  score[p] += v
  return { score }
}

export const highscore: ModeDef<HighScoreConfig, ScoreState> = {
  initLeg: (_cfg, n) => ({ score: Array(n).fill(0) }),
  dart: (_cfg, s, p, d) => ({ state: addScore(s, p, d.s * d.m) }),
  roundLimit: (cfg) => cfg.rounds,
  compare: scoreCompare,
  turnValue: scoreTurn,
}

// ---------- SHANGHAI ----------
export const shanghaiTarget = (round: number) => (round <= 20 ? round : 25)

export const shanghai: ModeDef<ShanghaiConfig, ScoreState> = {
  initLeg: (_cfg, n) => ({ score: Array(n).fill(0) }),
  dart(cfg, s, p, d, ctx) {
    const target = shanghaiTarget(ctx.round)
    if (d.s !== target) return { state: s }
    const state = addScore(s, p, d.s * d.m)
    if (cfg.instantWin && target !== 25) {
      const mults = new Set([...ctx.turnDarts.filter((x) => x.s === target).map((x) => x.m), d.m])
      if (mults.has(1) && mults.has(2) && mults.has(3)) return { state, legWon: true, flag: 'shanghai' }
    }
    return { state }
  },
  roundLimit: (cfg) => cfg.rounds,
  compare: scoreCompare,
  turnValue: scoreTurn,
}

// ---------- BASEBALL ----------
export const baseball: ModeDef<BaseballConfig, ScoreState> = {
  initLeg: (_cfg, n) => ({ score: Array(n).fill(0) }),
  dart: (_cfg, s, p, d, ctx) => (d.s === ctx.round ? { state: addScore(s, p, d.m) } : { state: s }),
  roundLimit: (cfg) => cfg.innings,
  compare: scoreCompare,
  turnValue: scoreTurn,
}

// ---------- CRICKET ----------
export const CRICKET_TARGETS = [20, 19, 18, 17, 16, 15, 25] as const

export interface CricketState {
  /** marks[p][i] capped at 3, i = index in CRICKET_TARGETS */
  marks: number[][]
  score: number[]
  /** total marks hit incl. scoring hits (for MPR) */
  hits: number[]
}

const allClosed = (s: CricketState, p: number) => s.marks[p].every((m) => m >= 3)

export const cricket: ModeDef<CricketConfig, CricketState> = {
  initLeg: (_cfg, n) => ({
    marks: Array.from({ length: n }, () => CRICKET_TARGETS.map(() => 0)),
    score: Array(n).fill(0),
    hits: Array(n).fill(0),
  }),
  dart(cfg, s, p, d) {
    const i = CRICKET_TARGETS.indexOf(d.s as (typeof CRICKET_TARGETS)[number])
    if (i < 0) return { state: s }
    const marks = s.marks.map((r) => [...r])
    const score = [...s.score]
    const hits = [...s.hits]
    const cur = marks[p][i]
    const toClose = Math.min(d.m, 3 - cur)
    const extra = d.m - toClose
    marks[p][i] = cur + toClose
    hits[p] += d.m
    if (extra > 0 && cfg.scoring !== 'none') {
      const open = marks.map((_, o) => o).filter((o) => o !== p && marks[o][i] < 3)
      if (cfg.scoring === 'standard' && open.length > 0) score[p] += extra * d.s
      if (cfg.scoring === 'cutthroat') for (const o of open) score[o] += extra * d.s
    }
    const state = { marks, score, hits }
    if (allClosed(state, p)) {
      const others = score.map((_, o) => o).filter((o) => o !== p)
      const won =
        cfg.scoring === 'none' ||
        (cfg.scoring === 'standard' && others.every((o) => score[p] >= score[o])) ||
        (cfg.scoring === 'cutthroat' && others.every((o) => score[p] <= score[o]))
      if (won) return { state, legWon: true }
    }
    return { state }
  },
  roundLimit: (cfg) => cfg.maxRounds,
  compare(cfg, s, a, b) {
    const ma = s.marks[a].reduce((x, y) => x + y, 0)
    const mb = s.marks[b].reduce((x, y) => x + y, 0)
    if (cfg.scoring === 'standard' && s.score[a] !== s.score[b]) return s.score[b] - s.score[a]
    if (cfg.scoring === 'cutthroat' && s.score[a] !== s.score[b]) return s.score[a] - s.score[b]
    return mb - ma
  },
  turnValue: (_cfg, before, after, p) => after.hits[p] - before.hits[p],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MODES: Record<GameConfig['mode'], ModeDef<any, any>> = { x01, highscore, shanghai, baseball, cricket }
