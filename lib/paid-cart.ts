import type { BrowserCartItem } from './cart-lines'
import { cartLineKey } from './order-options'

const key = (line: BrowserCartItem) => cartLineKey(line.productId, line.grind, line.grindDevice)
export function removePaidLines(current: BrowserCartItem[], submitted: BrowserCartItem[], paid: BrowserCartItem[]) {
  const quantities = new Map(submitted.map(line => [key(line), line.quantity]))
  const purchased = new Map(paid.map(line => [key(line), line.quantity]))
  return current.flatMap(line => {
    const amount = purchased.get(key(line))
    // Only remove lines that were actually in this browser's submitted cart.
    if (!amount || quantities.get(key(line)) !== amount || line.quantity < amount) return [line]
    const quantity = line.quantity - amount
    return quantity ? [{ ...line, quantity }] : []
  })
}
