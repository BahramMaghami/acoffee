'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { maxCartQuantity } from '@/lib/storefront'
import { cartLineKey, type GrindOption } from '@/lib/order-options'
import { parseCart, type BrowserCartItem as CartItem } from '@/lib/cart-lines'

const key = 'acoffee:preview-cart:v1'
const event = 'acoffee:cart-change'
let memory = '[]'
function getSnapshot() {
  try {
    return localStorage.getItem(key) ?? memory
  } catch {
    return memory
  }
}


function subscribe(callback: () => void) {
  window.addEventListener(event, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(event, callback)
    window.removeEventListener('storage', callback)
  }
}

function save(items: CartItem[]) {
  memory = JSON.stringify(items)
  try {
    localStorage.setItem(key, memory)
  } catch {
    /* Keep this tab's cart when storage is unavailable. */
  }
  window.dispatchEvent(new Event(event))
}

export function useCart() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => '[]')
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false)
  const items = useMemo(() => parseCart(raw), [raw])
  const count = items.reduce((total, item) => total + item.quantity, 0)

  function setQuantity(productId: string, quantity: number, grind: GrindOption | null = null) {
    if (!/^[a-zA-Z0-9-]{1,200}$/.test(productId) || !Number.isSafeInteger(quantity)) return
    const current = parseCart(getSnapshot())
    const key = cartLineKey(productId, grind)
    const matches = (item: CartItem) => cartLineKey(item.productId, item.grind) === key
    if (quantity <= 0) {
      save(current.filter((item) => !matches(item)))
      return
    }
    const next = { productId, grind, quantity: Math.min(quantity, maxCartQuantity) }
    save(current.some(matches)
      ? current.map((item) => matches(item) ? next : item)
      : [...current, next])
  }

  function add(productId: string, quantity: number, grind: GrindOption) {
    const current =
      parseCart(getSnapshot()).find((item) => item.productId === productId && item.grind === grind)
        ?.quantity ?? 0
    setQuantity(productId, current + quantity, grind)
  }

  function setGrind(productId: string, previous: GrindOption | null, grind: GrindOption) {
    const current = parseCart(getSnapshot())
    const next = current.map(item => item.productId === productId && item.grind === previous ? { ...item, grind } : item)
    save(parseCart(JSON.stringify(next)))
  }

  return { items, count, add, setQuantity, setGrind, hydrated }
}
