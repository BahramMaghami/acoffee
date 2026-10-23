import { StorefrontImage } from '../storefront-image'
import Image from 'next/image'

export function ProductVisual({ name, imageUrl, sizes = '(max-width: 600px) 84vw, (max-width: 900px) 50vw, 33vw' }: { name: string; imageUrl?: string | null; sizes?: string }) {
  if (imageUrl) return <Image src={imageUrl} alt={`بستهٔ آ — ${name}`} fill sizes={sizes} style={{ objectFit: 'contain', backgroundColor: 'var(--product-photo-background)' }} />
  return <StorefrontImage alt={`بستهٔ آ — ${name}`} sizes={sizes} />
}
