import { test } from 'node:test'
import assert from 'node:assert/strict'
import { orderStatusUpdate } from '../../lib/order-status-update'
import { adminOrderSchema, adminOrdersPage } from '../../lib/validators/admin-orders'

const before = { paymentStatus: 'UNPAID' as const, status: 'PENDING' as const, paidAt: null, deliveredAt: null }
const first = new Date('2026-10-21T10:00:00.000Z')
const later = new Date('2026-10-21T11:00:00.000Z')

test('payment and delivery record independent timestamps and preserve first confirmation on repeat', () => {
  const payment = orderStatusUpdate(before, 'paid', true, first)
  assert.deepEqual(payment, { paymentStatus: 'PAID', paidAt: first })
  assert.deepEqual(orderStatusUpdate({ ...before, ...payment }, 'paid', true, later), payment)
  const delivery = orderStatusUpdate({ ...before, ...payment }, 'delivered', true, later)
  assert.deepEqual(delivery, { status: 'DELIVERED', deliveredAt: later })
  assert.deepEqual(orderStatusUpdate({ ...before, ...delivery }, 'delivered', true, first), delivery)
})

test('removing confirmations clears dates without resetting the other status', () => {
  const completed = { paymentStatus: 'PAID' as const, status: 'DELIVERED' as const, paidAt: first, deliveredAt: first }
  assert.deepEqual(orderStatusUpdate(completed, 'paid', false, later), { paymentStatus: 'UNPAID', paidAt: null })
  assert.deepEqual(orderStatusUpdate(completed, 'delivered', false, later), { status: 'PENDING', deliveredAt: null })
  assert.deepEqual(orderStatusUpdate({ ...before, paymentStatus: 'REFUNDED', status: 'SHIPPED' }, 'delivered', false, later), { status: 'SHIPPED', deliveredAt: null })
})

test('legacy confirmed states only gain a date on explicit confirmation; re-confirmation after undo uses new time', () => {
  assert.deepEqual(orderStatusUpdate({ ...before, paymentStatus: 'PAID' }, 'paid', true, later), { paymentStatus: 'PAID', paidAt: later })
  const unset = orderStatusUpdate({ ...before, status: 'DELIVERED', deliveredAt: first }, 'delivered', false, later)
  assert.deepEqual(orderStatusUpdate({ ...before, ...unset }, 'delivered', true, later), { status: 'DELIVERED', deliveredAt: later })
})

test('admin order inputs require valid IDs, explicit booleans and a concurrency timestamp', () => {
  const input = { orderId: 'clabcdefg00000123456789012', expectedUpdatedAt: first.toISOString() }
  assert.ok(adminOrderSchema.safeParse({ ...input, operation: 'delete' }).success)
  assert.ok(adminOrderSchema.safeParse({ ...input, operation: 'status', field: 'paid', value: true }).success)
  for (const changes of [{ value: 'false' }, { field: 'total' }, { orderId: '' }, { expectedUpdatedAt: '' }, { operation: 'deleteAll' }]) {
    assert.equal(adminOrderSchema.safeParse({ ...input, operation: 'status', field: 'paid', value: true, ...changes }).success, false)
  }
  assert.equal(adminOrdersPage('2'), 2)
  for (const value of ['0', '-1', '1.5', '9007199254740992', ['2'], undefined]) assert.equal(adminOrdersPage(value), 1)
})
