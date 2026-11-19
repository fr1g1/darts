import { dartLabel, suggestCheckout, type Game, type Snapshot, type X01State } from '../engine'
import { useT } from '../i18n'

export function TurnBar({ game, snap }: { game: Game; snap: Snapshot }) {
  const t = useT()
  const p = game.players[snap.current]
  const last = snap.turns[snap.turns.length - 1]
  const lastP = last ? game.players[last.p] : null
  const mode = game.config.mode
  const turnSum = snap.turnDarts.reduce((a, d) => a + d.s * d.m, 0)
  const cfg = game.config
  const x01 = cfg.mode === 'x01' && !snap.finished ? (snap.state as X01State) : null
  const checkout =
    x01 && cfg.mode === 'x01' && x01.opened[snap.current] && x01.rem[snap.current] > 0
      ? suggestCheckout(x01.rem[snap.current], 3 - snap.turnDarts.length, cfg.outMode)
      : null
  return (
    <div className="rounded-2xl border border-line bg-surface p-2.5 sm:p-3 short:px-2 short:py-1.5">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.color }} />
        <span className="truncate font-semibold short:text-sm">{p.name}</span>
        {checkout && (
          <span className="flex items-center gap-1" title={t('checkout')}>
            {checkout.map((d, k) => (
              <span key={k} className="num rounded-md bg-green/15 px-1.5 text-sm font-bold text-green">
                {dartLabel(d)}
              </span>
            ))}
          </span>
        )}
        <span className="ml-auto shrink-0 text-xs text-muted">
          {game.config.legs > 1 && `${t('leg')} ${snap.leg} · `}
          {t('round')} {snap.round}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 short:mt-1">
        {[0, 1, 2].map((i) => {
          const d = snap.turnDarts[i]
          return (
            <div
              key={i}
              className={`num flex h-11 items-center justify-center rounded-lg text-xl font-bold short:h-8 short:text-lg ${
                d ? 'animate-pop bg-surface-2' : i === snap.turnDarts.length ? 'border-2 border-dashed border-gold/70' : 'border border-dashed border-line'
              } ${d?.m === 3 ? 'text-accent' : d?.m === 2 ? 'text-green' : ''}`}
            >
              {d ? dartLabel(d) : ''}
            </div>
          )
        })}
        <div className="num flex h-11 min-w-14 items-center justify-center rounded-lg bg-ink px-2 text-2xl font-bold text-bg short:h-8 short:text-xl">
          {mode === 'x01' || mode === 'highscore' ? turnSum : snap.turnDarts.length ? turnSum : '·'}
        </div>
      </div>
      {/* always rendered with a fixed height so the bar never jumps */}
      <div className="mt-1.5 flex h-5 items-center gap-1.5 truncate text-xs text-muted short:mt-1 short:h-4">
        <span>{t('lastTurn')}:</span>
        {last && lastP ? (
          <>
            <span className="font-semibold" style={{ color: lastP.color }}>
              {lastP.name}
            </span>
            <span className="num text-sm">{last.darts.map(dartLabel).join(' · ')}</span>
            <span className={`num ml-auto text-sm font-bold ${last.bust ? 'text-accent' : 'text-ink'}`}>{last.bust ? 'BUST' : last.value}</span>
          </>
        ) : (
          <span>–</span>
        )}
      </div>
    </div>
  )
}
