'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser, requireAdmin } from '@/lib/current-user'
import { getDb } from '@/lib/db'
import {
  createDiscountCodeSchema,
  discountCodeStatusSchema,
  applyDiscountCodeSchema,
} from '@/lib/validators/discount-codes'
import { generateDiscountCode } from '@/lib/discount-codes'
import { DiscountCodeError } from '@/lib/discount-code-rules'
import { checkoutQuote, CheckoutError } from '@/lib/checkout'
import { logAuthError } from '@/lib/auth-error'

export async function createDiscountCodeAction(input: unknown) {
  const admin = await requireAdmin()
  const parsed = createDiscountCodeSchema.safeParse(input)
  if (!parsed.success)
    return { success: false as const, message: parsed.error.issues[0].message }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const created = await getDb().$transaction(async (tx) => {
        if (
          (
            await tx.user.findUnique({
              where: { id: admin.id },
              select: { role: true },
            })
          )?.role !== 'ADMIN'
        )
          throw new DiscountCodeError('دسترسی مدیریت نداری.')
        const { validDays, ...data } = parsed.data
        return tx.discountCode.create({
          data: {
            ...data,
            code: generateDiscountCode(),
            expiresAt: new Date(Date.now() + validDays * 86400000),
          },
        })
      })
      revalidatePath('/admin/discount-generator')
      return {
        success: true as const,
        code: created.code,
        expiresAt: created.expiresAt.toISOString(),
        message: 'کد تخفیف ساخته شد.',
      }
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002' &&
        attempt < 2
      )
        continue
      logAuthError('create-discount-code', error)
      return {
        success: false as const,
        message:
          error instanceof DiscountCodeError
            ? error.message
            : 'ساخت کد انجام نشد؛ اطلاعات فرم محفوظ است.',
      }
    }
  }
  return {
    success: false as const,
    message: 'ساخت کد انجام نشد؛ دوباره تلاش کن.',
  }
}

export async function setDiscountCodeStatusAction(input: unknown) {
  const admin = await requireAdmin()
  const parsed = discountCodeStatusSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: 'درخواست معتبر نیست.' }
  try {
    await getDb().$transaction(async (tx) => {
      if (
        (
          await tx.user.findUnique({
            where: { id: admin.id },
            select: { role: true },
          })
        )?.role !== 'ADMIN'
      )
        throw new DiscountCodeError('دسترسی مدیریت نداری.')
      const { id, expectedUpdatedAt, isActive } = parsed.data
      const result = await tx.discountCode.updateMany({
        where: { id, updatedAt: new Date(expectedUpdatedAt) },
        data: { isActive },
      })
      if (result.count !== 1)
        throw new DiscountCodeError('این کد تغییر کرده است؛ فهرست را تازه کن.')
    })
    revalidatePath('/admin/discount-generator')
    return { success: true, message: 'وضعیت کد ذخیره شد.' }
  } catch (error) {
    logAuthError('discount-code-status', error)
    return {
      success: false,
      message:
        error instanceof DiscountCodeError
          ? error.message
          : 'تغییر وضعیت انجام نشد؛ دوباره تلاش کن.',
    }
  }
}

export async function applyDiscountCodeAction(input: unknown) {
  const user = await getCurrentUser()
  if (!user)
    return { success: false as const, message: 'برای اعمال کد وارد حساب شو.' }
  const parsed = applyDiscountCodeSchema.safeParse(input)
  if (!parsed.success)
    return { success: false as const, message: parsed.error.issues[0].message }
  try {
    const quote = await checkoutQuote(user.id, getDb(), parsed.data.code)
    if (
      quote.checkoutKey !== parsed.data.checkoutKey ||
      quote.baseQuoteHash !== parsed.data.quoteHash
    )
      throw new CheckoutError(
        'سبد، آدرس یا قیمت تغییر کرده است؛ صفحه را تازه کن و دوباره بررسی کن.',
      )
    // No quota is consumed here. Placement always re-reads prices, expiry and limits.
    return {
      success: true as const,
      quote: {
        code: quote.coupon!.code,
        checkoutKey: quote.checkoutKey,
        quoteHash: quote.quoteHash,
        subtotal: quote.subtotal,
        shippingFee: quote.shippingFee,
        discount: quote.discount,
        total: quote.total,
      },
    }
  } catch (error) {
    logAuthError('apply-discount-code', error)
    return {
      success: false as const,
      message:
        error instanceof CheckoutError || error instanceof DiscountCodeError
          ? error.message
          : 'بررسی کد انجام نشد؛ دوباره تلاش کن.',
    }
  }
}
