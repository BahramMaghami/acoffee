'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { maxCartQuantity } from '@/lib/storefront'
import { cartLineKey, isValidPreparation, type GrindOption, type GrindDevice } from '@/lib/order-options'
import { parseCart, type BrowserCartItem as CartItem } from '@/lib/cart-lines'
import { removePaidLines } from '@/lib/paid-cart'

const key = 'acoffee:preview-cart:v1'
const event = 'acoffee:cart-change'
let memory = '[]'
const receiptsKey = 'acoffee:checkout-carts:v1'
type Receipt = { items: CartItem[]; done: boolean }
let receiptsMemory: Record<string, Receipt> = {}
function receipts(): Record<string, Receipt> {
  try {
    const value = JSON.parse(localStorage.getItem(receiptsKey) ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).flatMap(([id, entry]) => {
      if (!entry || typeof entry !== 'object') return []
      const receipt = entry as Receipt
      return [[id, { items: parseCart(JSON.stringify(receipt.items)), done: receipt.done === true }]]
    }))
  } catch { return receiptsMemory }
}
function saveReceipts(value: Record<string, Receipt>) {
  receiptsMemory = value
  try { localStorage.setItem(receiptsKey, JSON.stringify(value)) } catch { /* In-memory fallback. */ }
}
export function rememberOrderCart(orderId: string, items: CartItem[]) {
  const value = receipts()
  // Retries must not replace the original snapshot or reset consumption.
  if (!value[orderId]) saveReceipts({ ...value, [orderId]: { items, done: false } })
}
export async function consumePaidCart(orderId: string, paid: CartItem[]) {
  const consume = () => {
    const value = receipts()
    const receipt = value[orderId]
    if (!receipt || receipt.done) return
    const next = removePaidLines(parseCart(getSnapshot()), receipt.items, paid)
    saveReceipts({ ...value, [orderId]: { items: [], done: true } })
    save(next)
  }
  if (navigator.locks) await navigator.locks.request('acoffee-cart', consume)
  else consume()
}
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
  // A reduction/removal/preparation change cancels eligibility for those lines.
  // Re-adding an identical SKU later must not let an old payment remove it.
  const before = parseCart(getSnapshot())
  const reduced = before.filter(old => (items.find(item => cartLineKey(item.productId, item.grind, item.grindDevice) === cartLineKey(old.productId, old.grind, old.grindDevice))?.quantity ?? 0) < old.quantity)
  if (reduced.length) {
    const keys = new Set(reduced.map(item => cartLineKey(item.productId, item.grind, item.grindDevice)))
    const value = receipts()
    for (const receipt of Object.values(value)) receipt.items = receipt.items.filter(item => !keys.has(cartLineKey(item.productId, item.grind, item.grindDevice)))
    saveReceipts(value)
  }
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

  function setQuantity(productId: string, quantity: number, grind: GrindOption | null = null, grindDevice: GrindDevice | null = null) {
    if (!/^[a-zA-Z0-9-]{1,200}$/.test(productId) || !Number.isSafeInteger(quantity)) return
    const current = parseCart(getSnapshot())
    const key = cartLineKey(productId, grind, grindDevice)
    const matches = (item: CartItem) => cartLineKey(item.productId, item.grind, item.grindDevice) === key
    if (quantity <= 0) {
      save(current.filter((item) => !matches(item)))
      return
    }
    const next = { productId, grind, grindDevice, quantity: Math.min(quantity, maxCartQuantity) }
    save(current.some(matches)
      ? current.map((item) => matches(item) ? next : item)
      : [...current, next])
  }

  function add(productId: string, quantity: number, grind: GrindOption, grindDevice: GrindDevice | null = null) {
    if (!isValidPreparation(grind, grindDevice)) return
    const key = cartLineKey(productId, grind, grindDevice)
    const current =
      parseCart(getSnapshot()).find((item) => cartLineKey(item.productId, item.grind, item.grindDevice) === key)
        ?.quantity ?? 0
    setQuantity(productId, current + quantity, grind, grindDevice)
  }

  function setPreparation(productId: string, previous: Pick<CartItem, 'grind' | 'grindDevice'>, grind: GrindOption, grindDevice: GrindDevice | null = null) {
    const current = parseCart(getSnapshot())
    const key = cartLineKey(productId, previous.grind, previous.grindDevice)
    const next = current.map(item => cartLineKey(item.productId, item.grind, item.grindDevice) === key
      ? { ...item, grind, grindDevice: grind === 'GROUND' ? grindDevice : null } : item)
    save(parseCart(JSON.stringify(next)))
  }

  function replace(items: CartItem[]) {
    const value = receipts()
    for (const receipt of Object.values(value)) receipt.items = []
    saveReceipts(value)
    save(parseCart(JSON.stringify(items)))
  }
  return { items, count, add, setQuantity, setPreparation, replace, hydrated }
}
