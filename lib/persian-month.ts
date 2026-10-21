export const persianMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'] as const

const calendar = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  timeZone: 'Asia/Tehran', year: 'numeric', month: 'numeric',
})
const dayMs = 86400_000

export function currentPersianMonth(now = new Date()) {
  const parts = calendar.formatToParts(now)
  return { year: Number(parts.find(part => part.type === 'year')!.value), month: Number(parts.find(part => part.type === 'month')!.value) }
}

// Find a calendar month boundary using the same Intl Persian calendar as the UI.
// Noon UTC is safely within the corresponding Tehran calendar day. Only date
// keys are returned; PostgreSQL resolves their actual Tehran midnight instants.
function monthStart(year: number, month: number) {
  const target = year * 12 + month - 1
  let low = Math.floor(Date.UTC(year + 620, 0, 1) / dayMs)
  let high = Math.floor(Date.UTC(year + 623, 0, 1) / dayMs)
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    const date = currentPersianMonth(new Date(middle * dayMs + dayMs / 2))
    if (date.year * 12 + date.month - 1 < target) low = middle + 1
    else high = middle
  }
  return low
}

export function persianMonthWindow(year: number, month: number) {
  if (!Number.isInteger(year) || year < 1300 || year > 1500 || !Number.isInteger(month) || month < 1 || month > 12)
    throw new RangeError('Invalid Persian reporting month')
  const startDay = monthStart(year, month)
  const nextDay = monthStart(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1)
  const key = (day: number) => new Date(day * dayMs).toISOString().slice(0, 10)
  return { start: key(startDay), endExclusive: key(nextDay), dates: Array.from({ length: nextDay - startDay }, (_, index) => key(startDay + index)) }
}
