'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { products } from '@/lib/storefront'

const key = 'acoffee:preview-cart:v1'
const event = 'acoffee:cart-change'
let memory = '[]'
type CartItem = { productId: string; quantity: number }

function getSnapshot() {
  try {
    return localStorage.getItem(key) ?? memory
  } catch {
    return memory
  }
}

function parseCart(raw: string): CartItem[] {
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    const quantities = new Map<string, number>()
    for (const item of data) {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof item.productId !== 'string' ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0
      )
        continue
      const product = products.find((product) => product.id === item.productId)
      if (product)
        quantities.set(
          product.id,
          Math.min(
            (quantities.get(product.id) ?? 0) + item.quantity,
            product.stock,
          ),
        )
    }
    return Array.from(quantities, ([productId, quantity]) => ({
      productId,
      quantity,
    }))
  } catch {
    return []
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
  const items = useMemo(() => parseCart(raw), [raw])
  const count = items.reduce((total, item) => total + item.quantity, 0)

  function setQuantity(productId: string, quantity: number) {
    const product = products.find((product) => product.id === productId)
    if (!product || !Number.isSafeInteger(quantity)) return
    const current = parseCart(getSnapshot()).filter(
      (item) => item.productId !== productId,
    )
    if (quantity > 0)
      current.push({ productId, quantity: Math.min(quantity, product.stock) })
    save(current)
  }

  function add(productId: string, quantity = 1) {
    const current =
      parseCart(getSnapshot()).find((item) => item.productId === productId)
        ?.quantity ?? 0
    setQuantity(productId, current + quantity)
  }

  return { items, count, add, setQuantity }
}
