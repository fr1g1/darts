import { useMemo } from 'react'
import { replay } from '../engine'
import { useApp } from '../store/app'
import { useT } from '../i18n'
import { configLabel, playerLabel } from '../share/format'
import { Avatar, Button, TopBar } from '../components/ui'

export function History() {
  const t = useT()
  const { history, go, deleteHistory, lang } = useApp()
  const items = useMemo(() => history.map((g) => ({ g, snap: replay(g) })), [history])
  return (
    <div className="min-h-dvh">
      <TopBar
        title={t('history')}
        onBack={() => go('home')}
        right={
          history.length > 0 && (
            <Button size="sm" variant="danger" onClick={() => confirm(t('confirmClearHistory')) && deleteHistory()}>
              {t('clearHistory')}
            </Button>
          )
        }
      />
      <main className="mx-auto grid max-w-5xl gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 && <p className="col-span-full py-10 text-center text-muted">{t('noHistory')}</p>}
        {items.map(({ g, snap }) => {
          const w = snap.winner !== null ? g.players[snap.winner] : null
          return (
            <div
              key={g.id}
              role="button"
              tabIndex={0}
              onClick={() => go('results', g.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && go('results', g.id)}
              className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-ink/40"
            >
              <div className="-mt-1 -mr-2 flex items-center justify-between gap-2 text-xs text-muted">
                <span>{new Date(g.finishedAt ?? g.startedAt).toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(t('confirmDeleteResult'))) deleteHistory(g.id)
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-base text-accent hover:bg-surface-2"
                  aria-label={t('deleteResult')}
                  title={t('deleteResult')}
                >
                  ✕
                </button>
              </div>
              <div className="num text-2xl font-bold">{configLabel(g, t)}</div>
              <div className="flex items-center gap-2">
                {w ? (
                  <>
                    <Avatar name={w.name} color={w.color} size={28} />
                    <span className="truncate font-semibold">🏆 {playerLabel(w)}</span>
                  </>
                ) : (
                  <span className="font-semibold">{t('draw')}</span>
                )}
              </div>
              <div className="truncate text-sm text-muted">{g.players.map((p) => p.name).join(', ')}</div>
            </div>
          )
        })}
      </main>
    </div>
  )
}
