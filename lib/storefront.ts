// Visual preview data. Replace with server-side product queries in the commerce phase.
export const products = [
  {
    id: 'daily-blend',
    slug: 'daily-blend',
    name: 'ترکیب روزانه',
    englishName: 'DAILY BLEND',
    number: '01',
    subtitle: 'همراه آشنای هر صبح',
    price: 385000,
    weightGrams: 250,
    stock: 12,
    image: '/images/daily-blend.png',
    category: 'blend',
    badge: 'انتخاب روزانه',
    notes: ['شکلات', 'فندق', 'کارامل'],
    roast: 'متوسط',
    origin: 'برزیل و هند',
    composition: '۷۰٪ عربیکا · ۳۰٪ روبوستا',
    description:
      'یک فنجان متعادل با عطر شکلات و شیرینی ملایم کارامل. ترکیبی برای صبح‌های شلوغ و عصرهای آرام؛ هم به‌تنهایی دل‌نشین است و هم کنار شیر.',
    brew: 'اسپرسو و موکاپات',
    intensity: 3,
  },
  {
    id: 'single-origin',
    slug: 'single-origin',
    name: 'عربیکای اتیوپی',
    englishName: 'SINGLE ORIGIN',
    number: '02',
    subtitle: 'کمی روشن‌تر، کمی متفاوت‌تر',
    price: 495000,
    weightGrams: 250,
    stock: 8,
    image: '/images/single-origin.png',
    category: 'arabica',
    badge: '۱۰۰٪ عربیکا',
    notes: ['مرکبات', 'گل یاس', 'عسل'],
    roast: 'روشن تا متوسط',
    origin: 'اتیوپی',
    composition: '۱۰۰٪ عربیکا',
    description:
      'عطر گل‌ها و طعم روشن مرکبات، با پایانی شیرین و لطیف. قهوه‌ای برای وقتی که می‌خواهید کمی مکث کنید و لایه‌های تازه‌ای در فنجانتان پیدا کنید.',
    brew: 'وی۶۰ و فرنچ‌پرس',
    intensity: 2,
  },
  {
    id: 'dark-blend',
    slug: 'dark-blend',
    name: 'ترکیب شب',
    englishName: 'DARK BLEND',
    number: '03',
    subtitle: 'عمیق، پرقدرت، ماندگار',
    price: 345000,
    weightGrams: 250,
    stock: 10,
    image: '/images/dark-blend.png',
    category: 'blend',
    badge: 'طعم قوی‌تر',
    notes: ['شکلات تلخ', 'گردو', 'ادویه'],
    roast: 'تیره',
    origin: 'برزیل و ویتنام',
    composition: '۴۰٪ عربیکا · ۶۰٪ روبوستا',
    description:
      'بافت غلیظ و طعم عمیق شکلات تلخ، برای دوست‌داران قهوه‌های پرقدرت. ترکیبی با تن‌واری بالا که در اسپرسو و نوشیدنی‌های شیری خودش را خوب نشان می‌دهد.',
    brew: 'اسپرسو و موکاپات',
    intensity: 5,
  },
] as const

export type StoreProduct = (typeof products)[number]
export const formatNumber = (value: number) =>
  new Intl.NumberFormat('fa-IR').format(value)
export const formatPrice = (value: number) => `${formatNumber(value)} تومان`
