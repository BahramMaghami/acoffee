import { config } from 'dotenv'
import { readMailConfig } from '../lib/mail-config'
import { verifySmtp } from '../lib/smtp'

// Existing shell/hosting settings take precedence; these files are for local use.
config({ path: ['.env.local', '.env'], quiet: true })

const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'AUTH_URL'] as const
if (!readMailConfig()) {
  const missing = required.filter(key => !process.env[key])
  console.error(missing.length
    ? `تنظیمات SMTP کامل نیست. متغیرهای خالی: ${missing.join(', ')}`
    : 'تنظیمات SMTP معتبر نیست. دامنهٔ AUTH_URL، پورت و فرستنده را بررسی کن.')
  console.error('راهنما: docs/smtp-setup.md')
  process.exitCode = 1
} else {
  try {
    await verifySmtp()
    console.log('اتصال و احراز هویت SMTP موفق بود. هیچ ایمیلی ارسال نشد.')
    console.log('این بررسی، تأیید دامنهٔ فرستنده یا رسیدن ایمیل به صندوق ورودی را تضمین نمی‌کند.')
  } catch (error) {
    // SMTP error messages may contain credentials or server responses. Print
    // only static guidance, never the raw error, environment or recovery URL.
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
    const message = code === 'EAUTH'
      ? 'احراز هویت SMTP رد شد؛ نام کاربری و رمز یا کلید سرویس را بررسی کن.'
      : code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ESOCKET' || code === 'EDNS'
        ? 'اتصال SMTP برقرار نشد؛ اینترنت، آدرس سرور، پورت و گواهی TLS را بررسی کن.'
        : 'بررسی SMTP ناموفق بود؛ تنظیمات اتصال و دسترسی سرویس را بررسی کن.'
    console.error(message)
    process.exitCode = 1
  }
}
