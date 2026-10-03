'use client'

import { useSyncExternalStore } from 'react'
import { defaultTheme, themeStorageKey, type Theme } from './theme'

const themeEvent = 'acoffee:theme-change'

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  window.dispatchEvent(new Event(themeEvent))
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== themeStorageKey && event.key !== null) return
    applyTheme(event.newValue === 'light' ? 'light' : defaultTheme)
  }
  window.addEventListener(themeEvent, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(themeEvent, listener)
    window.removeEventListener('storage', onStorage)
  }
}

function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function setTheme(theme: Theme) {
  applyTheme(theme)
  try {
    localStorage.setItem(themeStorageKey, theme)
  } catch {
    // Switching still works when browser storage is unavailable.
  }
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme, () => defaultTheme)
}
