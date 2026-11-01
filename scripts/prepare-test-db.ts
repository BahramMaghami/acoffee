import { spawnSync } from 'node:child_process'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../generated/prisma/client'
import { testDatabaseUrls } from '../tests/helpers/test-database'
import { categories, products, variants } from '../lib/catalog-fixture'
import { categoryDefaults } from '../lib/product-pricing'

const urls = testDatabaseUrls()
const migrated = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
  stdio: 'inherit', env: { ...process.env, DATABASE_URL: urls.pooled, DIRECT_URL: urls.direct },
})
if (migrated.status !== 0) process.exit(migrated.status ?? 1)
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: urls.pooled, connectionTimeoutMillis: 15000 }) })
try {
  const counts = await Promise.all([db.user.count(), db.category.count(), db.product.count(), db.catalogProduct.count()])
  if (counts.some(Boolean)) throw new Error('Use an empty test branch; no existing records were replaced. Reuse prepared fixtures without rerunning this command.')
  await db.$transaction(async tx => {
    await tx.category.createMany({ data: categories.map((category, sortOrder) => {
      const preset = categoryDefaults(category.value)
      return { id: `fixture-${category.value}`, slug: category.value, name: category.label, sortOrder,
        defaultWeights: preset.weights, defaultRoasts: preset.roasts, defaultGrades: preset.grades, wholesale: preset.wholesale }
    }) })
    await tx.catalogProduct.createMany({ data: products.map((product, sortOrder) => ({
      id: `fixture-${product.id}`, slug: product.slug, name: product.name, description: product.description,
      categoryId: `fixture-${product.category}`, cafeGroup: product.cafeGroup, weights: [...product.weights], roasts: [...product.roasts], grades: [...product.grades], sortOrder,
    })) })
    await tx.product.createMany({ data: variants.map(variant => ({ id: variant.id, slug: variant.id,
      catalogProductId: `fixture-${variant.product.id}`, name: `${variant.product.name} · ${variant.label}`,
      description: variant.product.description, weightGrams: variant.weightGrams, roast: variant.roast ?? 'default', grade: variant.grade,
      price: variant.price, manualPrice: true, isActive: variant.price !== null,
      discountPercent: variant.product.category === 'wholesale' && variant.weightGrams === 10000 ? 3 : 0,
    })) })
  }, { timeout: 60000 })
  console.log('Isolated test catalog prepared; no main database was used.')
} finally { await db.$disconnect() }
