import Image from 'next/image'
import { storefrontImages } from '@/lib/storefront'

export function StorefrontImage({ alt, sizes, priority = false }: {
  alt: string
  sizes: string
  priority?: boolean
}) {
  return (
    <Image
      src={storefrontImages.light}
      alt={alt}
      fill
      sizes={sizes}
      fetchPriority={priority ? 'high' : undefined}
      style={{ objectFit: 'contain', backgroundColor: 'var(--product-photo-background)' }}
    />
  )
}
