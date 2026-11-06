import { useState } from 'react'
import { ChevronDown, Palette } from 'lucide-react'
import { getTheme, setTheme } from './theme'

export function ThemeSelect() {
  const [theme, updateTheme] = useState(() => {
    const current = document.documentElement.dataset.theme
    return current === 'bosque' || current === 'azul' ? current : getTheme()
  })

  return (
    <div className="relative shrink-0">
      <select
        aria-label="Tema"
        title="Cambiar tema"
        value={theme}
        onChange={(event) => {
          const next = event.target.value === 'azul' ? 'azul' : 'bosque'
          setTheme(next)
          updateTheme(next)
        }}
        className="min-h-10 w-10 cursor-pointer appearance-none rounded-pill border-[1.5px] border-neutral-600 bg-bg text-input font-semibold text-transparent hover:bg-primary-tint xl:w-[11.5rem] xl:pl-3 xl:pr-8 xl:text-sm xl:text-ink"
      >
        <option value="bosque" className="bg-paper text-ink">Bosque y marfil</option>
        <option value="azul" className="bg-paper text-ink">Azul y porcelana</option>
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center gap-0.5 text-ink xl:hidden">
        <Palette size={16} />
        <ChevronDown size={12} />
      </span>
      <ChevronDown aria-hidden="true" size={14} className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-ink xl:block" />
    </div>
  )
}
