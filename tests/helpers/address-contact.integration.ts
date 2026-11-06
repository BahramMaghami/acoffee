import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../../generated/prisma/client'
import { hasTestDatabase, testDatabaseUrls } from './test-database'

test('alternate phone migration preserves historical primary numbers', { skip: !hasTestDatabase, timeout: 90000 }, async () => {
  const urls = testDatabaseUrls()
  const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: urls.pooled, connectionTimeoutMillis: 15000 }) })
  const schema = `contact_test_${randomUUID().replaceAll('-', '')}`
  const rollback = new Error('Rollback contact fixture')
  const sql = await readFile(new URL('../../prisma/migrations/20261106020000_alternate_contact_phone/migration.sql', import.meta.url), 'utf8')
  try {
    await assert.rejects(db.$transaction(async tx => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`)
      for (const table of ['Address', 'Order']) {
        await tx.$executeRawUnsafe(`CREATE TABLE "${table}" ("id" TEXT PRIMARY KEY, "phone" VARCHAR(20) NOT NULL)`)
        await tx.$executeRawUnsafe(`INSERT INTO "${table}" VALUES ('legacy', '02112345678')`)
      }
      for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement)
      for (const table of ['Address', 'Order']) {
        assert.deepEqual(await tx.$queryRawUnsafe(`SELECT "phone", "alternatePhone" FROM "${table}"`), [{ phone: '02112345678', alternatePhone: null }])
      }
      throw rollback
    }, { timeout: 60000 }), error => error === rollback)
  } finally { await db.$disconnect() }
})
