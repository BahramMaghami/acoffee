// Auth.js can return its callback URL without throwing on configuration errors.
// A resolved signIn() promise alone does not prove that login succeeded.
export function assertSignInRedirect(value: unknown, destination: string) {
  if (typeof value === 'string') {
    try {
      const actual = new URL(value, 'https://auth-result.invalid')
      if (
        ['https:', 'http:'].includes(actual.protocol) &&
        `${actual.pathname}${actual.search}${actual.hash}` === destination
      ) return
    } catch { /* Treat malformed results as failed sign-in. */ }
  }
  const error = new Error('Auth.js did not return the successful sign-in destination')
  error.name = 'AuthSignInIncomplete'
  throw error
}
