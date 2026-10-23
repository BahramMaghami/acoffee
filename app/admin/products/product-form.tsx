'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductVisual } from '@/app/shop/product-visual'
import { productFormSchema, priceInputSchema, type ProductFormInput } from '@/lib/validators/admin-products'
import { categoryDefaults, calculateProductPrices, type ProductDefaults } from '@/lib/product-pricing'
import { normalizeDigits } from '@/lib/validators/checkout'
import { formatWeight, formatPrice, gradeLabels, roastOptions, type Grade, type Roast } from '@/lib/storefront'
import { prepareProductImageAction, saveProductAction } from '@/actions/product.actions'
import { ConfirmationDialog } from '../confirmation-dialog'

type EditorCategory = { id: string; name: string; slug: string; defaultWeights: number[]; defaultRoasts: string[]; defaultGrades: string[]; wholesale: boolean }
export function ProductForm({ categories, initial, imageUrl, uploadEnabled }: {
  categories: EditorCategory[]; initial?: ProductFormInput; imageUrl?: string | null; uploadEnabled: boolean
}) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const previousCategory = useRef(initial?.categoryId ?? categories[0]?.id ?? '')
  const [pending, startTransition] = useTransition()
  const [newCategory, setNewCategory] = useState(false)
  const [customWeight, setCustomWeight] = useState('')
  const [weightError, setWeightError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [preview, setPreview] = useState(imageUrl ?? null)
  const [confirmation, setConfirmation] = useState<ProductFormInput | null>(null)
  const defaults: ProductFormInput = initial ?? { categoryId: categories[0]?.id ?? '', newCategoryName: '', name: '', weights: [], roasts: [], noRoast: false,
    grades: [], basePrices: { standard: '', vip: '' }, overrides: {}, availability: {}, isActive: true, removeImage: false, imagePublicId: null, confirmRemoved: false }
  const form = useForm<ProductFormInput, unknown, z.output<typeof productFormSchema>>({ resolver: zodResolver(productFormSchema), defaultValues: defaults })
  const value = useWatch({ control: form.control }) as ProductFormInput
  const category = categories.find(c => c.id === value.categoryId)
  const preset: ProductDefaults = newCategory || !category ? categoryDefaults('new') : {
    weights: category.defaultWeights, roasts: category.defaultRoasts as Roast[], grades: category.defaultGrades as Grade[], wholesale: category.wholesale,
  }
  const effective: ProductDefaults = { weights: value.weights.length ? value.weights : preset.weights,
    roasts: value.noRoast ? [] : value.roasts.length ? value.roasts : preset.roasts,
    grades: value.grades.length ? value.grades : preset.grades, wholesale: preset.wholesale }
  const parsedPrices = priceInputSchema.safeParse(value)
  let rows: ReturnType<typeof calculateProductPrices> = []
  let priceError = ''
  try {
    if (parsedPrices.success) rows = calculateProductPrices({ ...effective, ...parsedPrices.data })
    else priceError = parsedPrices.error.issues[0].message
  } catch { priceError = 'مبلغ محاسبه‌شده بیش از حد مجاز است.' }
  const errors = form.formState.errors
  function submit(raw: ProductFormInput) {
    startTransition(async () => {
      try {
        const result = await saveProductAction(raw)
        if (!result.success) { form.setError('root', { message: result.message }); setConfirmation(null); return }
        toast.success(result.message)
        setConfirmation(null)
        router.push('/admin/products')
      } catch { form.setError('root', { message: 'ذخیره انجام نشد؛ دوباره تلاش کن.' }); setConfirmation(null) }
    })
  }
  async function upload(file?: File) {
    if (!file) return
    setUploadError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) {
      setUploadError('تصویر JPG، PNG یا WebP و حداکثر ۵ مگابایت انتخاب کن.'); return
    }
    setUploading(true)
    try {
      const prepared = await prepareProductImageAction()
      if (!prepared.success) throw new Error(prepared.message)
      const body = new FormData()
      for (const [key, field] of Object.entries(prepared.upload.fields)) body.append(key, field)
      body.append('file', file)
      const response = await fetch(prepared.upload.url, { method: 'POST', body, signal: AbortSignal.timeout(60000) })
      if (!response.ok) throw new Error('آپلود انجام نشد؛ دوباره تلاش کن.')
      const asset = await response.json()
      if (asset.public_id !== prepared.upload.publicId || typeof asset.secure_url !== 'string') throw new Error('پاسخ آپلود معتبر نیست.')
      form.setValue('imagePublicId', asset.public_id, { shouldDirty: true })
      form.setValue('imageTicket', prepared.upload.ticket)
      form.setValue('removeImage', false)
      setPreview(asset.secure_url)
    } catch (error) { setUploadError(error instanceof Error ? error.message : 'آپلود انجام نشد؛ دوباره تلاش کن.') }
    finally { setUploading(false) }
  }
  return <>
    <form className="admin-product-form" noValidate aria-busy={pending || uploading} onSubmit={form.handleSubmit(() => {
      const raw = form.getValues()
      const keys = new Set(rows.map(row => row.key))
      const removes = initial && Object.keys(initial.availability).some(key => !keys.has(key))
      if (removes) setConfirmation(raw)
      else submit(raw)
    })}>
      <fieldset disabled={pending || uploading} className="admin-product-fields">
        <div className="form-field">
          <label htmlFor="product-category">۱. دسته‌بندی</label>
          <div className="admin-inline-fields"><select id="product-category" {...form.register('categoryId')} disabled={newCategory}>
            <option value="">انتخاب دسته</option>{categories.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}
          </select><Button type="button" variant="outline" onClick={() => {
            if (!newCategory) { previousCategory.current = value.categoryId; form.setValue('categoryId', '') }
            else form.setValue('categoryId', previousCategory.current)
            setNewCategory(!newCategory); form.setValue('newCategoryName', '')
          }}>{newCategory ? 'انتخاب از دسته‌ها' : 'افزودن دسته'}</Button></div>
          {newCategory && <div className="admin-new-category"><label htmlFor="new-category">نام دستهٔ جدید</label><Input id="new-category" {...form.register('newCategoryName')} /><small>با ذخیرهٔ محصول، دسته هم ایجاد می‌شود.</small></div>}
          <p className="field-error">{errors.categoryId?.message ?? errors.newCategoryName?.message}</p>
        </div>
        <div className="form-field"><label htmlFor="product-name">۲. نام محصول</label><Input id="product-name" {...form.register('name')} maxLength={100} aria-invalid={Boolean(errors.name)} /><p className="field-error">{errors.name?.message}</p></div>
        <fieldset className="admin-option-field"><legend>۳. وزن‌ها <small>اختیاری</small></legend>
          <p>پیش‌فرض این دسته: {preset.weights.map(formatWeight).join('، ')}</p>
          <div className="admin-option-list">{[...new Set([...preset.weights, ...value.weights])].sort((a, b) => a - b).map(weight => <label key={weight}><input type="checkbox" checked={value.weights.includes(weight)} onChange={e => form.setValue('weights', e.target.checked ? [...value.weights, weight] : value.weights.filter(w => w !== weight), { shouldDirty: true })} />{formatWeight(weight)}</label>)}</div>
          <div className="admin-inline-fields"><Input aria-label="وزن جدید به گرم" inputMode="numeric" value={customWeight} onChange={e => setCustomWeight(e.target.value)} placeholder="وزن به گرم" /><Button type="button" variant="outline" onClick={() => {
            const weight = Number(normalizeDigits(customWeight))
            if (!Number.isInteger(weight) || weight < 1 || weight > 100000 || value.weights.length >= 20) { setWeightError('وزن بین ۱ تا ۱۰۰٬۰۰۰ گرم و حداکثر ۲۰ وزن وارد کن.'); return }
            form.setValue('weights', [...new Set([...(value.weights.length ? value.weights : preset.weights), weight])], { shouldDirty: true }); setCustomWeight(''); setWeightError('')
          }}>افزودن وزن</Button></div><p className="field-error">{weightError || errors.weights?.message}</p>
        </fieldset>
        <fieldset className="admin-option-field"><legend>۴. رست <small>اختیاری</small></legend>
          <p>پیش‌فرض: {preset.roasts.length ? preset.roasts.map(r => roastOptions.find(o => o.value === r)!.label).join('، ') : 'بدون انتخاب رست'}</p>
          <div className="admin-option-list">{roastOptions.map(r => <label key={r.value}><input type="checkbox" disabled={value.noRoast} checked={value.roasts.includes(r.value)} onChange={e => form.setValue('roasts', e.target.checked ? [...value.roasts, r.value] : value.roasts.filter(v => v !== r.value), { shouldDirty: true })} />{r.label}</label>)}
          <label><input type="checkbox" {...form.register('noRoast')} />بدون رست</label></div>
        </fieldset>
        <fieldset className="admin-option-field"><legend>۵. نوع قهوه <small>اختیاری</small></legend>
          <p>پیش‌فرض: {preset.grades.map(g => gradeLabels[g]).join(' / ')}</p>
          <div className="admin-option-list">{(['standard', 'vip'] as const).map(grade => <label key={grade}><input type="checkbox" checked={value.grades.includes(grade)} onChange={e => form.setValue('grades', e.target.checked ? [...value.grades, grade] : value.grades.filter(g => g !== grade), { shouldDirty: true })} /><span dir="ltr">{gradeLabels[grade]}</span></label>)}</div>
        </fieldset>
        <fieldset className="admin-option-field"><legend>۶. قیمت</legend>
          <p>قیمت یک کیلو به تومان؛ قیمت مستقل هر انتخاب بر محاسبات اولویت دارد.</p>
          <div className="admin-base-prices">{effective.grades.map(grade => <div key={grade}><label htmlFor={`price-${grade}`}>{gradeLabels[grade]} · یک کیلو</label><Input id={`price-${grade}`} inputMode="numeric" {...form.register(`basePrices.${grade}`)} /></div>)}</div>
          {preset.wholesale && <p>۱۰ کیلو: دو برابر قیمت نهایی ۵ کیلو با ۳٪ تخفیف؛ مگر قیمت مستقل وارد کنی.</p>}
          {priceError && <p className="field-error" role="alert">{priceError}</p>}
          <div className="admin-price-table"><table><caption className="sr-only">پیش‌نمایش قیمت انتخاب‌ها</caption><thead><tr><th>انتخاب</th><th>قیمت نهایی</th><th>قیمت مستقل (تومان)</th><th>قابل سفارش</th></tr></thead><tbody>
            {rows.map(row => {
              const label = [formatWeight(row.weightGrams), roastOptions.find(r => r.value === row.roast)?.label, gradeLabels[row.grade]].filter(Boolean).join(' · ')
              return <tr key={row.key}><th scope="row">{label}</th><td>{row.price === null ? 'اعلام نشده' : formatPrice(row.price)}{row.discountPercent === 3 && <small>۳٪ تخفیف</small>}</td>
                <td><Input aria-label={`قیمت مستقل ${label}`} inputMode="numeric" value={value.overrides[row.key] ?? ''} placeholder="محاسبهٔ خودکار" onChange={e => form.setValue('overrides', { ...value.overrides, [row.key]: e.target.value }, { shouldDirty: true })} />
                {Object.hasOwn(value.overrides, row.key) && <button type="button" className="quiet-link" onClick={() => { const next = { ...value.overrides }; delete next[row.key]; form.setValue('overrides', next, { shouldDirty: true }) }}>بازگشت به محاسبه</button>}</td>
                <td><input type="checkbox" aria-label={`قابل سفارش ${label}`} checked={value.availability[row.key] ?? true} onChange={e => form.setValue('availability', { ...value.availability, [row.key]: e.target.checked }, { shouldDirty: true })} /></td></tr>
            })}
          </tbody></table></div>
        </fieldset>
        <fieldset className="admin-option-field"><legend>۷. تصویر <small>اختیاری</small></legend>
          <div className="admin-image-preview"><ProductVisual name={value.name || 'محصول'} imageUrl={preview} sizes="180px" /></div>
          <label htmlFor="product-image" className="sr-only">انتخاب تصویر</label><input ref={fileInput} className="sr-only" id="product-image" type="file" accept="image/jpeg,image/png,image/webp" disabled={!uploadEnabled || uploading} onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }} />
          <Button type="button" variant="outline" disabled={!uploadEnabled || uploading} onClick={() => fileInput.current?.click()}>انتخاب تصویر</Button>
          <p>{uploadEnabled ? 'JPG، PNG یا WebP؛ حداکثر ۵ مگابایت.' : 'آپلود هنوز تنظیم نشده؛ تصویر پیش‌فرض قابل استفاده است.'}</p>
          {preview && <Button type="button" variant="outline" onClick={() => { setPreview(null); form.setValue('imagePublicId', null); form.setValue('imageTicket', undefined); form.setValue('removeImage', true) }}>استفاده از تصویر پیش‌فرض</Button>}
          {uploadError && <p role="alert" className="field-error">{uploadError}</p>}
        </fieldset>
        <div className="admin-product-save"><label><input type="checkbox" {...form.register('isActive')} />نمایش محصول در فروشگاه</label><Button type="submit">{pending ? 'در حال ذخیره…' : 'ذخیرهٔ محصول'}</Button><Link href="/admin/products">انصراف</Link></div>
      </fieldset>
      {uploading && <p role="status">در حال آپلود تصویر…</p>}
      {errors.root && <p className="form-error" role="alert">{errors.root.message}</p>}
      {Object.keys(errors).length > 0 && !errors.root && <p className="field-error" role="alert">ورودی‌های فرم را بررسی کن.</p>}
    </form>
    {confirmation && <ConfirmationDialog title="حذف انتخاب‌های قبلی" description="برخی وزن‌ها، رست‌ها یا انواع قبلی حذف می‌شوند و از سبدهای ذخیره‌شده کنار می‌روند. سوابق سفارش تغییر نمی‌کند." confirmLabel="تأیید و ذخیره" pending={pending} error={null} onCancel={() => setConfirmation(null)} onConfirm={() => submit({ ...confirmation, confirmRemoved: true })} />}
  </>
}
