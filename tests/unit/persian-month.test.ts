import { test } from 'node:test'
import assert from 'node:assert/strict'
import { currentPersianMonth, persianMonthWindow } from '../../lib/persian-month'
import { dashboardSelection, summarizeSales } from '../../lib/admin-metrics'

test('Persian months handle leap Esfand, common Esfand, Nowruz and month lengths', () => {
  for (const [year, month, start, end, days] of [
    [1403, 1, '2024-03-20', '2024-04-20', 31],
    [1403, 12, '2025-02-19', '2025-03-21', 30],
    [1404, 12, '2026-02-20', '2026-03-21', 29],
    [1405, 1, '2026-03-21', '2026-04-21', 31],
    [1405, 7, '2026-09-23', '2026-10-23', 30],
  ] as const) {
    const window = persianMonthWindow(year, month)
    assert.equal(window.start, start)
    assert.equal(window.endExclusive, end)
    assert.equal(window.dates.length, days)
    assert.equal(new Set(window.dates).size, days)
  }
})

test('the current Persian month switches at Tehran midnight', () => {
  assert.deepEqual(currentPersianMonth(new Date('2026-03-20T20:29:59Z')), { year: 1404, month: 12 })
  assert.deepEqual(currentPersianMonth(new Date('2026-03-20T20:30:00Z')), { year: 1405, month: 1 })
})

test('monthly filters validate both fields, normalize digits and override rolling periods', () => {
  assert.deepEqual(dashboardSelection({ year: '۱۴۰۵', month: '۷', days: '7' }), { type: 'month', year: 1405, month: 7 })
  for (const query of [{ year: '1405' }, { year: '1405', month: '13' }, { year: '99999', month: '1' }, { year: ['1405'], month: '1' }, { year: '1405.1', month: '7' }]) {
    assert.deepEqual(dashboardSelection(query), { type: 'days', days: 30 })
  }
  assert.deepEqual(dashboardSelection({ days: '7' }), { type: 'days', days: 7 })
  for (const [year, month] of [[1299, 1], [1501, 1], [1405, 0], [1405, 13], [1405.5, 1]]) assert.throws(() => persianMonthWindow(year, month), RangeError)
})

test('month totals cover the exact month and zero-fill all days', () => {
  const report = summarizeSales([
    { day: '2026-09-22', revenue: '9000', orders: 1, units: '1' },
    { day: '2026-09-23', revenue: '2000', orders: 1, units: '2' },
    { day: '2026-10-22', revenue: '4000', orders: 2, units: '4' },
    { day: '2026-10-23', revenue: '9000', orders: 1, units: '1' },
  ], persianMonthWindow(1405, 7))
  assert.equal(report.revenue, 6000)
  assert.equal(report.orders, 3)
  assert.equal(report.units, 6)
  assert.equal(report.averageOrder, 2000)
  assert.equal(report.days.length, 30)
})
