import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dashboardPeriod, dashboardWindow, summarizeSales } from '../../lib/admin-metrics'

test('dashboard accepts only supported periods and defaults to thirty days', () => {
  assert.equal(dashboardPeriod('7'), 7)
  assert.equal(dashboardPeriod('90'), 90)
  for (const input of [undefined, '0', '-1', '365', ['7'], '7 OR 1=1']) assert.equal(dashboardPeriod(input), 30)
})

test('dashboard dates use Tehran midnight and cross Gregorian year boundaries', () => {
  const before = dashboardWindow(7, new Date('2025-12-31T20:29:59Z'))
  assert.equal(before.dates.at(-1), '2025-12-31')
  const after = dashboardWindow(7, new Date('2025-12-31T20:30:00Z'))
  assert.equal(after.start, '2025-12-26')
  assert.equal(after.dates.at(-1), '2026-01-01')
  assert.equal(after.endExclusive, '2026-01-02')
  assert.equal(after.dates.length, 7)
})

test('sales summaries zero-fill missing days and distinguish orders from units', () => {
  const window = dashboardWindow(7, new Date('2026-03-21T10:00:00Z'))
  const report = summarizeSales([
    { day: '2026-03-20', revenue: '10000', orders: 2, units: '7' },
    { day: '2026-03-21', revenue: '20000', orders: 1, units: '4' },
    { day: '2026-01-01', revenue: '999999', orders: 1, units: '1' },
  ], window)
  assert.equal(report.revenue, 30000)
  assert.equal(report.orders, 3)
  assert.equal(report.units, 11)
  assert.equal(report.averageOrder, 10000)
  assert.equal(report.days.filter(day => day.orders === 0).length, 5)
  assert.match(report.days.at(-1)!.label, /۱ فروردین ۱۴۰۵/)
})

test('an empty sales period has zero totals and no invented chart data', () => {
  const report = summarizeSales([], dashboardWindow(30, new Date('2026-10-19T10:00:00Z')))
  assert.equal(report.revenue, 0)
  assert.equal(report.averageOrder, 0)
  assert.equal(report.days.length, 30)
  assert.ok(report.days.every(day => day.revenue === 0 && day.orders === 0 && day.units === 0))
})

test('financial totals fail explicitly instead of losing integer precision', () => {
  const window = dashboardWindow(7, new Date('2026-10-19T10:00:00Z'))
  assert.throws(() => summarizeSales([{ day: '2026-10-19', revenue: '9007199254740992', orders: 1, units: '1' }], window), RangeError)
  assert.throws(() => summarizeSales([
    { day: '2026-10-18', revenue: '9007199254740991', orders: 1, units: '1' },
    { day: '2026-10-19', revenue: '1', orders: 1, units: '1' },
  ], window), RangeError)
})
