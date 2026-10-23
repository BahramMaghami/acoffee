import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createImageUpload, verifyProductImage, removeProductImage, uploadConfigured } from '../../lib/cloudinary'

const originalFetch = globalThis.fetch
const names = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const
const original = Object.fromEntries(names.map(name => [name, process.env[name]]))
beforeEach(() => {
  process.env.CLOUDINARY_CLOUD_NAME = 'acoffee-test'
  process.env.CLOUDINARY_API_KEY = 'unit-test-key'
  process.env.CLOUDINARY_API_SECRET = 'unit-test-secret-never-used-on-a-server'
})
afterEach(() => {
  globalThis.fetch = originalFetch
  for (const name of names) { if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name] }
})
test('signed uploads bind a random public ID and do not expose the API secret', () => {
  const upload = createImageUpload('admin-1')
  assert.match(upload.publicId, /^acoffee\/products\/[a-f0-9-]{36}$/)
  assert.equal(upload.fields.overwrite, 'false')
  assert.equal(upload.fields.allowed_formats, 'jpg,png,webp')
  assert.match(upload.fields.signature, /^[a-f0-9]{64}$/)
  assert.equal(JSON.stringify(upload).includes(process.env.CLOUDINARY_API_SECRET!), false)
})
test('forged, cross-admin and cross-asset upload tickets are rejected before any network call', async () => {
  const upload = createImageUpload('admin-1')
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('unexpected fetch') }
  await assert.rejects(() => verifyProductImage(upload.publicId, upload.ticket + 'x', 'admin-1'))
  await assert.rejects(() => verifyProductImage(upload.publicId, upload.ticket, 'admin-2'))
  await assert.rejects(() => verifyProductImage(upload.publicId + 'x', upload.ticket, 'admin-1'))
  assert.equal(calls, 0)
})
test('server verifies actual size, image type, pages, host and cloud before saving', async () => {
  const upload = createImageUpload('admin-1')
  const asset = { public_id: upload.publicId, format: 'png', bytes: 1024, resource_type: 'image', type: 'upload', width: 100, height: 100,
    secure_url: `https://res.cloudinary.com/acoffee-test/image/upload/v1/${upload.publicId}.png` }
  globalThis.fetch = async () => Response.json(asset)
  assert.equal(await verifyProductImage(upload.publicId, upload.ticket, 'admin-1'), asset.secure_url)
  for (const invalid of [{ bytes: 5 * 1024 * 1024 + 1 }, { format: 'svg' }, { resource_type: 'video' }, { pages: 2 }, { secure_url: 'https://evil.test/image.png' },
    { secure_url: 'https://res.cloudinary.com/another-cloud/image/upload/photo.png' }, { public_id: 'other' }]) {
    globalThis.fetch = async () => Response.json({ ...asset, ...invalid })
    await assert.rejects(() => verifyProductImage(upload.publicId, upload.ticket, 'admin-1'))
  }
  globalThis.fetch = async () => new Response(null, { status: 503 })
  await assert.rejects(() => verifyProductImage(upload.publicId, upload.ticket, 'admin-1'))
})
test('unconfigured uploads fail clearly and cleanup never deletes unrelated assets', async () => {
  let calls = 0
  globalThis.fetch = async () => { calls++; return Response.json({ result: 'ok' }) }
  await removeProductImage('someone-elses-file')
  assert.equal(calls, 0)
  delete process.env.CLOUDINARY_API_SECRET
  assert.equal(uploadConfigured(), false)
  assert.throws(() => createImageUpload('admin-1'), /سرویس آپلود/)
})
