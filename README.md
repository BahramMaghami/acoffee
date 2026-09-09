# acoffee

فروشگاه فارسی قهوه با Next.js، Prisma 7 و PostgreSQL روی Neon.

مرحلهٔ فعلی: فروشگاه فارسی با ورود و ثبت‌نام، آدرس ذخیره‌شده، تأیید و ثبت سفارش واقعی روی Neon. هزینهٔ ارسال و درگاه پرداخت مرحلهٔ بعد هستند. با `npm run dev` سایت را ببینید. جزئیات در [راهنمای رابط](docs/ui-preview.md)، [راهنمای دیتابیس](docs/database.md)، [راهنمای احراز هویت](docs/authentication.md) و [راهنمای خرید](docs/checkout.md) ثبت شده‌اند.

## مسیر توسعه

1. دیتابیس و migration، سپس اتصال و اعتبارسنجی روی Neon.
2. پیش‌نمایش رابط فارسی و RTL با shadcn؛ قرمز، مشکی و قهوه‌ای، با تنظیم نهایی رنگ‌ها پس از دریافت لوگو. کامپوننت‌های اختصاصی هر صفحه کنار `page.tsx` همان صفحه.
3. NextAuth فقط با Credentials و session از نوع JWT با اعتبار ۱۴ روز؛ ثبت‌نام/ورود با Zod، React Hook Form و Server Actions. کاربران با Prisma ذخیره می‌شوند؛ جدول‌های OAuth و session دیتابیسی برای این روش کاربرد ندارند.
4. محصولات و سبد مهمان عمومی؛ ورود برای نهایی‌کردن خرید و حساب کاربری. مدیریت و عملیات حساس نیز کنترل دسترسی سمت سرور دارند.
5. util مشترک نمایش شمسی و تبدیل ورودی شمسی به زمان میلادی؛ منطقهٔ زمانی نمایش `Asia/Tehran`، ذخیره‌سازی میلادی.

Server Actionهای مدل‌های اصلی در `actions/user.actions.ts`، `actions/product.actions.ts`، `actions/cart.actions.ts` و `actions/order.actions.ts` قرار می‌گیرند. ورودی‌ها با Zod اعتبارسنجی می‌شوند؛ شناسهٔ کاربر، نقش، قیمت و موجودی از سمت سرور بررسی می‌شوند. هر مرحلهٔ مهم پس از بررسی commit می‌شود.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

فونت فارسی پروژه `Vazirmatn Variable` است و به‌صورت محلی از بستهٔ `@fontsource-variable/vazirmatn` بارگذاری می‌شود.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
