# acoffee

فروشگاه فارسی قهوه با Next.js، Prisma 7 و PostgreSQL روی Neon.

مرحلهٔ فعلی: زیرساخت دیتابیس. راه‌اندازی و تصمیم‌های مدل‌سازی در [راهنمای دیتابیس](docs/database.md) ثبت شده‌اند. صفحهٔ سایت هنوز قالب اولیهٔ Next.js است.

## مسیر توسعه

1. دیتابیس و migration، سپس اتصال و اعتبارسنجی روی Neon.
2. NextAuth فقط با Credentials و session از نوع JWT با اعتبار ۱۴ روز؛ ثبت‌نام/ورود با Zod، React Hook Form و Server Actions. کاربران با Prisma ذخیره می‌شوند؛ جدول‌های OAuth و session دیتابیسی برای این روش کاربرد ندارند.
3. رابط فارسی و RTL با shadcn؛ قرمز، مشکی و قهوه‌ای، با تنظیم نهایی رنگ‌ها پس از دریافت لوگو. طراحی ساده، مدرن و اختصاصی؛ کامپوننت‌های اختصاصی هر صفحه کنار `page.tsx` همان صفحه.
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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
