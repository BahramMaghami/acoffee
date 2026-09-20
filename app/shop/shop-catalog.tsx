'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { products, formatNumber, visibleCategories, cafeGroups, startingPrice, type Category, type CafeGroup } from '@/lib/storefront'
import { ProductCard } from './product-card'
import { CafeOffer } from './cafe-offer'

const normalize = (text: string) =>
  text
    .replaceAll('ي', 'ی')
    .replaceAll('ك', 'ک')
    .replaceAll('‌', ' ')
    .trim()
    .toLowerCase()

export function ShopCatalog({ idPrefix = 'shop' }: { idPrefix?: string }) {
  const [category, setCategory] = useState<Category>(visibleCategories[0].value)
  const [group, setGroup] = useState<CafeGroup>(cafeGroups[0].value)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('default')
  const filtered = products
    .filter(
      (product) =>
        product.category === category &&
        (category !== 'cafe' || product.cafeGroup === group) &&
        normalize(
          `${product.name} ${product.grades.includes('vip') ? 'vip' : ''}`,
        ).includes(normalize(query)),
    )
    .sort((a, b) =>
      sort === 'default' ? 0 : startingPrice(a) === null ? (startingPrice(b) === null ? 0 : 1)
        : startingPrice(b) === null ? -1 : sort === 'lowest' ? startingPrice(a)! - startingPrice(b)! : startingPrice(b)! - startingPrice(a)!,
    )

  return (
    <>
      <div className="catalog-toolbar">
        <div className="filter-tabs" aria-label="نوع قهوه">
          {visibleCategories.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={category === item.value}
              onClick={() => { setCategory(item.value); setGroup(cafeGroups[0].value) }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="catalog-search">
          <Search size={17} />
          <label htmlFor={`${idPrefix}-search`} className="sr-only">
            جست‌وجوی قهوه
          </label>
          <Input
            id={`${idPrefix}-search`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="دنبال چه طعمی می‌گردی؟"
          />
        </div>
      </div>
      {category === 'cafe' && <div className="filter-tabs cafe-subcategories" aria-label="گروه قهوهٔ کافه">
        {cafeGroups.map((item) => <button key={item.value} type="button" aria-pressed={group === item.value} onClick={() => setGroup(item.value)}>{item.label}</button>)}
      </div>}
      {category === 'cafe' && <CafeOffer />}
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
          <p>یک عبارت دیگر امتحان کن یا جست‌وجو را پاک کن.</p>
          <Button
            variant="outline"
            onClick={() => {
              setQuery('')
            }}
          >
            پاک کردن جست‌وجو
          </Button>
        </div>
      )}
      <p className="preview-note">
        مبلغ و موجودی نهایی قهوه‌ها در مرحلهٔ تأیید سفارش بررسی می‌شود.
      </p>
    </>
  )
}
