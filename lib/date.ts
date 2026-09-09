const persianDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'Asia/Tehran',
})

/** Format a Gregorian database timestamp for Persian UI; never mutate stored dates. */
export function formatPersianDate(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid date')
  return persianDate.format(date)
}
