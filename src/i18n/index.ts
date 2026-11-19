import { useApp } from '../store/app'
import { cs, type Dict } from './cs'
import { en } from './en'

export type Lang = 'cs' | 'en'
export type TKey = keyof Dict
export const dicts: Record<Lang, Dict> = { cs, en }

export const translate = (lang: Lang) => (k: TKey) => dicts[lang][k] ?? k

export function useT() {
  const lang = useApp((s) => s.lang)
  return translate(lang)
}
