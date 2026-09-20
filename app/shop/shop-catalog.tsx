import { products, visibleCategories } from '@/lib/storefront'
import { ProductCard } from './product-card'
import { CategorySlider } from './category-slider'
import { CafeOffer } from './cafe-offer'

export function ShopCatalog({ idPrefix = 'shop' }: { idPrefix?: string }) {
  return (
    <div className="category-sliders">
      {visibleCategories.map((category) => {
        const items = products.filter((product) => product.category === category.value)
        return (
          <div key={category.value}>
            <CategorySlider
              id={`${idPrefix}-${category.value}`}
              title={category.label}
              href={`/shop/category/${category.value}`}
              count={items.length}
            >
              {items.map((product) => <ProductCard key={product.id} product={product} />)}
            </CategorySlider>
            {category.value === 'cafe' && <CafeOffer />}
          </div>
        )
      })}
    </div>
  )
}
