import { mkdir, writeFile } from 'node:fs/promises'
import { compareBlendPrices } from '../lib/price-comparison'
import { formatNumber, formatWeight, gradeLabels } from '../lib/storefront'

const result = compareBlendPrices()
const differences = result.comparisons.filter(row => !row.matches)
const report = [
  '# مقایسهٔ قیمت ترکیب‌ها',
  '',
  `از ${formatNumber(result.comparisons.length)} حالت وزن، رست و نوع قهوه، ${formatNumber(differences.length)} مورد با قیمت فعلی متفاوت است.`,
  'این گزارش فقط برای مقایسه است؛ قیمت‌های کاتالوگ و دیتابیس تغییر نکرده‌اند.',
  'مبنای محاسبه: قیمت ۱۰۰٪ عربیکا و ۱۰۰٪ روبوستا از همان نوع قهوه، برای ۵۰۰ گرم یا ۵ کیلوگرم. قیمت ۱۰ کیلو = قیمت محاسبه‌شدهٔ ۵ کیلو × ۲ × ۹۷٪.',
  'جدول برای رست مدیوم است؛ هر دو رست در مقایسه بررسی شده‌اند. همهٔ مبالغ تومان‌اند.',
  '',
  '| قهوه | وزن | نوع | فعلی | محاسبه‌شده | اختلاف |',
  '| --- | --- | --- | ---: | ---: | ---: |',
  ...result.comparisons.filter(row => row.roast === 'medium').map(row =>
    `| ${row.name} | ${formatWeight(row.weightGrams)} | ${gradeLabels[row.grade]} | ${row.currentPrice === null ? 'نامشخص' : formatNumber(row.currentPrice)} | ${formatNumber(row.calculatedPrice)} | ${row.difference === null ? 'نامشخص' : formatNumber(row.difference)} |`),
]
await mkdir('artifacts/ui', { recursive: true })
await writeFile('artifacts/ui/blend-price-comparison.md', report.join('\n') + '\n', 'utf8')
await writeFile('artifacts/ui/blend-price-comparison.json', JSON.stringify(result, null, 2) + '\n', 'utf8')
console.log(JSON.stringify({ checked: result.comparisons.length, differences: differences.length, allMatch: result.allMatch, pricesReplaced: false, report: 'artifacts/ui/blend-price-comparison.md' }))
