// Read-only: no verify/request calls and no database writes.
// Run on the hosting server with --env-file=.env.production.
import { getDb } from '../lib/db'
import { paymentConfig } from '../lib/payment-rules'

const orderId = process.argv[2]
if (!orderId) {
  console.error('Pass the order ID from /orders/<id>.')
  process.exit(1)
}
const db = getDb()
try {
  const config = paymentConfig()
  const attempts = await db.paymentAttempt.findMany({
    where: { orderId, method: 'ZARINPAL' },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      status: true,
      environment: true,
      merchantId: true,
      authority: true,
      amountRial: true,
      createdAt: true,
      updatedAt: true,
      leaseUntil: true,
      verificationStartedAt: true,
      errorCode: true,
    },
  })
  console.log(
    JSON.stringify({
      orderId,
      serverTime: new Date(),
      attemptCount: attempts.length,
    }),
  )
  for (const p of attempts) {
    console.log(
      JSON.stringify({
        status: p.status,
        environment: p.environment,
        amountRial: p.amountRial.toString(),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        leaseUntil: p.leaseUntil,
        verificationStartedAt: p.verificationStartedAt,
        errorCode: p.errorCode,
        authoritySuffix: p.authority?.slice(-6),
        merchantMatchesConfig: p.merchantId === config.merchantId,
      }),
    )
    if (
      !p.authority ||
      !p.merchantId ||
      p.environment !== config.environment ||
      p.merchantId !== config.merchantId
    ) {
      console.log(
        'Inquiry skipped: missing authority or configuration mismatch.',
      )
      continue
    }
    const response = await fetch(
      `${config.gatewayOrigin}/pg/v4/payment/inquiry.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          merchant_id: p.merchantId,
          authority: p.authority,
        }),
        signal: AbortSignal.timeout(15000),
      },
    )
    const body = await response.json()
    // Only print diagnostic fields; never dump the bank response/card details.
    const safeMessage = (value: unknown) =>
      typeof value === 'string'
        ? value
            .replaceAll(p.merchantId!, '[merchant]')
            .replaceAll(p.authority!, '[authority]')
            .slice(0, 500)
        : undefined
    console.log(
      JSON.stringify(
        {
          httpStatus: response.status,
          gatewayOrigin: config.gatewayOrigin,
          data: {
            code: body.data?.code,
            status: body.data?.status,
            message: safeMessage(body.data?.message),
          },
          error: {
            code: body.errors?.code,
            message: safeMessage(body.errors?.message),
          },
        },
        null,
        2,
      ),
    )
  }
} catch {
  console.error(
    'Diagnostic failed: configuration, database, network or non-JSON response. No payment was changed.',
  )
  process.exitCode = 1
} finally {
  await db.$disconnect()
}
