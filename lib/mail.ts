import 'server-only'
import { readMailConfig } from './mail-config'
import { createMailTransport } from './smtp'

export { readMailConfig }

export async function sendRecoveryMail(email: string, token: string) {
  const config = readMailConfig()
  if (!config) throw new Error('MailNotConfigured')
  const link = new URL('/reset-password', config.origin)
  link.searchParams.set('token', token)
  const transport = createMailTransport(config)
  try {
    await transport.sendMail({ from: config.from, to: email, subject: 'بازیابی رمز عبور حساب آ',
      text: `برای تعیین رمز جدید حساب آ، لینک زیر را باز کن. این لینک تا ۳۰ دقیقه معتبر است و فقط یک بار استفاده می‌شود.\n\n${link.toString()}\n\nاگر این درخواست را ثبت نکرده‌ای، این ایمیل را نادیده بگیر؛ رمز حسابت تغییر نکرده است.`,
      html: `<div lang="fa" dir="rtl"><h1>بازیابی رمز عبور آ</h1><p>این لینک تا ۳۰ دقیقه معتبر است و فقط یک بار استفاده می‌شود.</p><p><a href="${link.toString()}">تعیین رمز جدید</a></p><p>اگر این درخواست را ثبت نکرده‌ای، این ایمیل را نادیده بگیر؛ رمز حسابت تغییر نکرده است.</p></div>`,
    })
  } finally { transport.close() }
}
