import 'dotenv/config'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../generated/prisma/client'
import { products } from '../lib/storefront'

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15_000 }) })
try {
  const result = await db.product.createMany({ data: products.map((product) => ({
    name: product.name, slug: product.slug, description: product.description,
    price: product.price, stock: product.stock, weightGrams: product.weightGrams, imageUrl: product.image,
  })), skipDuplicates: true })
  console.log(`Added ${result.count} missing catalog products. Existing products unchanged.`)
} finally { await db.$disconnect() }
