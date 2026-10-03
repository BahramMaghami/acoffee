import Image from 'next/image'
import { storefrontImages } from '@/lib/storefront'

export function StorefrontImage({ alt, sizes, priority = false }: {
  alt: string
  sizes: string
  priority?: boolean
}) {
  return (
    <>
      {(['light', 'dark'] as const).map(theme => (
        <Image
          key={theme}
          src={storefrontImages[theme]}
          alt={alt}
          fill
          sizes={sizes}
          className={`storefront-image-${theme}`}
          fetchPriority={priority ? 'high' : undefined}
          style={{ objectFit: 'contain', backgroundColor: 'var(--product-photo-background)' }}
        />
      ))}
    </>
  )
}
