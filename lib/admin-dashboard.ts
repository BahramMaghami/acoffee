import 'server-only'
import { requireAdmin } from './current-user'
import { getDb } from './db'
import { logAuthError } from './auth-error'
import { dashboardWindow, summarizeSales, type DashboardPeriod, type DailySalesRow } from './admin-metrics'

export async function getAdminDashboard(period: DashboardPeriod) {
  // Guard the data boundary as well as the route; never trust a client role.
  await requireAdmin()
  const window = dashboardWindow(period)
  const rows = await getDb().$queryRaw<DailySalesRow[]>`
    WITH sales AS (
      SELECT "id", "total", COALESCE("paidAt", "createdAt") AS paid_on
      FROM "Order"
      WHERE "paymentStatus" = 'PAID'
        AND COALESCE("paidAt", "createdAt") >= (${window.start}::date::timestamp AT TIME ZONE 'Asia/Tehran')
        AND COALESCE("paidAt", "createdAt") < (${window.endExclusive}::date::timestamp AT TIME ZONE 'Asia/Tehran')
    ), daily AS (
      SELECT (paid_on AT TIME ZONE 'Asia/Tehran')::date::text AS day,
        SUM("total")::text AS revenue, COUNT(*)::integer AS orders
      FROM sales GROUP BY 1
    ), quantities AS (
      SELECT (s.paid_on AT TIME ZONE 'Asia/Tehran')::date::text AS day,
        SUM(i."quantity")::text AS units
      FROM sales s JOIN "OrderItem" i ON i."orderId" = s."id"
      GROUP BY 1
    )
    SELECT d.day, d.revenue, d.orders, COALESCE(q.units, '0') AS units
    FROM daily d LEFT JOIN quantities q ON q.day = d.day ORDER BY d.day
  `.catch((error: unknown) => {
    logAuthError('admin-dashboard', error)
    throw new Error('گزارش فروش دریافت نشد. دوباره تلاش کن.')
  })
  return { ...summarizeSales(rows, window), period }
}
