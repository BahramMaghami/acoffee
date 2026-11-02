import 'server-only'
import nodemailer from 'nodemailer'
import { readMailConfig } from './mail-config'

// Shared by delivery and the CLI so the connection check uses the same TLS rules.
export function createMailTransport(config: NonNullable<ReturnType<typeof readMailConfig>>) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    auth: config.auth,
    secure: config.secure,
    requireTLS: config.requireTLS,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    dnsTimeout: 10000,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  })
}

// Checks connection, TLS and authentication only; never sends an email.
export async function verifySmtp() {
  const config = readMailConfig()
  if (!config) throw new Error('MailNotConfigured')
  const transport = createMailTransport(config)
  try {
    await transport.verify()
  } finally {
    transport.close()
  }
}
