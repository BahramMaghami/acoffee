'use client'

import { Input } from '@/components/ui/input'
import type { ProductFormInput } from '@/lib/validators/admin-products'

type Discount = NonNullable<NonNullable<ProductFormInput['discounts']>[string]>
export function DiscountFields({ label, value, errors, onChange, onRemove }: {
  label: string; value: Discount; errors: Record<string, string>
  onChange: (value: Discount) => void; onRemove: () => void
}) {
  return <div className="admin-discount-fields">
    <label>قیمت قبل از تخفیف (تومان)
      <Input aria-label={`قیمت قبل از تخفیف ${label}`} inputMode="numeric" value={value.originalPrice} aria-invalid={Boolean(errors.originalPrice)} onChange={e => onChange({ ...value, originalPrice: e.target.value })} />
    </label><p className="field-error">{errors.originalPrice}</p>
    <label>روش تعیین قیمت
      <select aria-label={`روش تخفیف ${label}`} value={value.mode} onChange={e => onChange({ ...value, mode: e.target.value as Discount['mode'], value: '' })}>
        <option value="percent">درصد تخفیف</option><option value="final">قیمت نهایی</option>
      </select>
    </label>
    <label>{value.mode === 'percent' ? 'درصد تخفیف (۱ تا ۹۹)' : 'قیمت نهایی (تومان)'}
      <Input aria-label={`${value.mode === 'percent' ? 'درصد تخفیف' : 'قیمت نهایی تخفیف'} ${label}`} inputMode="numeric" value={value.value} aria-invalid={Boolean(errors.value)} onChange={e => onChange({ ...value, value: e.target.value })} />
    </label><p className="field-error">{errors.value}</p>
    <button type="button" className="quiet-link" onClick={onRemove}>حذف تخفیف</button>
  </div>
}
