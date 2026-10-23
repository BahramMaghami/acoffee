import 'dotenv/config'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Prisma, PrismaClient } from '../generated/prisma/client'
import { products, variants, categories, storefrontImages } from '../lib/catalog-fixture'
import { categoryDefaults } from '../lib/product-pricing'

const apply = process.argv.includes('--apply')
// Explicitly reviewed legacy SKUs can remain unattached and unchanged. Never
// silently ignore new unknown records or map them to a different product.
const preservedSlugs = new Set(process.argv.filter(arg => arg.startsWith('--preserve-unmapped=')).flatMap(arg => arg.slice('--preserve-unmapped='.length).split(',')).filter(Boolean))
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 }) })
try {
  // This query works before the schema migration and never mutates data.
  const existing = await db.product.findMany({ select: { id: true, slug: true, price: true, weightGrams: true, isActive: true, imageUrl: true } })
  const bySlug = new Map(existing.map(p => [p.slug, p]))
  const known = new Map(variants.map(v => [v.id, v]))
  const unknown = existing.filter(p => !known.has(p.slug))
  const weightConflicts = existing.filter(p => known.has(p.slug) && known.get(p.slug)!.weightGrams !== p.weightGrams)
  const priceDifferences = existing.filter(p => known.has(p.slug) && (p.price === null ? null : Number(p.price)) !== known.get(p.slug)!.price)
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'audit', existing: existing.length, catalog: products.length,
    unknownSlugs: unknown.map(p => p.slug), weightConflicts: weightConflicts.map(p => p.slug),
    pricesPreservedFromDatabase: priceDifferences.map(p => ({ slug: p.slug, database: p.price?.toString() ?? null, fixture: known.get(p.slug)!.price })),
    missingVariants: variants.filter(v => !bySlug.has(v.id)).length }))
  if (weightConflicts.length) throw new Error('Resolve weight conflicts before migration; no data was changed.')
  if (!apply) process.exitCode = 0
  else {
    // New admin-created SKUs are expected on later runs; legacy unknown SKUs remain untouched.
    const orphanUnknown = unknown.length ? await db.product.findMany({ where: { id: { in: unknown.map(p => p.id) }, catalogProductId: null }, select: { slug: true } }) : []
    if (orphanUnknown.some(p => !preservedSlugs.has(p.slug))) throw new Error('Unmapped legacy SKUs require review; no data was changed. Use --preserve-unmapped=slug1,slug2 only for reviewed records that must remain unchanged.')
    if (orphanUnknown.length) console.log(JSON.stringify({ preservedUnmapped: orphanUnknown.map(p => p.slug) }))
    await db.$transaction(async tx => {
      const importedSlugs = new Set((await tx.catalogImport.findMany({ select: { slug: true } })).map(row => row.slug))
      const updates: { id: string; catalogProductId: string; roast: string; grade: string; discountPercent: number }[] = []
      const inserts: Prisma.ProductCreateManyInput[] = []
      const receipts: { slug: string }[] = []
      for (const [sortOrder, category] of categories.entries()) {
        const defaults = categoryDefaults(category.value)
        await tx.category.upsert({ where: { slug: category.value }, update: {}, create: {
          slug: category.value, name: category.label, sortOrder, defaultWeights: defaults.weights,
          defaultRoasts: defaults.roasts, defaultGrades: defaults.grades, wholesale: defaults.wholesale,
        } })
      }
      for (const [sortOrder, product] of products.entries()) {
        // Do not resurrect intentionally deleted products or overwrite admin edits on reruns.
        if (importedSlugs.has(product.slug)) continue
        const children = variants.filter(v => v.product.id === product.id)
        const photos = [...new Set(children.map(v => bySlug.get(v.id)?.imageUrl).filter((url): url is string => Boolean(url) && !Object.values(storefrontImages).includes(url as typeof storefrontImages.light)))]
        if (photos.length > 1) throw new Error(`Conflicting photos for ${product.slug}; transaction rolled back.`)
        const basePrices: Record<string, number | null> = {}
        for (const grade of product.grades) {
          const reference = children.find(v => v.grade === grade && v.weightGrams === (product.category === 'wholesale' ? 5000 : 1000))
          const stored = reference ? bySlug.get(reference.id) : undefined
          const amount = stored ? (stored.price === null ? null : Number(stored.price)) : reference?.price
          basePrices[grade] = amount == null ? null : Math.round(amount * 1000 / reference!.weightGrams)
        }
        const parent = await tx.catalogProduct.create({ data: {
          slug: product.slug, name: product.name, description: product.description, origin: product.origin, cafeGroup: product.cafeGroup,
          category: { connect: { slug: product.category } }, weights: [...product.weights], roasts: [...product.roasts], grades: [...product.grades],
          basePrices, imageUrl: photos[0] ?? null, sortOrder,
        } })
        for (const variant of children) {
          const stored = bySlug.get(variant.id)
          const common = { catalogProductId: parent.id, roast: variant.roast ?? 'default', grade: variant.grade, manualPrice: true,
            // Preserve the established wholesale ribbon without recalculating any legacy prices.
            discountPercent: product.category === 'wholesale' && variant.weightGrams === 10000 ? 3 : 0 }
          if (stored) updates.push({ id: stored.id, ...common })
          else inserts.push({ ...common, slug: variant.id, name: product.name + ' · ' + variant.label,
            description: product.description, weightGrams: variant.weightGrams, price: variant.price, isActive: variant.price === null })
        }
        receipts.push({ slug: product.slug })
      }
      // One parameterized update instead of a network round trip per legacy SKU.
      // Deliberately do not write prices, availability, IDs, names or images.
      if (updates.length) {
        const values = updates.map(row => Prisma.sql`(${row.id}, ${row.catalogProductId}, ${row.roast}, ${row.grade}, ${row.discountPercent}::integer)`)
        const changed = await tx.$executeRaw(Prisma.sql`
          UPDATE "Product" AS p SET "catalogProductId" = v.parent_id, "roast" = v.roast, "grade" = v.grade,
            "manualPrice" = true, "discountPercent" = v.discount, "updatedAt" = CURRENT_TIMESTAMP
          FROM (VALUES ${Prisma.join(values)}) AS v(id, parent_id, roast, grade, discount)
          WHERE p.id = v.id
        `)
        if (changed !== updates.length) throw new Error('Legacy SKU count changed; transaction rolled back.')
      }
      if (inserts.length) await tx.product.createMany({ data: inserts })
      if (receipts.length) await tx.catalogImport.createMany({ data: receipts })
      const preserved = await tx.product.findMany({ where: { id: { in: existing.map(row => row.id) } }, select: { id: true, slug: true, price: true, weightGrams: true, isActive: true, imageUrl: true } })
      const unchanged = preserved.length === existing.length && preserved.every(row => JSON.stringify(row) === JSON.stringify(bySlug.get(row.slug)))
      if (!unchanged) throw new Error('Existing SKU values changed; transaction rolled back.')
    }, { timeout: 120000, maxWait: 30000, isolationLevel: 'Serializable' })
    console.log('Catalog imported. Existing prices, availability, SKU IDs and order snapshots preserved.')
  }
} catch (error) {
  console.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[database URL]') : 'Catalog audit/migration connection failed.')
  process.exitCode = 1
} finally { await db.$disconnect() }
