import { discountLabel, formatWeight } from '@/lib/storefront'

export function DiscountRibbon({ percent, weight }: { percent: number; weight: number }) {
  return <span className="wholesale-ribbon"><strong>{discountLabel(percent)}</strong><span>{formatWeight(weight)}</span></span>
}
