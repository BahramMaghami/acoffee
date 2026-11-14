# استقرار آ روی cPanel / CloudLinux

این تنظیم برای اجرای مستقیم از مخزن `/home/acoffeer/repositories/acoffee` است.
فایل‌ها به `public_html` کپی نمی‌شوند. فایل `server.cjs` ورودی Passenger است؛
اسکریپت‌های عادی Next.js و دیپلوی Vercel تغییر نکرده‌اند.

## تنظیم اولیه

ابتدا فایل‌های جدید را خودتان commit و push کنید، سپس در Git Version Control گزینهٔ
Update from Remote را بزنید. این فایل‌ها باید روی شاخهٔ انتخاب‌شده موجود باشند.

در Create Application:

| گزینه | مقدار |
| --- | --- |
| Node.js | 24 |
| Application mode | Production |
| Application root | repositories/acoffee |
| Application URL | acoffeeroasters.com، مسیر خالی |
| Application startup file | server.cjs |

سپس Create را بزنید. قبل از نصب و build ممکن است برنامه خطا بدهد؛ هنوز آمادهٔ سرویس‌دهی نیست.
دستور فعال‌سازی محیط Node که پنل نمایش می‌دهد را با مقدار ACTIVATE در
`scripts/deploy-cpanel.sh` مقایسه کنید؛ اگر متفاوت بود، مسیر واقعی پنل را جایگزین کنید.
مسیر پیش‌فرض بر اساس نام حساب، پوشهٔ برنامه و نسخهٔ ۲۴ تنظیم شده و هنوز روی هاست تأیید نشده است.

## متغیرهای محیطی

در File Manager داخل ریشهٔ برنامه یک `.env.production` خصوصی بسازید (دسترسی 600).
مقادیر واقعی را از تنظیمات فعلی خود منتقل کنید، نه از نمونه‌های ساختگی.
این فایل در Git نادیده گرفته می‌شود و نباید داخل public_html باشد.
Next.js این فایل را هم هنگام build و هم هنگام اجرای برنامه می‌خواند؛ متغیرهای پنل
ممکن است در دستور Git Deploy در دسترس نباشند. مقادیر تکراری پنل و فایل باید یکسان باشند
چون متغیرهای محیط پردازش اولویت دارند.

به `.env.example` مراجعه کنید: DATABASE_URL، AUTH_SECRET، AUTH_URL، تنظیمات OTP،
Cloudinary، SMTP و پرداخت را به تناسب قابلیت‌های فعال منتقل کنید.
`AUTH_URL=https://acoffeeroasters.com` و فقط پشت پراکسی قابل اعتماد هاست
`AUTH_TRUST_HOST=true` تنظیم شود. تنظیمات پرداخت موجود را آگاهانه منتقل کنید؛
این فایل‌ها پرداخت واقعی را فعال یا تغییر نمی‌دهند.
اگر Neon حفظ می‌شود، DATABASE_URL همان اتصال Neon است؛ انتقال هاست دیتابیس را منتقل نمی‌کند.
DIRECT_URL فقط برای عملیات جداگانهٔ migration لازم است. این دیپلوی migration و seed اجرا نمی‌کند.
پارامتر CLOUDINARY_CLOUD_NAME باید هنگام build هم موجود باشد.

## اولین انتشار و انتشارهای بعدی

1. تغییرات را commit و به GitHub push کنید.
2. در cPanel گزینهٔ Update from Remote را بزنید.
3. Deploy HEAD Commit را بزنید؛ `.cpanel.yml` اسکریپت نصب، build و restart را اجرا می‌کند.
4. نتیجهٔ اجرای task را بررسی کنید؛ سپس صفحهٔ ورود و یک محصول را باز کنید.

Push به GitHub به‌تنهایی این مراحل را اجرا نمی‌کند. وب‌هوک یا GitHub Actions در این مرحله تنظیم نشده است.
برای نخستین نصب لازم نیست جداگانه Run NPM Install بزنید؛ اسکریپت نصب را انجام می‌دهد.
اگر flock یا دسترسی shell در هاست موجود نباشد، از پشتیبانی بخواهید فراهم کند.

نصب با `npm install --include=dev --package-lock=true --no-save` انجام می‌شود تا symlink
مدیریت‌شدهٔ node_modules حذف و lockfile مخزن تغییر نکند. Build از webpack استفاده می‌کند
تا وابستگی‌های بیرون از ریشه در محیط CloudLinux مانع Turbopack نشوند.
اسکریپت با اولین خطا متوقف می‌شود و فقط بعد از build موفق، `tmp/restart.txt` را لمس می‌کند.

این انتشار در همان پوشه انجام می‌شود و اتمیک یا بدون قطعی نیست: نصب یا build می‌تواند
بر نسخهٔ در حال اجرا اثر بگذارد؛ برای انتشارهای بعدی زمان نگهداری در نظر بگیرید.
در صورت شکست، خطا را اصلاح و Deploy را تکرار کنید؛ rollback خودکار وجود ندارد.
اگر پنل هنگام Create فایل نمونهٔ app.js یا فایل تنظیمات ایجاد کرد و Git کثیف شد،
ابتدا `git status --short` را روی هاست ببینید؛ تغییرات را بدون بررسی حذف نکنید.

تنظیم DNS/SSL و تست روی خود هاست جداگانه لازم است؛ ایجاد Node App دامنهٔ متصل به
Vercel را خودکار جابه‌جا نمی‌کند. IP خروجی عمومی هاست برای زرین‌پال باید تأیید شود.
زمان‌بندی بررسی پرداخت‌ها نیز با این فایل‌ها خودکار فعال نمی‌شود.

## منابع

- https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-deployment/
- https://docs.cloudlinux.com/cloudlinuxos/lve_manager/
- https://www.phusionpassenger.com/docs/advanced_guides/in_depth/node/reverse_port_binding.html
