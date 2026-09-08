import 'server-only'

// Log identifiers only: provider errors can contain credentials or query values.
export function logAuthError(operation: string, error: unknown) {
  const details: string[] = []
  let current = error
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth++) {
    if (Object.prototype.toString.call(current) === '[object ErrorEvent]') details.push('ConnectionErrorEvent')
    if ('name' in current && typeof current.name === 'string') details.push(current.name)
    if ('code' in current && typeof current.code === 'string') details.push(current.code)
    if (!('cause' in current)) break
    const cause: unknown = current.cause
    current = cause && typeof cause === 'object' && 'err' in cause ? cause.err : cause
  }
  console.error(`[auth:${operation}] ${details.join(' / ') || 'UnknownError'}`)
}
