import { StorefrontImage } from '../storefront-image'

export function ProductVisual({ name, sizes = '(max-width: 600px) 84vw, (max-width: 900px) 50vw, 33vw' }: { name: string; sizes?: string }) {
  return <StorefrontImage alt={`بستهٔ آ — ${name}`} sizes={sizes} />
}
