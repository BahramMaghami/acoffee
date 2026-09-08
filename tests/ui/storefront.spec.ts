import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("home renders Persian content, complete images and responsive navigation", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("روز خوب");
  await expect(page).toHaveTitle("آ | قهوه، به وقت خودت");
  await expect(page.locator(".product-card")).toHaveCount(3);
  await page.locator(".site-footer").scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator("main img").evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await mkdir("artifacts/ui", { recursive: true });
  await page.screenshot({ path: `artifacts/ui/home-${testInfo.project.name}.png`, fullPage: true });
  await page.screenshot({ path: `artifacts/ui/home-viewport-${testInfo.project.name}.png` });
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "باز کردن منو" }).click();
    await page.getByRole("navigation", { name: "منوی موبایل" }).getByRole("link", { name: "قهوه‌های ما" }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.getByRole("navigation", { name: "منوی موبایل" })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("catalog filters, searches, resets and sorts products", async ({ page }) => {
  await page.goto("/shop");
  await page.getByRole("button", { name: "تک‌خاستگاه", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-card h3")).toHaveText("عربیکای اتیوپی");
  await page.getByRole("textbox", { name: "جست‌وجوی قهوه", exact: true }).fill("پیدا نمی‌شود");
  await expect(page.getByText("این طعم را پیدا نکردیم.")).toBeVisible();
  await page.getByRole("button", { name: "نمایش همهٔ قهوه‌ها" }).click();
  await expect(page.locator(".product-card")).toHaveCount(3);
  await page.getByRole("combobox", { name: "مرتب‌سازی" }).selectOption("lowest");
  await expect(page.locator(".product-card h3").first()).toHaveText("ترکیب شب");
  await page.getByRole("textbox", { name: "جست‌وجوی قهوه", exact: true }).fill("اتیوپی");
  await expect(page.locator(".product-card")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("cart adds quantities, persists on reload, updates totals and removes products", async ({ page }, testInfo) => {
  await page.goto("/cart");
  await expect(page.getByText("هنوز قهوه‌ات را انتخاب نکرده‌ای.")).toBeVisible();
  await page.goto("/shop/daily-blend");
  await page.getByRole("button", { name: "افزایش تعداد", exact: true }).click();
  await page.getByRole("button", { name: "افزودن به سبد خرید" }).click();
  const cartToast = page.locator("[data-sonner-toast]").filter({ hasText: "به سبدت اضافه شد." });
  await expect(cartToast).toBeVisible();
  await expect(page.locator(".product-purchase")).not.toContainText("به سبدت اضافه شد.");
  await expect(cartToast).toContainText("ترکیب روزانه");
  await page.screenshot({ path: `artifacts/ui/toast-${testInfo.project.name}.png`, animations: "disabled" });
  await cartToast.getByRole("button", { name: "برو به سبد خرید" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.locator(".summary-total dd")).toHaveText("۷۷۰٬۰۰۰ تومان");
  await page.reload();
  await expect(page.locator(".cart-product-copy output")).toHaveText("۲");
  await page.getByRole("button", { name: "افزایش تعداد ترکیب روزانه" }).click();
  await expect(page.locator(".summary-total dd")).toHaveText("۱٬۱۵۵٬۰۰۰ تومان");
  await expect(page.getByRole("button", { name: "ثبت سفارش به‌زودی فعال می‌شود" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: `artifacts/ui/cart-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "حذف ترکیب روزانه" }).click();
  await expect(page.getByText("هنوز قهوه‌ات را انتخاب نکرده‌ای.")).toBeVisible();
});

test("cart tolerates invalid saved data and caps quantities at stock", async ({ page }) => {
  await page.goto("/cart");
  await page.evaluate(() => localStorage.setItem("acoffee:preview-cart:v1", "not json"));
  await page.reload();
  await expect(page.getByText("هنوز قهوه‌ات را انتخاب نکرده‌ای.")).toBeVisible();
  await page.evaluate(() => localStorage.setItem("acoffee:preview-cart:v1", JSON.stringify([
    { productId: "daily-blend", quantity: 999 },
    { productId: "daily-blend", quantity: 2 },
    { productId: "unknown", quantity: 1 },
    { productId: "single-origin", quantity: -1 },
  ])));
  await page.reload();
  await expect(page.locator(".cart-row")).toHaveCount(1);
  await expect(page.locator(".cart-product-copy output")).toHaveText("۱۲");
  await expect(page.getByRole("button", { name: "افزایش تعداد ترکیب روزانه" })).toBeDisabled();
});

test("supporting pages and unknown product routes work", async ({ page }) => {
  for (const [path, heading] of [["/about", "برای یک مکث"], ["/guide", "خوب دم کن"]]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto("/shop/does-not-exist");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("این صفحه را پیدا نکردیم.");
});
