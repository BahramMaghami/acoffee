import type { Order, PaymentAttempt, DiscountReservation, DiscountRedemption } from '../../generated/prisma/client'
import type { getDb } from '../../lib/db'
import { paymentService } from '../../lib/payments'
import { paymentConfig } from '../../lib/payment-rules'
import type { PaymentGateway } from '../../lib/zarinpal'

export const sandboxConfig = paymentConfig({ ZARINPAL_SANDBOX: 'true', ZARINPAL_MERCHANT_ID: 'f58f584a-2d2a-4daa-974a-8259d22ba8e6', PAYMENT_BASE_URL: 'http://localhost:3000' })
export const owner = { id: 'owner', sessionVersion: 0 }
export const admin = { id: 'admin', role: 'ADMIN', sessionVersion: 0 }
export function paymentFixture({ coupon = false, total = 10000 } = {}) {
  let clock = Date.parse('2026-11-08T10:00:00Z')
  let sequence = 0
  const state = {
    order: { id: 'order', userId: 'owner', number: 1, total, status: 'PENDING', paymentStatus: 'UNPAID', phone: '09121234567',
      paymentEnvironment: 'SANDBOX', paymentExpiresAt: new Date(clock + 30 * 60000), updatedAt: new Date(clock),
      discountCode: coupon ? 'ABCD234567' : null, supersededAt: null, paidAt: null } as unknown as Order,
    payments: [] as PaymentAttempt[], redemptions: [] as DiscountRedemption[],
    reservation: (coupon ? { id: 'reservation', orderId: 'order', userId: 'owner', discountCodeId: 'coupon', amount: 2000, status: 'ACTIVE', environment: 'SANDBOX', expiresAt: new Date(clock + 30 * 60000) } : null) as unknown as DiscountReservation | null,
    requests: 0, verifies: 0, inquiries: 0, failSettlement: false, version: 0,
    bank: 'PAID' as Awaited<ReturnType<PaymentGateway['inquiry']>>,
  }
  type Where = Record<string, unknown>
  function matches(row: object, where: Where = {}): boolean {
    return Object.entries(where).every(([key, value]) => {
      const actual = (row as Where)[key]
      if (value && typeof value === 'object' && 'in' in value) return (value.in as unknown[]).includes(actual)
      return actual === value
    })
  }
  function update(row: object, data: object) { Object.assign(row, data, { updatedAt: new Date(++clock) }); return row }
  const tx = {
    $queryRaw: async () => [],
    user: { findUnique: async ({ where }: { where: { id: string } }) => ['owner', 'admin'].includes(where.id) ? { name: where.id, sessionVersion: state.version, role: where.id === 'admin' ? 'ADMIN' : 'CUSTOMER' } : null },
    order: {
      findUniqueOrThrow: async ({ where }: { where: Where }) => { if (!matches(state.order, where)) throw Error('not found'); return structuredClone(state.order) },
      update: async ({ data }: { data: object }) => update(state.order, data),
    },
    paymentAttempt: {
      findFirst: async ({ where }: { where: Where }) => structuredClone(state.payments.filter(p => matches(p, where)).at(-1) ?? null),
      findUniqueOrThrow: async ({ where }: { where: Where }) => { const p = state.payments.find(p => matches(p, where)); if (!p) throw Error('not found'); return structuredClone(p) },
      findMany: async ({ where }: { where: Where }) => structuredClone(state.payments.filter(p => matches(p, where))),
      create: async ({ data }: { data: object }) => {
        const value = { id: `attempt-${++sequence}`, authority: null, referenceId: null, leaseToken: null, leaseUntil: null, verificationStartedAt: null, createdAt: new Date(clock), ...data } as PaymentAttempt
        state.payments.push(value); return structuredClone(value)
      },
      update: async ({ where, data }: { where: Where; data: object }) => {
        if ('status' in data && data.status === 'SUCCEEDED' && state.failSettlement) throw Error('DB connection lost after verification')
        const value = state.payments.find(p => matches(p, where)); if (!value) throw Error('not found'); return update(value, data)
      },
      updateMany: async ({ where, data }: { where: Where; data: object }) => {
        const rows = state.payments.filter(p => matches(p, where)); rows.forEach(p => update(p, data)); return { count: rows.length }
      },
    },
    discountReservation: {
      findUnique: async () => structuredClone(state.reservation),
      update: async ({ data }: { data: object }) => { if (!state.reservation) throw Error('not found'); return update(state.reservation, data) },
    },
    discountRedemption: { upsert: async ({ where, create }: { where: Where; create: DiscountRedemption }) => {
      const existing = state.redemptions.find(r => matches(r, where)); if (existing) return existing
      state.redemptions.push(structuredClone(create)); return create
    } },
  }
  let queue = Promise.resolve()
  const db = { ...tx, $transaction: async (fn: (transaction: typeof tx) => Promise<unknown>) => {
    const previous = queue; let release!: () => void
    queue = new Promise<void>(resolve => { release = resolve }); await previous
    const saved = structuredClone({ order: state.order, payments: state.payments, reservation: state.reservation, redemptions: state.redemptions })
    try { return await fn(tx) } catch (error) { Object.assign(state, saved); throw error } finally { release() }
  } } as unknown as ReturnType<typeof getDb>
  const gateway: PaymentGateway = {
    request: async () => { state.requests++; return 'S' + '1'.repeat(35) },
    redirect: authority => `https://sandbox.zarinpal.com/pg/StartPay/${authority}`,
    inquiry: async () => { state.inquiries++; return state.bank },
    verify: async () => { state.verifies++; return { referenceId: '123456', code: state.verifies === 1 ? 100 : 101 } },
  }
  return { state, db, gateway, service: paymentService(db, sandboxConfig, gateway, () => new Date(clock)),
    advance: (ms: number) => { clock += ms } }
}
