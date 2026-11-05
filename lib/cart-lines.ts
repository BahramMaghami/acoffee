import { cartLineKey, isGrindOption, isGrindDevice, type GrindOption, type GrindDevice } from './order-options'
import { maxCartQuantity } from './storefront'

export type BrowserCartItem = { productId: string; quantity: number; grind: GrindOption | null; grindDevice: GrindDevice | null }
export function parseCart(raw: string): BrowserCartItem[] {
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    const lines = new Map<string, BrowserCartItem>()
    for (const item of data) {
      if (!item || typeof item !== 'object' || typeof item.productId !== 'string' ||
        !/^[a-zA-Z0-9-]{1,200}$/.test(item.productId) || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) continue
      // Preserve old carts without inventing a preparation choice.
      const grind = isGrindOption(item.grind) ? item.grind : null
      const grindDevice = grind === 'GROUND' && isGrindDevice(item.grindDevice) ? item.grindDevice : null
      const key = cartLineKey(item.productId, grind, grindDevice)
      lines.set(key, { productId: item.productId, grind, grindDevice, quantity: Math.min((lines.get(key)?.quantity ?? 0) + item.quantity, maxCartQuantity) })
    }
    return [...lines.values()].slice(0, 50)
  } catch { return [] }
}
