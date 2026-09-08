'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, LoaderCircle, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCart } from '@/app/cart/cart-store'
import { addressSchema, type AddressInput } from '@/lib/validators/checkout'
import { saveAddressAction } from '@/actions/address.actions'
import { saveCheckoutCartAction } from '@/actions/cart.actions'

const fields = [
  { name: 'province', label: 'استان', autoComplete: 'address-level1', placeholder: 'مثلاً تهران' },
  { name: 'city', label: 'شهر', autoComplete: 'address-level2', placeholder: 'نام شهر' },
  { name: 'postalCode', label: 'کد پستی', autoComplete: 'postal-code', placeholder: 'کد پستی ۱۰ رقمی' },
  { name: 'phone', label: 'شماره تماس', autoComplete: 'tel', placeholder: '۰۹۱۲۱۲۳۴۵۶۷' },
] as const

export function AddressForm({ initial, recipientName }: { initial?: AddressInput; recipientName: string }) {
  const router = useRouter()
  const { items, hydrated } = useCart()
  const [pending, startTransition] = useTransition()
  const { register, handleSubmit, setError, formState: { errors } } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema), defaultValues: initial ?? { province: '', city: '', addressLine: '', postalCode: '', phone: '' },
  })
  if (!hydrated) return <p role="status">در حال خواندن سبد خرید…</p>
  if (!items.length) return <div className="empty-state"><h2>سبد خریدت خالی است.</h2><Button asChild><Link href="/shop">انتخاب قهوه</Link></Button></div>

  return <div className="checkout-grid">
    <form className="checkout-panel address-form" noValidate aria-busy={pending} onSubmit={handleSubmit((values) => startTransition(async () => {
      try {
        const address = await saveAddressAction(values)
        if (!address.success) { setError('root', { message: address.message }); return }
        const cart = await saveCheckoutCartAction(items)
        if (!cart.success) { setError('root', { message: cart.message }); return }
        toast.success('آدرس ارسال ذخیره شد.')
        router.push('/checkout/place-order')
      } catch { setError('root', { message: 'ارتباط برقرار نشد. دوباره تلاش کن.' }) }
    }))}>
      <div className="address-fields">
        {fields.map((field) => <div className="form-field" key={field.name}>
          <label htmlFor={field.name}>{field.label}</label>
          <Input id={field.name} {...register(field.name)} autoComplete={field.autoComplete} placeholder={field.placeholder}
            inputMode={field.name === 'postalCode' ? 'numeric' : field.name === 'phone' ? 'tel' : 'text'}
            dir={field.name === 'postalCode' || field.name === 'phone' ? 'ltr' : 'rtl'}
            aria-invalid={Boolean(errors[field.name])} aria-describedby={`${field.name}-error`} />
          <p id={`${field.name}-error`} className="field-error">{errors[field.name]?.message}</p>
        </div>)}
        <div className="form-field address-full"><label htmlFor="addressLine">نشانی کامل</label>
          <textarea id="addressLine" {...register('addressLine')} autoComplete="street-address" rows={4} placeholder="خیابان، کوچه، پلاک و واحد"
            aria-invalid={Boolean(errors.addressLine)} aria-describedby="addressLine-error" />
          <p id="addressLine-error" className="field-error">{errors.addressLine?.message}</p>
        </div>
      </div>
      {errors.root && <p className="form-error" role="alert">{errors.root.message}</p>}
      <div className="checkout-form-actions"><Button type="submit" size="lg" disabled={pending}>
        {pending ? <><LoaderCircle className="animate-spin" />در حال ذخیره…</> : <>ذخیره و بررسی سفارش <ArrowLeft /></>}
      </Button><Link className="quiet-link" href="/cart">بازگشت به سبد</Link></div>
    </form>
    <aside className="checkout-note"><MapPin size={26} strokeWidth={1.4} /><h2>تا درِ خانهٔ تو</h2>
      <p>گیرندهٔ سفارش: <strong>{recipientName}</strong></p><p>کد پستی و شماره تماس را دقیق وارد کن تا برای هماهنگی ارسال به تو دسترسی داشته باشیم.</p>
      <p>آدرس در حسابت می‌ماند و هر بار می‌توانی آن را ویرایش کنی.</p>
    </aside>
  </div>
}
