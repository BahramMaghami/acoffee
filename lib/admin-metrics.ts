import { formatPersianDate } from './date'
import { dashboardMonthSchema } from './validators/dashboard'

export const dashboardPeriods = [7, 30, 90] as const
export type DashboardPeriod = (typeof dashboardPeriods)[number]
export type DashboardSelection = { type: 'days'; days: DashboardPeriod } | { type: 'month'; year: number; month: number }

export function dashboardSelection(query: { days?: unknown; year?: unknown; month?: unknown }): DashboardSelection {
  const parsed = dashboardMonthSchema.safeParse(query)
  if (parsed.success) return { type: 'month', ...parsed.data }
  return { type: 'days', days: dashboardPeriod(query.days) }
}

export function dashboardPeriod(value: unknown): DashboardPeriod {
  return dashboardPeriods.find((days) => String(days) === value) ?? 30
}

const tehranDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit',
})
const shortPersianDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: 'Asia/Tehran', month: 'short', day: 'numeric',
})

/** Calendar day keys, not browser-local timestamps. SQL resolves Tehran midnights. */
export function dashboardWindow(period: DashboardPeriod, now = new Date()) {
  const parts = tehranDate.formatToParts(now)
  const part = (name: string) => Number(parts.find((item) => item.type === name)!.value)
  const today = Date.UTC(part('year'), part('month') - 1, part('day'))
  const day = 86_400_000
  const dates = Array.from({ length: period }, (_, index) =>
    new Date(today - (period - 1 - index) * day).toISOString().slice(0, 10),
  )
  return { period, dates, start: dates[0], endExclusive: new Date(today + day).toISOString().slice(0, 10) }
}

export type DailySalesRow = { day: string; revenue: string; orders: number; units: string }
export type DailySales = { date: string; label: string; shortLabel: string; revenue: number; orders: number; units: number }

function safeAmount(value: string | number) {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < 0) throw new RangeError('Dashboard amount exceeds safe integer precision')
  return number
}

export function summarizeSales(rows: DailySalesRow[], window: { dates: string[]; start: string; endExclusive: string }) {
  const byDay = new Map(rows.map((row) => [row.day, row]))
  const days: DailySales[] = window.dates.map((date) => {
    const row = byDay.get(date)
    const noon = new Date(`${date}T12:00:00Z`)
    return {
      date, label: formatPersianDate(noon), shortLabel: shortPersianDate.format(noon),
      revenue: safeAmount(row?.revenue ?? 0), orders: safeAmount(row?.orders ?? 0), units: safeAmount(row?.units ?? 0),
    }
  })
  const total = days.reduce((sum, day) => ({
    revenue: safeAmount(sum.revenue + day.revenue),
    orders: safeAmount(sum.orders + day.orders),
    units: safeAmount(sum.units + day.units),
  }), { revenue: 0, orders: 0, units: 0 })
  return { days, ...total, averageOrder: total.orders ? Math.round(total.revenue / total.orders) : 0 }
}
