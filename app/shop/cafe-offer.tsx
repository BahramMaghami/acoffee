import { Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cafeOffer, formatNumber } from '@/lib/storefront'

export function CafeOffer() {
  return <aside className="cafe-offer" id="cafe-offer">
    <div><span className="eyebrow">سفارش کافه و شرکت‌ها</span><h2>سفارش {formatNumber(cafeOffer.minimumWeightGrams / 1000)} کیلوگرم و بیشتر</h2><p>برای سفارش عمده و اطلاع از قیمت با شمارهٔ <bdi dir="ltr">{cafeOffer.contactLabel}</bdi> تماس بگیرید.</p></div>
    <Button asChild variant="outline">
      <a href={cafeOffer.contactUrl} aria-label={`تماس برای سفارش عمده با شمارهٔ ${cafeOffer.contactLabel}`}>
        تماس بگیرید <Phone aria-hidden="true" />
      </a>
    </Button>
  </aside>
}
