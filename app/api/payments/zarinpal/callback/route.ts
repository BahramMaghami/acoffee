import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getDb } from '@/lib/db'
import { paymentConfig } from '@/lib/payment-rules'
import { paymentService } from '@/lib/payments'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams
  const authority = query.get('Authority')
  if (
    query.getAll('Authority').length !== 1 ||
    !authority ||
    !/^[AS][a-zA-Z0-9]{35}$/.test(authority)
  )
    return new NextResponse('شناسهٔ پرداخت معتبر نیست.', {
      status: 400,
      headers: { 'Cache-Control': 'no-store' },
    })
  try {
    const config = paymentConfig()
    const payment = await getDb().paymentAttempt.findUnique({
      where: {
        environment_authority: { environment: config.environment, authority },
      },
      select: { orderId: true },
    })
    if (!payment)
      return new NextResponse('تراکنش پیدا نشد.', {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      })
    // Status is untrusted, including NOK. Inquiry/verify determine the result.
    await paymentService().check(payment.orderId, undefined, authority)
    for (const path of [
      '/admin',
      '/orders',
      `/orders/${payment.orderId}`,
      `/admin/orders/${payment.orderId}`,
      '/admin/discount-generator',
    ])
      revalidatePath(path)
    const response = NextResponse.redirect(
      new URL(`/orders/${payment.orderId}`, config.origin),
      303,
    )
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('Referrer-Policy', 'no-referrer')
    return response
  } catch {
    return new NextResponse(
      'نتیجهٔ پرداخت هنوز مشخص نیست. دوباره پرداخت نکن؛ از تاریخچهٔ سفارش‌ها وضعیت را بررسی کن.',
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        },
      },
    )
  }
}
