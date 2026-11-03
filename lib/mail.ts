import 'server-only'
import { readMailConfig } from './mail-config'
import { createMailTransport } from './smtp'
import { passwordResetEmail } from './emails/password-reset'

export { readMailConfig }

export async function sendRecoveryMail(email: string, token: string) {
  const config = readMailConfig()
  if (!config) throw new Error('MailNotConfigured')
  const link = new URL('/reset-password', config.origin)
  link.searchParams.set('token', token)
  const transport = createMailTransport(config)
  try {
    await transport.sendMail({ from: config.from, to: email, ...passwordResetEmail(link.toString()) })
  } finally { transport.close() }
}
