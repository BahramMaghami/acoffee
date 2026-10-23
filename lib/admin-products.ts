import 'server-only'
import { requireAdmin } from './current-user'
import { getDb } from './db'
import { usersPage } from './validators/admin-users'
import type { ProductFormInput } from './validators/admin-products'
import { storefrontProduct, type CatalogRow } from './catalog'
import { variantKey, type Grade, type Roast } from './storefront'

export async function getAdminProducts(requestedPage: unknown) {
  await requireAdmin()
  return getDb().$transaction(async tx => {
    const total = await tx.catalogProduct.count()
    const pages = Math.max(1, Math.ceil(total / 20))
    const page = Math.min(usersPage(requestedPage), pages)
    const products = await tx.catalogProduct.findMany({ skip: (page - 1) * 20, take: 20, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: { category: true, variants: true } })
    return { total, pages, page, products: products.map(p => {
      const amounts = p.variants.filter(v => v.price !== null && Number(v.price) > 0).map(v => Number(v.price))
      return { ...storefrontProduct(p), startingPrice: amounts.length ? Math.min(...amounts) : null, databaseId: p.id, isActive: p.isActive, updatedAt: p.updatedAt.toISOString() }
    }) }
  }, { isolationLevel: 'RepeatableRead' })
}
export async function getProductEditor(id?: string) {
  await requireAdmin()
  const categories = await getDb().category.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] })
  const product = id ? await getDb().catalogProduct.findUnique({ where: { id }, include: { category: true, variants: true } }) : null
  return { categories, product }
}
export function productFormValues(product: CatalogRow): ProductFormInput {
  const prices = product.basePrices as Record<string, number | null>
  const overrides: Record<string, string> = {}
  const availability: Record<string, boolean> = {}
  for (const v of product.variants) {
    const key = variantKey(v.weightGrams, v.roast === 'default' ? undefined : v.roast as Roast, v.grade as Grade)
    if (v.manualPrice) overrides[key] = v.price?.toString() ?? ''
    availability[key] = v.isActive
  }
  return { id: product.id, expectedUpdatedAt: product.updatedAt.toISOString(), name: product.name, categoryId: product.categoryId, newCategoryName: '',
    weights: product.weights, roasts: product.roasts as Roast[], noRoast: !product.roasts.length, grades: product.grades as Grade[],
    basePrices: { standard: prices.standard == null ? '' : String(prices.standard), vip: prices.vip == null ? '' : String(prices.vip) },
    overrides, availability, isActive: product.isActive, removeImage: false, imagePublicId: product.imagePublicId, confirmRemoved: false,
  }
}
