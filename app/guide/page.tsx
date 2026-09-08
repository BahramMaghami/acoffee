import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Coffee } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'راهنمای دم‌آوری' }
const guides = [
  {
    id: '01',
    name: 'موکاپات',
    subtitle: 'قوی و آشنا',
    grind: 'متوسط رو به ریز',
    steps: [
      'مخزن پایین را تا زیر سوپاپ با آب پر کن.',
      'سبد را با قهوه پر و سطحش را صاف کن؛ قهوه را فشرده نکن.',
      'روی حرارت ملایم بگذار و به‌محض شروع صدای قل‌قل، از حرارت بردار.',
    ],
    note: 'در زمان دم‌آوری، درِ دستگاه را با احتیاط باز کن و مراقب بخار و بدنهٔ داغ باش.',
  },
  {
    id: '02',
    name: 'فرنچ‌پرس',
    subtitle: 'نرم و پُرتن',
    grind: 'درشت',
    steps: [
      'برای شروع، به‌ازای ۱۵ گرم قهوه، حدود ۲۲۵ میلی‌لیتر آب در نظر بگیر.',
      'آب را کمی بعد از جوش‌آمدن روی قهوه بریز و آرام هم بزن.',
      'حدود ۴ دقیقه صبر کن، پیستون را آرام پایین بده و قهوه را در فنجان بریز.',
    ],
    note: 'قهوه را بعد از دم‌آوری در فرنچ‌پرس نگه ندار تا بیش از حد تلخ نشود.',
  },
  {
    id: '03',
    name: 'وی۶۰',
    subtitle: 'شفاف و خوش‌عطر',
    grind: 'متوسط',
    steps: [
      'فیلتر کاغذی را با آب گرم خیس کن و آب داخل ظرف را دور بریز.',
      '۱۵ گرم قهوه اضافه کن؛ ابتدا کمی آب بریز و حدود ۳۰ ثانیه صبر کن.',
      'آب را آرام و دورانی تا حدود ۲۴۰ میلی‌لیتر اضافه کن؛ زمان کلی را حدود ۲ تا ۳ دقیقه هدف بگیر.',
    ],
    note: 'این نسبت‌ها نقطهٔ شروع‌اند؛ با تغییر کوچک آسیاب و مقدار آب، طعم دلخواهت را پیدا کن.',
  },
]

export default function GuidePage() {
  return (
    <div className="shell page-space">
      <div className="page-heading">
        <div>
          <span className="eyebrow">از دانه تا فنجان</span>
          <h1>خوب دم کن، آرام لذت ببر.</h1>
          <p>چند نقطهٔ شروع ساده برای یک فنجان بهتر در خانه.</p>
        </div>
        <Coffee size={46} strokeWidth={1} className="guide-icon" />
      </div>
      <div className="guide-grid">
        {guides.map((guide) => (
          <article className="brew-guide" key={guide.id}>
            <span className="guide-number">{guide.id}</span>
            <span className="eyebrow">{guide.subtitle}</span>
            <h2>{guide.name}</h2>
            <p className="grind-label">آسیاب پیشنهادی: {guide.grind}</p>
            <ol>
              {guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="guide-note">{guide.note}</p>
          </article>
        ))}
      </div>
      <div className="guide-bottom">
        <p>روش دم‌آوری‌ات را پیدا کردی؟ حالا نوبت قهوه است.</p>
        <Button asChild>
          <Link href="/shop">
            انتخاب قهوه <ArrowLeft />
          </Link>
        </Button>
      </div>
    </div>
  )
}
