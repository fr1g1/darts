import type { Mult } from '../engine'
import { useT } from '../i18n'

export interface InputProps {
  onDart: (s: number, m: Mult) => void
  onUndo: () => void
  canUndo: boolean
  disabled?: boolean
  /** numbers that matter in this game (others dimmed) */
  highlight?: number[] | null
  mult: Mult
  setMult: (m: Mult) => void
}

const key =
  'num flex items-center justify-center rounded-xl font-bold transition active:scale-95 disabled:opacity-30'
/** keypad labels: a little bigger when keys are tall (cqh = keypad grid height), never smaller than before */
const keyFont = 'text-[clamp(1.6rem,6.5cqh,2.4rem)]'
/** text keys (Double/Triple) */
const wordFont = 'text-[clamp(1.1rem,4cqh,1.5rem)]'

function UndoButton({ onUndo, canUndo, font = 'text-2xl' }: Pick<InputProps, 'onUndo' | 'canUndo'> & { font?: string }) {
  const t = useT()
  return (
    <button disabled={!canUndo} onClick={onUndo} className={`${key} ${font} h-full w-full border border-line bg-surface-2`} aria-label={t('undo')} title={t('undo')}>
      <svg className="h-[0.9em] w-[0.9em]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M9 14L4 9l5-5" />
        <path d="M4 9h11a5 5 0 010 10h-3" />
      </svg>
    </button>
  )
}

function MissButton({ onDart, disabled, setMult, font = 'text-2xl' }: Pick<InputProps, 'onDart' | 'disabled' | 'setMult'> & { font?: string }) {
  const t = useT()
  return (
    <button
      disabled={disabled}
      onClick={() => {
        onDart(0, 1)
        setMult(1)
      }}
      className={`${key} ${font} h-full w-full border border-line bg-surface-2 text-muted`}
      title={t('miss')}
    >
      0
    </button>
  )
}

/** Controls under the dartboard: 0 (miss) and undo */
export function BoardControls(props: Pick<InputProps, 'onDart' | 'onUndo' | 'canUndo' | 'disabled'>) {
  return (
    <div className="grid h-12 shrink-0 grid-cols-2 gap-1.5 short:h-full short:w-20 short:grid-cols-1 short:grid-rows-2">
      <MissButton {...props} setMult={() => {}} />
      <UndoButton {...props} />
    </div>
  )
}

export function Keypad({ onDart, onUndo, canUndo, disabled, highlight, mult, setMult }: InputProps) {
  const t = useT()
  const nums = Array.from({ length: 20 }, (_, i) => i + 1)
  const throwNum = (n: number) => {
    onDart(n, n === 25 && mult === 3 ? 1 : mult)
    setMult(1)
  }
  // all 25 keys live in one 5×5 grid → identical size; in the side layout the grid stretches to the full height
  const cell = 'h-full min-h-0'
  return (
    // the grid is a size container: key labels grow a little with the key height (cqh), capped so they never get huge
    <div className="grid h-full grid-cols-5 grid-rows-5 gap-1.5 [container-type:size]">
      {nums.map((n) => {
        const dim = highlight && !highlight.includes(n)
        return (
          <button
            key={n}
            disabled={disabled}
            onClick={() => throwNum(n)}
            className={`${key} ${keyFont} ${cell} border border-line bg-surface ${dim ? 'opacity-35' : ''} ${highlight && !dim ? 'ring-2 ring-gold' : ''}`}
          >
            {n}
          </button>
        )
      })}
      <div className={cell}>
        <MissButton onDart={onDart} disabled={disabled} setMult={setMult} font={keyFont} />
      </div>
      <button
        disabled={disabled || mult === 3}
        onClick={() => throwNum(25)}
        className={`${key} ${keyFont} ${cell} border border-green/50 bg-surface text-green ${highlight && !highlight.includes(25) ? 'opacity-35' : ''}`}
        title="25 / Double = Bull 50"
      >
        25
      </button>
      <button
        disabled={disabled}
        aria-pressed={mult === 2}
        aria-label={t('double')}
        onClick={() => setMult(mult === 2 ? 1 : 2)}
        className={`${key} ${wordFont} ${cell} border uppercase ${mult === 2 ? 'border-green bg-green text-white' : 'border-line bg-surface-2 text-green'}`}
      >
        <span className="sm:hidden">D</span>
        <span className="hidden sm:inline">{t('double')}</span>
      </button>
      <button
        disabled={disabled}
        aria-pressed={mult === 3}
        aria-label={t('triple')}
        onClick={() => setMult(mult === 3 ? 1 : 3)}
        className={`${key} ${wordFont} ${cell} border uppercase ${mult === 3 ? 'border-accent bg-accent text-white' : 'border-line bg-surface-2 text-accent'}`}
      >
        <span className="sm:hidden">T</span>
        <span className="hidden sm:inline">{t('triple')}</span>
      </button>
      <div className={cell}>
        <UndoButton onUndo={onUndo} canUndo={canUndo} font={keyFont} />
      </div>
    </div>
  )
}
