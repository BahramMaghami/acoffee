// Tokens issued before this feature have version zero. Never adopt a newer DB
// version when refreshing an old JWT: only password authentication can do that.
export function matchesSessionVersion(tokenVersion: unknown, userVersion: number) {
  const version = tokenVersion === undefined ? 0 : tokenVersion
  return typeof version === 'number' && Number.isSafeInteger(version) && version >= 0 && version === userVersion
}
