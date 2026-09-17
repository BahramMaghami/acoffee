import 'dotenv/config'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../generated/prisma/client'
import { variants } from '../lib/storefront'

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15_000 }) })
try {
  const result = await db.product.createMany({ data: variants.filter((variant) => variant.price !== null).map((variant) => ({
    name: variant.product.name + ' · ' + variant.label, slug: variant.id, description: variant.product.description,
    price: variant.price!, stock: 0, isActive: false, weightGrams: variant.weightGrams, imageUrl: null,
  })), skipDuplicates: true })
  console.log(`Added ${result.count} priced SKUs as inactive with zero stock. Set real stock and activate in Prisma Studio. Existing products unchanged.`)
} finally { await db.$disconnect() }
