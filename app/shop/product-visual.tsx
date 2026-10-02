import Image from 'next/image'
import { storefrontImage } from '@/lib/storefront'

export function ProductVisual({ name, sizes = '(max-width: 600px) 84vw, (max-width: 900px) 50vw, 33vw' }: { name: string; sizes?: string }) {
  return <Image src={storefrontImage} alt={`بستهٔ آ — ${name}`} fill sizes={sizes} style={{ objectFit: 'contain', backgroundColor: '#151515' }} />
}
