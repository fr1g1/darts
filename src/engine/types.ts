export type Mult = 1 | 2 | 3

/** s: 0 = miss, 1–20, 25 = bull (m=2 → bullseye 50) */
export interface Dart {
  s: number
  m: Mult
}

export type DartEvent = { k: 'd'; s: number; m: Mult; auto?: boolean }
/** Manual leg resolution (bull-off). p = player index, null = draw. */
export type WinnerEvent = { k: 'w'; p: number | null }
export type GameEvent = DartEvent | WinnerEvent

export type ModeId = 'x01' | 'highscore' | 'shanghai' | 'baseball' | 'cricket'
export type TieBreak = 'draw' | 'bulloff'

interface BaseConfig {
  /** First to N legs */
  legs: number
  /** How a tie at the top is resolved at the end of a leg */
  tieBreak: TieBreak
}

export type X01In = 'straight' | 'double'
export type X01Out = 'straight' | 'double' | 'master'

export interface X01Config extends BaseConfig {
  mode: 'x01'
  start: number
  inMode: X01In
  outMode: X01Out
  maxRounds: number | null
  /** What decides the leg when the round limit is reached */
  limitRule: 'lowest' | 'bulloff'
}

export interface HighScoreConfig extends BaseConfig {
  mode: 'highscore'
  rounds: number
}

export interface ShanghaiConfig extends BaseConfig {
  mode: 'shanghai'
  /** 1–21; round 21 targets bull */
  rounds: number
  instantWin: boolean
}

export interface BaseballConfig extends BaseConfig {
  mode: 'baseball'
  innings: number
}

export type CricketScoring = 'standard' | 'cutthroat' | 'none'

export interface CricketConfig extends BaseConfig {
  mode: 'cricket'
  scoring: CricketScoring
  maxRounds: number | null
}

export type GameConfig = X01Config | HighScoreConfig | ShanghaiConfig | BaseballConfig | CricketConfig

export interface PlayerProfile {
  id: string
  /** the player's nickname (only identifier shown in the app) */
  name: string
  color: string
}

export interface Game {
  id: string
  config: GameConfig
  players: PlayerProfile[]
  events: GameEvent[]
  startedAt: number
  finishedAt?: number
}

export const dartValue = (d: Dart) => d.s * d.m

export function dartLabel(d: Dart): string {
  if (d.s === 0) return '0'
  if (d.s === 25) return d.m === 2 ? 'BULL' : '25'
  return (d.m === 3 ? 'T' : d.m === 2 ? 'D' : '') + d.s
}
