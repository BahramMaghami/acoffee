'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { products, formatNumber } from '@/lib/storefront'
import { ProductCard } from './product-card'

const categories = [
  { value: 'all', label: 'همهٔ قهوه‌ها' },
  { value: 'blend', label: 'ترکیبی' },
  { value: 'arabica', label: 'تک‌خاستگاه' },
]
const normalize = (text: string) =>
  text
    .replaceAll('ي', 'ی')
    .replaceAll('ك', 'ک')
    .replaceAll('‌', ' ')
    .trim()
    .toLowerCase()

export function ShopCatalog() {
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('default')
  const filtered = products
    .filter(
      (product) =>
        (category === 'all' || product.category === category) &&
        normalize(
          `${product.name} ${product.notes.join(' ')} ${product.origin}`,
        ).includes(normalize(query)),
    )
    .sort((a, b) =>
      sort === 'lowest'
        ? a.price - b.price
        : sort === 'highest'
          ? b.price - a.price
          : 0,
    )

  return (
    <>
      <div className="catalog-toolbar">
        <div className="filter-tabs" aria-label="نوع قهوه">
          {categories.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={category === item.value}
              onClick={() => setCategory(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="catalog-search">
          <Search size={17} />
          <label htmlFor="search" className="sr-only">
            جست‌وجوی قهوه
          </label>
          <Input
            id="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="دنبال چه طعمی می‌گردی؟"
          />
        </div>
      </div>
      <div className="catalog-results">
        <span aria-live="polite">
          {formatNumber(filtered.length)} قهوه برای انتخاب
        </span>
        <label className="sort-control">
          <SlidersHorizontal size={15} />
          <span className="sr-only">مرتب‌سازی</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="default">پیشنهاد آ</option>
            <option value="lowest">ارزان‌ترین</option>
            <option value="highest">گران‌ترین</option>
          </select>
        </label>
      </div>
      {filtered.length ? (
        <div className="product-grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={32} />
          <h2>این طعم را پیدا نکردیم.</h2>
          <p>یک عبارت دیگر امتحان کن یا همهٔ قهوه‌ها را ببین.</p>
          <Button
            variant="outline"
            onClick={() => {
              setCategory('all')
              setQuery('')
            }}
          >
            نمایش همهٔ قهوه‌ها
          </Button>
        </div>
      )}
      <p className="preview-note">
        مبلغ و موجودی نهایی قهوه‌ها در مرحلهٔ تأیید سفارش بررسی می‌شود.
      </p>
    </>
  )
}
