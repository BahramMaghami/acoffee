import 'server-only'
import { cache } from 'react'
import { connection } from 'next/server'
import { getDb } from './db'
import type { Prisma } from '@/generated/prisma/client'
import { variantKey, type StoreProduct, type Grade, type Roast, type CafeGroup } from './storefront'
import { logAuthError } from './auth-error'

export type CatalogRow = Prisma.CatalogProductGetPayload<{ include: { category: true; variants: true } }>
export function storefrontProduct(row: CatalogRow): StoreProduct {
  const result: StoreProduct = { id: row.slug, slug: row.slug, name: row.name, category: row.category.slug, categoryLabel: row.category.name,
    wholesale: row.category.wholesale, cafeGroup: row.cafeGroup as CafeGroup | undefined, description: row.description, origin: row.origin,
    imageUrl: row.imageUrl, weights: row.weights, roasts: row.roasts as Roast[], grades: row.grades as Grade[], prices: {}, skuIds: {}, availability: {}, discounts: {},
  }
  for (const variant of row.variants) {
    const key = variantKey(variant.weightGrams, variant.roast === 'default' ? undefined : variant.roast as Roast, variant.grade as Grade)
    result.prices[key] = variant.price === null || Number(variant.price) <= 0 ? null : Number(variant.price)
    result.skuIds[key] = variant.slug
    result.availability[key] = row.isActive && variant.isActive
    result.discounts[key] = variant.discountPercent
  }
  return result
}
export const getStoreCatalog = cache(async () => {
  // Catalog changes at runtime; production builds must not query Neon.
  await connection()
  try {
    const categories = await getDb().category.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], include: {
      products: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { category: true, variants: true } },
    } })
    return { categories: categories.filter(c => c.products.length).map(c => ({ value: c.slug, label: c.name, wholesale: c.wholesale })), products: categories.flatMap(c => c.products.map(storefrontProduct)) }
  } catch (error) { logAuthError('catalog', error); throw new Error('فهرست محصولات دریافت نشد. دوباره تلاش کن.') }
})
