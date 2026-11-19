import { useEffect, useMemo, useState } from 'react'
import { useApp } from './store/app'
import { decodeGame } from './share/encode'
import { Home } from './screens/Home'
import { Players } from './screens/Players'
import { Setup } from './screens/Setup'
import { Game } from './screens/Game'
import { Results, SharedResult } from './screens/Results'
import { History } from './screens/History'

function useHash() {
  const [hash, setHash] = useState(() => location.hash)
  useEffect(() => {
    const on = () => setHash(location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

export default function App() {
  const { screen, game, theme, lang, go } = useApp()
  const hash = useHash()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = lang === 'cs' ? 'Šipky' : 'Darts'
  }, [lang])

  const shared = useMemo(() => (hash.startsWith('#/r/') ? decodeGame(hash.slice(4)) : undefined), [hash])
  if (shared !== undefined) {
    return (
      <SharedResult
        game={shared}
        onClose={() => {
          history.replaceState(null, '', location.pathname)
          window.dispatchEvent(new HashChangeEvent('hashchange'))
          go('home')
        }}
      />
    )
  }

  switch (screen) {
    case 'players':
      return <Players />
    case 'setup':
      return <Setup />
    case 'game':
      return game ? <Game /> : <Home />
    case 'results':
      return <Results />
    case 'history':
      return <History />
    default:
      return <Home />
  }
}
