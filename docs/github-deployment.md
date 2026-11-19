# انتشار خودکار روی هاست فعلی

## رفتار

Workflow با push به main یا Run workflow اجرا می‌شود. SSH با کلید اختصاصی و host key تأییدشده است؛ رمز حساب یا فایل env به GitHub ارسال نمی‌شود. دو secret در GitHub environment به نام production لازم‌اند:

- CPANEL_SSH_KEY: کلید خصوصی مخصوص استقرار (بدون passphrase).
- CPANEL_KNOWN_HOSTS: خط معتبر known_hosts برای 213.176.126.133 که fingerprint آن از مسیر مورد اعتماد بررسی شده باشد.

دسترسی main و environment production را به افراد مجاز محدود کنید. هرکس بتواند کد main را تغییر دهد در این روش می‌تواند کد را با دسترسی حساب هاست اجرا کند.

## آماده‌سازی یک‌باره

1. کد این تغییرات را commit/push کنید. اولین workflow تا تنظیم secretها و قرارگرفتن اسکریپت روی هاست موفق نخواهد شد؛ این خطا سایت را تغییر نمی‌دهد.
2. روی هاستِ دارای working tree تمیز، git fetch origin و git merge --ff-only origin/main اجرا شود. stash قبلی پشتیبان است و نباید pop شود. فایل‌های env را تغییر ندهید.
3. برای Actions کلید SSH مجزا ایجاد کنید؛ کلیدهای موجود را overwrite نکنید. کلید عمومی را با گزینهٔ restrict در ~/.ssh/authorized_keys حساب acoffeer قرار دهید. مسیر .ssh دسترسی 700 و authorized_keys دسترسی 600 داشته باشد. کلید خصوصی را فقط در secret GitHub ذخیره کنید، نه چت/مخزن/public_html.
4. host key را با fingerprint اعلام‌شده از مسیر معتبر مقایسه کنید؛ ssh-keyscan به‌تنهایی احراز هویت سرور نیست. StrictHostKeyChecking را خاموش نکنید.
5. GitHub → Settings → Environments → production → Environment secrets: دو مقدار بالا را اضافه کنید. سپس Actions → Deploy cPanel → Run workflow روی main.
6. در اولین اجرا، اتصال runner به SSH، دسترسی حساب به GitHub، build و restart واقعی باید بررسی شوند. فایروال هاست ممکن است دسترسی runner را محدود کند؛ در این حالت تیکت پشتیبانی لازم است.

## ایمنی و محدودیت‌ها

- working tree کثیف، شاخهٔ غیر main، merge غیر fast-forward، تغییر schema/migration یا خطای build باعث توقف می‌شود. هیچ reset/clean، seed یا migration خودکار اجرا نمی‌شود.
- workflow قدیمی که main از آن جلو رفته، بدون انتشار کنار گذاشته می‌شود. قفل سرور از هم‌زمانی GitHub و deploy دستی جلوگیری می‌کند.
- نصب با npm install --no-save برای حفظ symlink محیط CloudLinux است؛ اگر نصب باعث تغییر فایل‌های tracked شد، اختلاف را بررسی کنید و با reset خودکار پنهان نکنید.
- بعد از build موفق، commit در .next/DEPLOY_COMMIT ثبت و تنها lsnodeهای همین کاربر با عنوان دقیق همین پروژه SIGTERM می‌گیرند. پردازش جدید header به نام X-Acoffee-Release را از زمان startup برمی‌گرداند؛ بررسی /login باید همان commit را ببیند.
- Stop App باید در پنل غیرفعال باشد تا سرور پس از restart دوباره برنامه را اجرا کند. header فقط نسخهٔ پردازش را ثابت می‌کند، نه سلامت همهٔ امکانات و دیتابیس.
- build در مسیر فعلی انجام می‌شود؛ این انتشار اتمیک یا بدون وقفه نیست. شکست build می‌تواند فایل‌های .next را ناقص کند؛ انتشار مجدد نسخهٔ سالم نیاز است. rollback خودکار وجود ندارد.
- برای تغییر دیتابیس، مسیر جداگانه با backup، بررسی migration و اجازهٔ مربوط لازم است. workflow روی این تغییرها عمداً متوقف می‌شود.
- GitHub Actions ممکن است محدودیت سهمیه/شبکه داشته باشد. تا اولین اجرای موفق، خودکارسازی فعال و تأییدشده محسوب نمی‌شود.

راهنمای قدیمی cPanel مسیر دستی را توضیح می‌دهد؛ با تنظیم این workflow، push به GitHub مسیر خودکار را اجرا می‌کند. از اجرای هم‌زمان Update from Remote در پنل خودداری کنید.
