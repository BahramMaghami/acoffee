import 'server-only'
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

export const imageLimit = 5 * 1024 * 1024
function config() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME
  const key = process.env.CLOUDINARY_API_KEY
  const secret = process.env.CLOUDINARY_API_SECRET
  if (!cloud || !key || !secret) throw new Error('سرویس آپلود هنوز تنظیم نشده است؛ می‌توانی محصول را با تصویر پیش‌فرض ذخیره کنی.')
  return { cloud, key, secret }
}
export const uploadConfigured = () => Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
function signature(params: Record<string, string>, secret: string) {
  return createHash('sha256').update(Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + secret).digest('hex')
}
export function createImageUpload(actorId: string) {
  const { cloud, key, secret } = config()
  const publicId = `acoffee/products/${randomUUID()}`
  const params = { public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)), overwrite: 'false', allowed_formats: 'jpg,png,webp' }
  const payload = Buffer.from(JSON.stringify({ actorId, publicId, expires: Date.now() + 3600000 })).toString('base64url')
  return { url: `https://api.cloudinary.com/v1_1/${cloud}/image/upload`, fields: { ...params, api_key: key, signature: signature(params, secret) },
    publicId, ticket: payload + '.' + createHmac('sha256', secret).update(payload).digest('hex') }
}
function verifyTicket(ticket: string, actorId: string, publicId: string) {
  const { secret } = config()
  const [payload, mac] = ticket.split('.')
  if (!payload || !/^[a-f0-9]{64}$/.test(mac ?? '')) throw new Error('مجوز تصویر معتبر نیست؛ تصویر را دوباره انتخاب کن.')
  const expected = createHmac('sha256', secret).update(payload).digest()
  if (!timingSafeEqual(expected, Buffer.from(mac, 'hex'))) throw new Error('مجوز تصویر معتبر نیست.')
  const data = z.object({ actorId: z.string(), publicId: z.string(), expires: z.number() }).parse(JSON.parse(Buffer.from(payload, 'base64url').toString()))
  if (data.actorId !== actorId || data.publicId !== publicId || data.expires < Date.now()) throw new Error('مجوز تصویر منقضی شده است؛ دوباره آپلود کن.')
}
export async function verifyProductImage(publicId: string, ticket: string, actorId: string) {
  verifyTicket(ticket, actorId, publicId)
  const { cloud, key, secret } = config()
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload/${encodeURIComponent(publicId)}`, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64') }, cache: 'no-store', signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error('تأیید تصویر انجام نشد؛ دوباره تلاش کن.')
  const asset = z.object({ public_id: z.string(), format: z.enum(['jpg', 'png', 'webp']), bytes: z.number().int().positive().max(imageLimit),
    resource_type: z.literal('image'), type: z.literal('upload'), secure_url: z.url(), width: z.number().positive(), height: z.number().positive(), pages: z.number().optional(),
  }).safeParse(await response.json())
  if (!asset.success || asset.data.public_id !== publicId || (asset.data.pages ?? 1) > 1) throw new Error('تصویر باید JPG، PNG یا WebP ثابت و حداکثر ۵ مگابایت باشد.')
  const url = new URL(asset.data.secure_url)
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !url.pathname.startsWith(`/${cloud}/image/upload/`)) throw new Error('آدرس تصویر معتبر نیست.')
  return asset.data.secure_url
}
// Delete only application-owned assets, after the database no longer references them.
export async function removeProductImage(publicId: string) {
  if (!/^acoffee\/products\/[0-9a-f-]{36}$/.test(publicId)) return
  const { cloud, key, secret } = config()
  const params = { public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)), invalidate: 'true' }
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, { method: 'POST',
    body: new URLSearchParams({ ...params, api_key: key, signature: signature(params, secret) }), signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error('Image cleanup failed')
}
