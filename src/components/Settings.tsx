import { useApp } from '../store/app'
import { useT } from '../i18n'

export function LangSwitch() {
  const lang = useApp((s) => s.lang)
  const setLang = useApp((s) => s.setLang)
  return (
    <button
      onClick={() => setLang(lang === 'cs' ? 'en' : 'cs')}
      className="num h-10 rounded-lg px-2.5 text-lg font-bold uppercase hover:bg-surface-2"
      aria-label="language"
      title={lang === 'cs' ? 'English' : 'Čeština'}
    >
      {lang === 'cs' ? 'EN' : 'CZ'}
    </button>
  )
}

export function ThemeSwitch() {
  const t = useT()
  const theme = useApp((s) => s.theme)
  const setTheme = useApp((s) => s.setTheme)
  const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
  const title = theme === 'system' ? t('themeSystem') : theme === 'light' ? t('themeLight') : t('themeDark')
  return (
    <button onClick={() => setTheme(next)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-2" title={`${t('theme')}: ${title}`} aria-label={t('theme')}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {theme === 'light' ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : theme === 'dark' ? (
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3v18" />
            <path d="M12 3a9 9 0 010 18z" fill="currentColor" />
          </>
        )}
      </svg>
    </button>
  )
}

export function SettingsButtons() {
  return (
    <div className="flex items-center">
      <ThemeSwitch />
      <LangSwitch />
    </div>
  )
}
