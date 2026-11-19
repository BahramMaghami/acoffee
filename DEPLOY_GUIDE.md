# راهنمای push و انتشار سایت آ روی هاست

این راهنما برای هاست فعلی و انتشار دستی از طریق SSH است. فعلاً push به GitHub به‌تنهایی سایت را به‌روز نمی‌کند؛ اتصال GitHub Actions به SSH هاست timeout می‌داد.

## ۱. ثبت و ارسال تغییرات از کامپیوتر

این دستورها را در **PowerShell ویندوز** اجرا کن:

```powershell
cd E:\my-projects\acoffee
git status --short
git diff --stat
```

فقط فایل‌های مربوط به تغییر موردنظر را stage کن. مثلاً برای اصلاح اسکریپت restart:

```powershell
git add scripts/restart-cpanel.sh
git diff --cached --stat
git diff --cached
git commit -m "Fix cPanel restart without dev fd"
git push origin main
```

در دفعات بعد مسیر فایل‌ها و پیام commit را متناسب با تغییرت عوض کن. قبل از commit، خروجی diff را بررسی کن تا تغییر نامرتبط یا رمز و فایل محیطی وارد commit نشود. فایل‌های `.env`، `.env.production`، `.env.db-host` و بکاپ دیتابیس را به GitHub نفرست.

اگر commit یا push خطا داد، اول همان خطا را برطرف کن؛ هنوز سراغ انتشار نرو.

## ۲. ورود به SSH هاست

در همان PowerShell:

```powershell
ssh acoffeer@213.176.126.133
```

رمز SSH هاست را وارد کن؛ هنگام تایپ رمز چیزی نمایش داده نمی‌شود. پس از ورود، دستورهای بخش‌های بعد را **داخل SSH لینوکس** اجرا کن.

## ۳. دریافت نسخهٔ جدید از GitHub

```bash
cd /home/acoffeer/repositories/acoffee
git status --short
```

**اگر خروجی خالی بود**، ادامه بده:

```bash
git fetch origin && git merge --ff-only origin/main
```

اگر فایل modified یا untracked دیدی یا merge خطا داد، متوقف شو و خروجی را بررسی کن. برای رفع آن خودسرانه `git reset --hard`، `git clean` یا `git stash pop` اجرا نکن؛ ممکن است تغییرات لازم هاست از بین بروند یا تغییرات قدیمی برگردند.

برای بررسی اینکه کد هاست با آخرین نسخهٔ دریافت‌شده یکسان است:

```bash
git rev-parse HEAD
git rev-parse origin/main
git status --short
```

دو شناسه باید یکسان و خروجی status خالی باشد. این فقط به‌روز بودن **کد** را ثابت می‌کند؛ برای اجرای آن معمولاً مرحلهٔ build و restart هم لازم است.

## ۴. انتشار معمول تغییرات سایت

پس از موفقیت مرحلهٔ قبل، در SSH اجرا کن:

```bash
bash scripts/deploy-cpanel.sh
```

اسکریپت خودش محیط Node.js را فعال می‌کند، وابستگی‌ها را نصب می‌کند، Prisma Client را تولید می‌کند، build می‌گیرد و برنامه را restart می‌کند. فعال‌کردن دستی محیط Node لازم نیست.

در پایان موفق باید این پیام‌ها را ببینی:

```text
Verified running release <commit-sha>
Deployment verified. No database migration or seed was run.
```

این روش build را در مسیر فعلی برنامه انجام می‌دهد؛ احتمال اختلال کوتاه هنگام انتشار وجود دارد. هم‌زمان از cPanel یا ترمینال دیگری deploy اجرا نکن.

**این اسکریپت migration یا seed اجرا نمی‌کند.** اگر تغییر شامل schema یا migration دیتابیس است، این راهنمای انتشار عادی به‌تنهایی کافی نیست؛ اجرای migration باید جداگانه هماهنگ شود.

## ۵. اگر build موفق بود ولی restart شکست خورد

نمونهٔ خطایی که روی همین هاست داشتیم:

```text
/dev/fd/62: No such file or directory
The new running release could not be verified. Inspect the application logs.
```

اشکال `/dev/fd` در اسکریپت restart اصلاح شده است. اگر build کامل شده و فقط همین اصلاح اسکریپت را دریافت کرده‌ای، نیازی به build مجدد نیست. بعد از commit و push محلی و دریافت آن طبق مرحلهٔ ۳، در SSH اجرا کن:

```bash
bash scripts/restart-cpanel.sh
```

خروجی موفق:

```text
Verified running release <commit-sha>
```

این دستور **آخرین build موجود** را اجرا می‌کند، نه لزوماً آخرین کد Git. بنابراین اگر بعد از build کد صفحات یا منطق برنامه را تغییر داده‌ای، باید مرحلهٔ ۴ را کامل اجرا کنی.

اگر فقط اسکریپت restart پس از build commit شده باشد، طبیعی است شناسهٔ پیام موفقیت با HEAD جدید متفاوت باشد؛ پیام، شناسهٔ build را از `.next/DEPLOY_COMMIT` می‌خواند.

اگر پیام تأیید ظاهر نشد، انتشار را موفق فرض نکن و خروجی خطا را بررسی کن. صرفاً زدن Restart در cPanel قبلاً روی این هاست پردازش قدیمی را تعویض نکرده بود.

## ۶. بررسی بعد از انتشار

در **PowerShell ویندوز**:

```powershell
curl.exe -I --max-time 20 https://acoffeeroasters.com/login
```

پاسخ `200` و هدر `X-Acoffee-Release` را بررسی کن. در SSH می‌توانی شناسهٔ build را ببینی:

```bash
cat .next/DEPLOY_COMMIT
```

هدر سایت باید با این شناسه یکسان باشد. سپس سایت را در مرورگر تازه کن و قابلیت تغییرکرده را امتحان کن؛ پاسخ ۲۰۰ به‌تنهایی صحت همهٔ امکانات را ثابت نمی‌کند.

برای اصلاح سبد خرید: در یک سفارش جدید، پس از تأیید پرداخت و نمایش «پرداخت‌شده»، اقلام همان سفارش باید از سبد حذف شوند و با refresh برنگردند. اقلام باقی‌مانده از سفارش‌های قدیمی ممکن است نیاز به حذف دستی داشته باشند.

## نکته دربارهٔ هشدارهای build

هشدارهای `GLIBC_2.29` و بارگذاری SWC روی هاست فعلی دیده شده‌اند و build با جایگزین WASM موفق شده است. وجود این هشدارها به‌تنهایی به معنی شکست نیست؛ نتیجهٔ نهایی build و پیام تأیید نسخهٔ اجراشده را ملاک قرار بده. اگر build شکست خورد، restart به‌تنهایی آن را اصلاح نمی‌کند.
