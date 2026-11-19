import { useState } from 'react'
import { useT } from '../i18n'
import { useApp } from '../store/app'
import { PlayerForm } from '../components/PlayerForm'
import { Avatar, Button, Card, Label, TopBar } from '../components/ui'
import { SettingsButtons } from '../components/Settings'

export function Players() {
  const t = useT()
  const { players, savePlayer, deletePlayer, go } = useApp()
  const [editing, setEditing] = useState<string | null>(null)
  return (
    <div className="min-h-dvh">
      <TopBar title={t('players')} onBack={() => go('home')} right={<SettingsButtons />} />
      <main className="mx-auto grid max-w-5xl gap-4 px-4 py-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:py-6">
        <Card className="self-start md:sticky md:top-20">
          <Label>{t('addPlayer')}</Label>
          <PlayerForm onSubmit={savePlayer} usedColors={players.map((p) => p.color)} />
        </Card>
        <div className="flex flex-col gap-2">
          {players.length === 0 && <p className="py-8 text-center text-muted">{t('noPlayers')}</p>}
          {players.map((p) =>
            editing === p.id ? (
              <Card key={p.id}>
                <Label>{t('editPlayer')}</Label>
                <PlayerForm
                  initial={p}
                  onSubmit={(v) => {
                    savePlayer(v)
                    setEditing(null)
                  }}
                  onCancel={() => setEditing(null)}
                />
              </Card>
            ) : (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                <Avatar name={p.name} color={p.color} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-semibold">{p.name}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditing(p.id)}>
                  {t('edit')}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    if (confirm(t('confirmDeletePlayer'))) deletePlayer(p.id)
                  }}
                >
                  {t('delete')}
                </Button>
              </div>
            ),
          )}
        </div>
      </main>
    </div>
  )
}
