'use client'

import { useEffect } from 'react'
import { consumePaidCart } from '@/app/cart/cart-store'
import type { BrowserCartItem } from '@/lib/cart-lines'

export function PaidCartSync({ orderId, items }: { orderId: string; items: BrowserCartItem[] }) {
  useEffect(() => { void consumePaidCart(orderId, items) }, [orderId, items])
  return null
}
