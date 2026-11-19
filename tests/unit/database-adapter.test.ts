import assert from 'node:assert/strict'
import test from 'node:test'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaPg } from '@prisma/adapter-pg'
import { createDatabaseAdapter, databaseTransport } from '../../lib/database-adapter'

test('existing direct and pooled Neon URLs retain the Neon transport', () => {
  for (const host of ['ep-test.aws.neon.tech', 'ep-test-pooler.aws.neon.tech']) {
    const url = `postgresql://user:secret@${host}/db?sslmode=require`
    assert.equal(databaseTransport(url), 'neon')
    assert.ok(createDatabaseAdapter(url) instanceof PrismaNeon)
  }
})

test('host and SSH tunnel use standard PostgreSQL without overriding TLS options', () => {
  for (const host of ['127.0.0.1:5432', '127.0.0.1:55432', 'db.example.com']) {
    assert.ok(createDatabaseAdapter(`postgres://u:p@${host}/db`) instanceof PrismaPg)
  }
  assert.equal(databaseTransport('postgres://u:p@neon.tech.example.com/db'), 'postgres')
})

test('invalid configuration fails without leaking credentials', () => {
  for (const value of [undefined, '', 'secret', 'https://u:secret@localhost/db', 'postgres://localhost']) {
    assert.throws(() => databaseTransport(value), error => {
      assert.ok(error instanceof Error)
      assert.ok(!error.message.includes('secret'))
      return true
    })
  }
})
