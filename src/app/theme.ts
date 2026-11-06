export type Theme = 'bosque' | 'azul'

export function getTheme(): Theme {
  try {
    return localStorage.getItem('greelow-theme') === 'azul' ? 'azul' : 'bosque'
  } catch {
    // Appearance is optional when the browser blocks storage.
    return 'bosque'
  }
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem('greelow-theme', theme)
  } catch {
    // Keep the selected appearance for this page when persistence is unavailable.
  }
}
