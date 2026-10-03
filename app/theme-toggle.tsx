'use client'

import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { setTheme, useTheme } from './use-theme'

export function ThemeToggle() {
  const theme = useTheme()
  const label = theme === 'dark' ? 'تغییر به تم روشن' : 'تغییر به تم تیره'

  return (
    <Button
      variant="ghost"
      size="icon"
      className="theme-toggle"
      aria-label={label}
      title={label}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="theme-sun" aria-hidden="true" />
      <Moon className="theme-moon" aria-hidden="true" />
    </Button>
  )
}
