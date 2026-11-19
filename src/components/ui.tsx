import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'green'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-110 shadow-sm',
  green: 'bg-green text-white hover:brightness-110 shadow-sm',
  secondary: 'bg-surface-2 text-ink hover:brightness-105 border border-line',
  ghost: 'bg-transparent text-ink hover:bg-surface-2',
  danger: 'bg-transparent text-accent border border-accent/40 hover:bg-accent/10',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'h-14 px-6 text-lg' : size === 'sm' ? 'h-9 px-3 text-sm' : 'h-12 px-4'
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-40 ${sz} ${variants[variant]} ${className}`}
      {...rest}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface p-4 sm:p-5 ${className}`}>{children}</div>
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{children}</div>
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  className = '',
  nowrap,
  compact,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  className?: string
  nowrap?: boolean
  /** smaller buttons, e.g. inside a top bar */
  compact?: boolean
}) {
  return (
    <div className={`flex ${nowrap ? 'flex-nowrap' : 'flex-wrap'} rounded-xl bg-surface-2 ${compact ? 'gap-0.5 p-0.5' : 'gap-1 p-1'} ${className}`}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg text-sm font-semibold whitespace-nowrap transition ${compact ? 'flex h-8 items-center justify-center px-2.5' : 'min-h-10 px-3'} ${
            o.value === value ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  return (
    <div className="flex w-full items-center rounded-xl border border-line bg-surface-2">
      <button type="button" className="h-11 w-14 shrink-0 rounded-l-xl text-xl font-bold hover:bg-surface" onClick={() => onChange(clamp(value - step))} aria-label="−">
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        className="num h-11 min-w-0 flex-1 bg-transparent text-center text-xl font-bold outline-none"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          if (!Number.isNaN(v)) onChange(clamp(v))
        }}
      />
      <button type="button" className="h-11 w-14 shrink-0 rounded-r-xl text-xl font-bold hover:bg-surface" onClick={() => onChange(clamp(value + step))} aria-label="+">
        +
      </button>
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
      <span className="font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-green' : 'bg-line'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </label>
  )
}

export function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  return (
    <span
      className="num inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ background: color, width: size, height: size, fontSize: size * 0.42 }}
    >
      {initials || '?'}
    </span>
  )
}

export function TopBar({ title, onBack, right }: { title: ReactNode; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        {onBack && (
          <button onClick={onBack} className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-2" aria-label="back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <h1 className="num min-w-0 flex-1 truncate text-2xl font-bold tracking-wide uppercase">{title}</h1>
        {right}
      </div>
    </header>
  )
}
