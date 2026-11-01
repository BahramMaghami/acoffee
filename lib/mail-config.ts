// This parser contains no secrets of its own and can be tested without a mail server.
export function readMailConfig(env: Record<string, string | undefined> = process.env) {
  const { SMTP_HOST: host, SMTP_PORT: portText, SMTP_USER: user, SMTP_PASS: pass, SMTP_FROM: from, AUTH_URL: authUrl } = env
  if (!host || !portText || !from || !authUrl) return null
  const port = Number(portText)
  if (!Number.isInteger(port) || port < 1 || port > 65535 || /[\r\n]/.test(from)) return null
  try {
    const url = new URL(authUrl)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null
    if (url.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && local && url.protocol === 'http:')) return null
    const localSmtp = ['localhost', '127.0.0.1', '::1'].includes(host)
    const testing = env.NODE_ENV !== 'production' && localSmtp
    if (!testing && (!user || !pass)) return null
    return { host, port, from, origin: url.origin, auth: user && pass ? { user, pass } : undefined,
      secure: port === 465, requireTLS: !testing && port !== 465 }
  } catch { return null }
}
