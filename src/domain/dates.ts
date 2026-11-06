const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const
const TIME_ZONE = 'America/Argentina/Buenos_Aires'

const PARTS_FORMAT = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** `5 nov 2026, 14:30`: Buenos Aires time, lowercase three-letter month, 24 h. */
export function formatDate(iso: string): string {
  const parts = Object.fromEntries(PARTS_FORMAT.formatToParts(new Date(iso)).map((part) => [part.type, part.value]))
  const month = MONTHS[Number(parts.month) - 1] ?? ''
  return `${Number(parts.day)} ${month} ${parts.year}, ${parts.hour}:${parts.minute}`
}
