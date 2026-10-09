import 'dotenv/config'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../generated/prisma/client'
import { variants, storefrontImages } from '../lib/storefront'

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15_000 }) })
try {
  const pricedVariants = variants.filter((variant) => variant.price !== null)
  await db.$transaction(pricedVariants.map((variant) => {
    const data = {
      name: variant.product.name + ' · ' + variant.label,
      description: variant.product.description,
      price: variant.price!,
      weightGrams: variant.weightGrams,
    }
    return db.product.upsert({
      where: { slug: variant.id },
      create: { ...data, slug: variant.id, stock: 0, isActive: false, imageUrl: storefrontImages.dark },
      // Preserve inventory, availability, custom photos and historical order snapshots.
      update: data,
    })
  }), { maxWait: 30_000, timeout: 90_000 })
  console.log(`Synced prices for ${pricedVariants.length} SKUs. Existing stock and availability preserved; new SKUs are inactive with zero stock.`)
} finally { await db.$disconnect() }
