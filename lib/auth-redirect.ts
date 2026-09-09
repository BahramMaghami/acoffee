// Only known storefront destinations may be used after authentication.
export function safeAuthRedirect(value: unknown): string {
  if (typeof value !== 'string') return '/account'
  if (
    [
      '/',
      '/account',
      '/cart',
      '/shop',
      '/checkout/address',
      '/checkout/place-order',
    ].includes(value)
  )
    return value
  if (/^\/orders\/[a-z0-9-]+$/.test(value)) return value
  if (/^\/shop\/[a-z0-9-]+$/.test(value)) return value
  return '/account'
}
