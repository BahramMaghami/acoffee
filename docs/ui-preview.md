# پیش‌نمایش رابط آ (acoffee)

## اجرا و محدوده

`npm run dev`، سپس `http://localhost:3000`.

| مسیر | کاربرد |
| --- | --- |
| `/` | معرفی برند، تصویر اصلی و سه قهوهٔ منتخب |
| `/shop` | فهرست قهوه، فیلتر، جست‌وجو و مرتب‌سازی قیمت |
| `/shop/[slug]` | جزئیات قهوه و انتخاب تعداد |
| `/cart` | سبد محلی، تغییر تعداد، حذف و جمع قیمت |
| `/about` | صفحهٔ سادهٔ داستان برند |
| `/guide` | راهنمای اولیهٔ دم‌آوری |

محصولات، مشخصات و قیمت‌های این نسخه نمونه‌اند و در `lib/storefront.ts` نگه‌داری می‌شوند. سبد با کلید نسخه‌دار `acoffee:preview-cart:v1` در localStorage ذخیره می‌شود؛ ورودی خراب، محصول ناشناخته و تعداد نامعتبر پذیرفته نمی‌شوند. اطلاعات سبد بین تب‌ها همگام می‌شود. هیچ سفارشی ثبت نمی‌شود و هیچ اتصال به دیتابیس در صفحه‌های این مرحله وجود ندارد. در مرحلهٔ تجارت واقعی، محاسبات قیمت و موجودی باید از دادهٔ معتبر سرور انجام شوند.

ورود و ثبت‌نام، اتصال سبد به حساب، انتخاب آسیاب، پرداخت و ثبت سفارش هنوز پیاده نشده‌اند. متن و تصاویر، پیش‌طرح برند هستند و باید بعد از دریافت لوگو و مشخصات واقعی محصولات نهایی شوند.

## قراردادهای طراحی

رابط فارسی و RTL است، با فونت محلی `Vazirmatn Variable`. زمینهٔ گرم `#f9f7f2`، قرمز تیرهٔ `#8a2928` و مشکی گرم `#27251f` رنگ‌های پایه‌اند. تمام قیمت‌ها با ارقام فارسی و به تومان نمایش داده می‌شوند. در این صفحه‌ها تاریخ نمایش داده نمی‌شود؛ util تاریخ شمسی با اولین بخش نیازمند تاریخ اضافه می‌شود.

کامپوننت‌های اختصاصی کنار صفحهٔ مربوط قرار دارند؛ هدر و فوتر مشترک کنار `app/layout.tsx` هستند. primitiveهای shadcn (`Button`، `Input` و `Sonner`) در `components/ui` قرار گرفته‌اند. نصب دستی shadcn بر اساس [راهنمای رسمی](https://ui.shadcn.com/docs/installation/manual) انجام شده و `components.json` برای افزودن کامپوننت‌های بعدی آماده است.

نام فارسی برند «آ» است و نوشتار لاتین آن `acoffee` باقی می‌ماند. افزودن محصول، یک toast راست‌به‌چپ با دکمهٔ «برو به سبد خرید» نشان می‌دهد. میزبان مشترک [Sonner](https://v3.shadcn.com/docs/components/sonner) در layout نصب شده تا toast با جابه‌جایی صفحه از دست نرود.

## اعتبارسنجی

```bash
npm run typecheck
npm run lint
npm run build
npm run test:ui
```

تست‌های Playwright از Chrome نصب‌شده استفاده می‌کنند؛ تنظیم channel در `playwright.config.ts` قرار دارد. دسکتاپ و موبایل بررسی می‌شوند: تصاویر، ناوبری، فیلتر و جست‌وجو، مرتب‌سازی، تغییر تعداد، ماندگاری سبد، محدودیت موجودی، ورودی خراب، مسیر نامعتبر و عرض صفحه. اسکرین‌شات‌های محلی در `artifacts/ui/` ذخیره و از Git مستثنا می‌شوند.

## تصاویر و پرامپت‌ها

چهار تصویر با ابزار داخلی **image_gen** و بدون CLI تولید شدند، بازبینی و به پروژه کپی شدند. این تصاویر، تصویر واقعی محصول عرضه‌شده نیستند و نقش پیش‌طرح دارند. ابزار Next Image خروجی مناسب ابعاد دستگاه را ارائه می‌کند.

### `public/images/coffee-ritual.png`

```text
Create a photorealistic editorial still life for a premium Persian coffee brand's website, brand name acoffee. Landscape 3:2 image. Warm ivory plaster studio backdrop and a sandy stone tabletop with hard late-afternoon sunlight from upper left and beautiful long shadows. Center composition: one elegant matte very dark espresso brown 250g stand-up coffee pouch with folded sealed top, a large muted deep brick red rectangular paper label printed with only the small cream lowercase word 'acoffee' and a tiny '01' near bottom. In front at lower right a dark red ceramic espresso cup with rich crema on a saucer. A small scattering of roasted beans at lower left, off-white linen partially entering from left edge. Tactile, real, slightly imperfect, premium independent coffee roaster art direction, 85mm lens, minimal styling, warm film color, restrained palette cream/black/oxblood/coffee. No additional text, no people, no watermarks, no UI, no floating objects. Leave generous breathing room around the product. Image used as a large home hero photo, not a full web page.
```

### `public/images/daily-blend.png`

```text
Use case: product-mockup. A high-end ecommerce studio photograph of a single upright 250g matte dark espresso-black coffee pouch, folded sealed top, subtle realistic paper wrinkles and gusset, centered three-quarter front view on a warm light ivory #eee9e1 seamless background, grounded with a soft cast shadow. No cup, no beans, no props. A large muted oxblood red rectangular paper label across front, tasteful small cream lowercase serif word 'acoffee', below it tiny 'DAILY BLEND', with '01' at bottom. Square composition with entire pouch occupying 70 percent of height and plenty of space on all sides. Warm natural daylight, extremely believable premium independent coffee brand packaging, 85mm lens, tactile paper, quiet editorial design. Exact text only as given. No watermark.
```

### `public/images/single-origin.png`

ویرایش تصویر daily-blend با پرامپت:

```text
Edit the single coffee pouch catalog photograph just shown. Keep EXACTLY the pouch silhouette, camera angle, material, lighting, ivory background and composition. Change only the rectangular label: label color to muted olive green #666953, word 'acoffee' remains cream, change small 'DAILY BLEND' to 'SINGLE ORIGIN', and '01' to '02'. Maintain all typography size and placement. Produce one complete square catalog photo.
```

### `public/images/dark-blend.png`

ویرایش تصویر single-origin با پرامپت:

```text
Edit the coffee pouch catalog photograph just shown. Keep EXACTLY the pouch silhouette, camera angle, material, lighting, ivory background and composition. Change only the rectangular label: label color to muted warm dark ochre brown #8a654b, word 'acoffee' remains cream, change small 'SINGLE ORIGIN' to 'DARK BLEND', and '02' to '03'. Maintain all typography size and placement. Produce one complete square catalog photo.
```
