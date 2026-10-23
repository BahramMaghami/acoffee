'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/current-user'
import { getDb } from '@/lib/db'
import { productFormSchema, deleteProductSchema } from '@/lib/validators/admin-products'
import { calculateProductPrices, categoryDefaults, type ProductDefaults } from '@/lib/product-pricing'
import { defaultDescription, formatWeight, gradeLabels, roastOptions, type Grade, type Roast } from '@/lib/storefront'
import { createImageUpload, verifyProductImage, removeProductImage } from '@/lib/cloudinary'
import { logAuthError } from '@/lib/auth-error'

class ProductError extends Error {}
const slug = (prefix: string) => `${prefix}-${randomUUID()}`
function invalidateCatalog() {
  revalidatePath('/', 'layout')
}
async function cleanupImage(publicId: string | null) {
  if (!publicId) return
  try {
    if (!await getDb().catalogProduct.count({ where: { imagePublicId: publicId } })) await removeProductImage(publicId)
  } catch (error) { logAuthError('product-image-cleanup', error) }
}
export async function prepareProductImageAction() {
  const admin = await requireAdmin()
  try { return { success: true as const, upload: createImageUpload(admin.id) } }
  catch { return { success: false as const, message: 'سرویس آپلود هنوز تنظیم نشده است. محصول را با تصویر پیش‌فرض ذخیره کن.' } }
}
export async function saveProductAction(input: unknown) {
  const actor = await requireAdmin()
  const parsed = productFormSchema.safeParse(input)
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0].message }
  const data = parsed.data
  try {
    const before = data.id ? await getDb().catalogProduct.findUnique({ where: { id: data.id } }) : null
    if (data.id && (!before || before.updatedAt.toISOString() !== data.expectedUpdatedAt)) throw new ProductError('محصول تغییر کرده یا حذف شده است. صفحه را تازه کن.')
    const replacingImage = data.imagePublicId !== (before?.imagePublicId ?? null)
    let imageUrl = before?.imageUrl ?? null
    if (!data.imagePublicId && (data.removeImage || before?.imagePublicId || !before)) imageUrl = null
    else if (data.imagePublicId && replacingImage) {
      try { imageUrl = await verifyProductImage(data.imagePublicId, data.imageTicket ?? '', actor.id) }
      catch (error) { throw new ProductError(error instanceof Error ? error.message : 'تأیید تصویر انجام نشد.') }
    }
    const saved = await getDb().$transaction(async tx => {
      if ((await tx.user.findUnique({ where: { id: actor.id }, select: { role: true } }))?.role !== 'ADMIN') throw new ProductError('دسترسی مدیریت نداری.')
      const existing = data.id ? await tx.catalogProduct.findUnique({ where: { id: data.id }, include: { variants: true } }) : null
      if (data.id && (!existing || existing.updatedAt.toISOString() !== data.expectedUpdatedAt)) throw new ProductError('محصول تغییر کرده یا حذف شده است. صفحه را تازه کن.')
      let category = data.newCategoryName ? null : await tx.category.findUnique({ where: { id: data.categoryId } })
      if (data.newCategoryName) {
        if (await tx.category.findUnique({ where: { name: data.newCategoryName } })) throw new ProductError('این دسته وجود دارد؛ آن را از فهرست انتخاب کن.')
        const defaults = categoryDefaults('new')
        const order = await tx.category.aggregate({ _max: { sortOrder: true } })
        category = await tx.category.create({ data: { name: data.newCategoryName, slug: slug('category'), sortOrder: (order._max.sortOrder ?? 0) + 1,
          defaultWeights: defaults.weights, defaultRoasts: defaults.roasts, defaultGrades: defaults.grades } })
      }
      if (!category) throw new ProductError('دستهٔ محصول معتبر نیست.')
      const options: ProductDefaults = {
        weights: (data.weights.length ? data.weights : category.defaultWeights).toSorted((a, b) => a - b),
        roasts: data.noRoast ? [] : data.roasts.length ? data.roasts : category.defaultRoasts as Roast[],
        grades: data.grades.length ? data.grades : category.defaultGrades as Grade[], wholesale: category.wholesale,
      }
      const prices = calculateProductPrices({ ...options, basePrices: data.basePrices, overrides: data.overrides })
      if (!prices.length || prices.length > 80) throw new ProductError('حداکثر ۸۰ انتخاب برای هر محصول مجاز است.')
      if (!existing && prices.some(p => p.price === null || p.price <= 0)) throw new ProductError('قیمت پایه یا قیمت مستقل تمام انتخاب‌های محصول جدید را وارد کن.')
      if (prices.some(p => p.price !== null && p.price <= 0)) throw new ProductError('قیمت محاسبه‌شده باید حداقل یک تومان باشد.')
      const productSlug = existing?.slug ?? slug('coffee')
      const desiredSlugs = prices.map(p => `${productSlug}--${p.key}`)
      const removed = existing?.variants.filter(v => !desiredSlugs.includes(v.slug)) ?? []
      if (removed.length && !data.confirmRemoved) throw new ProductError('حذف انتخاب‌های قبلی را تأیید کن.')
      const parentData = { name: data.name, categoryId: category.id, weights: options.weights, roasts: options.roasts, grades: options.grades,
        basePrices: data.basePrices, isActive: data.isActive, imageUrl, imagePublicId: data.imagePublicId }
      const parent = existing
        ? await tx.catalogProduct.update({ where: { id: existing.id }, data: parentData })
        : await tx.catalogProduct.create({ data: { ...parentData, slug: productSlug, description: defaultDescription, sortOrder: 1000000 } })
      if (removed.length) await tx.product.deleteMany({ where: { id: { in: removed.map(v => v.id) } } })
      for (const value of prices) {
        const prior = existing?.variants.find(v => v.slug === `${productSlug}--${value.key}`)
        const name = [data.name, formatWeight(value.weightGrams), roastOptions.find(r => r.value === value.roast)?.label,
          options.grades.length > 1 ? gradeLabels[value.grade] : undefined].filter(Boolean).join(' · ')
        const fields = { catalogProductId: parent.id, name: name.slice(0, 150), description: parent.description, weightGrams: value.weightGrams,
          roast: value.roast, grade: value.grade, price: value.price, manualPrice: value.manualPrice,
          discountPercent: prior?.manualPrice && value.manualPrice && Number(prior.price) === value.price ? prior.discountPercent : value.discountPercent,
          isActive: data.availability[value.key] ?? prior?.isActive ?? true }
        await tx.product.upsert({ where: { slug: `${productSlug}--${value.key}` }, create: { ...fields, slug: `${productSlug}--${value.key}` }, update: fields })
      }
      return { id: parent.id, oldImage: existing?.imagePublicId ?? null }
    }, { isolationLevel: 'Serializable', maxWait: 15000, timeout: 60000 })
    invalidateCatalog()
    if (replacingImage) await cleanupImage(saved.oldImage)
    return { success: true as const, id: saved.id, message: 'محصول ذخیره شد.' }
  } catch (error) {
    logAuthError('save-product', error)
    return { success: false as const, message: error instanceof ProductError || error instanceof RangeError ? error.message : 'محصول ذخیره نشد؛ صفحه را تازه کن و دوباره تلاش کن.' }
  }
}
export async function deleteProductAction(input: unknown) {
  const actor = await requireAdmin()
  const parsed = deleteProductSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: 'درخواست معتبر نیست.' }
  try {
    const image = await getDb().$transaction(async tx => {
      if ((await tx.user.findUnique({ where: { id: actor.id }, select: { role: true } }))?.role !== 'ADMIN') throw new ProductError('دسترسی مدیریت نداری.')
      const product = await tx.catalogProduct.findUnique({ where: { id: parsed.data.id } })
      if (!product || product.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt) throw new ProductError('محصول تغییر کرده یا حذف شده است. صفحه را تازه کن.')
      await tx.catalogProduct.delete({ where: { id: product.id } })
      return product.imagePublicId
    }, { isolationLevel: 'Serializable', timeout: 15000 })
    invalidateCatalog()
    await cleanupImage(image)
    return { success: true, message: 'محصول حذف شد؛ سوابق سفارش‌ها محفوظ ماندند.' }
  } catch (error) {
    logAuthError('delete-product', error)
    return { success: false, message: error instanceof ProductError ? error.message : 'حذف انجام نشد؛ دوباره تلاش کن.' }
  }
}
