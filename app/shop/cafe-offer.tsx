import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cafeOffer, formatNumber } from '@/lib/storefront'

export function CafeOffer() {
  return <aside className="cafe-offer" id="cafe-offer">
    <div><span className="eyebrow">همراه کافهٔ شما</span><h2>سفارش {formatNumber(cafeOffer.minimumWeightGrams / 1000)} کیلوگرم و بیشتر</h2><p>برای تأمین قهوهٔ کافه و دریافت پیشنهاد قیمت، مستقیم با ما در ارتباط باش.</p></div>
    {cafeOffer.contactUrl ? <Button asChild variant="outline"><a href={cafeOffer.contactUrl}>استعلام قیمت کافه‌ها <ArrowLeft /></a></Button>
      : <p className="cafe-contact-pending">راه ارتباط سفارش عمده به‌زودی اعلام می‌شود.</p>}
  </aside>
}
