import { moneyRatio, maxPrice } from './product-pricing'

export class DiscountCodeError extends Error {}
export type CodeRules = { type: 'PERCENT' | 'FIXED'; value: number; isActive: boolean; expiresAt: Date; maxUsers: number; maxUsesPerUser: number }
export type CodeUsage = { users: number; userUses: number }
export function checkDiscountEligibility(code: CodeRules, usage: CodeUsage, now = new Date()) {
  if (!code.isActive) throw new DiscountCodeError('این کد تخفیف غیرفعال شده است.')
  if (code.expiresAt.getTime() <= now.getTime()) throw new DiscountCodeError('مهلت استفاده از این کد تمام شده است.')
  if (usage.userUses >= code.maxUsesPerUser) throw new DiscountCodeError('تعداد مجاز استفادهٔ شما از این کد تمام شده است.')
  // N is the number of distinct accounts, not the total number of orders.
  if (usage.userUses === 0 && usage.users >= code.maxUsers) throw new DiscountCodeError('ظرفیت کاربران این کد تکمیل شده است.')
}
export function couponAmount(subtotal: number, type: CodeRules['type'], value: number) {
  if (![subtotal, value].every(Number.isSafeInteger) || subtotal <= 0 || subtotal > maxPrice || value <= 0 || value > maxPrice || (type === 'PERCENT' && value > 100)) throw new DiscountCodeError('مبلغ تخفیف معتبر نیست.')
  const amount = type === 'PERCENT' ? moneyRatio(subtotal, value, 100) : Math.min(value, subtotal)
  if (amount <= 0) throw new DiscountCodeError('مبلغ سفارش برای اعمال این تخفیف کافی نیست.')
  return amount
}
