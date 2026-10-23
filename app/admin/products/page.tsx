import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getAdminProducts } from '@/lib/admin-products'
import { formatNumber, formatPrice } from '@/lib/storefront'
import { ProductVisual } from '@/app/shop/product-visual'
import { ProductControls } from './product-controls'
import './products.css'

export const metadata = { title: 'مدیریت محصولات' }
export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const data = await getAdminProducts((await searchParams).page)
  return <div className="shell admin-page">
    <header className="admin-heading"><div><span className="eyebrow">مدیریت آ</span><h1>محصولات</h1><p>{formatNumber(data.total)} محصول · هر صفحه ۲۰ مورد</p></div><Button asChild><Link href="/admin/products/new">ساخت محصول</Link></Button></header>
    <div className="admin-products-table"><table><caption className="sr-only">محصولات فروشگاه</caption><thead><tr>{['تصویر', 'نام', 'دسته', 'قیمت شروع', 'وضعیت', 'عملیات'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>
      {data.products.map(product => { const price = product.startingPrice; return <tr key={product.databaseId}>
        <td><div className="admin-product-thumbnail"><ProductVisual name={product.name} imageUrl={product.imageUrl} sizes="64px" /></div></td>
        <th scope="row">{product.name}</th><td>{product.categoryLabel}</td><td>{price === null ? 'اعلام نشده' : formatPrice(price)}</td><td>{product.isActive ? 'فعال' : 'غیرفعال'}</td>
        <td><div className="admin-product-controls"><Button asChild size="sm" variant="outline"><Link href={`/admin/products/${product.databaseId}/edit`}>ویرایش</Link></Button><ProductControls id={product.databaseId} name={product.name} updatedAt={product.updatedAt} /></div></td>
      </tr> })}
    </tbody></table>{!data.products.length && <p className="admin-products-empty">هنوز محصولی ثبت نشده است.</p>}</div>
    <nav className="admin-products-pagination" aria-label="صفحه‌بندی محصولات">
      {data.page > 1 ? <Button asChild variant="outline"><Link href={`/admin/products?page=${data.page - 1}`}>قبلی</Link></Button> : <Button disabled variant="outline">قبلی</Button>}
      <span>صفحهٔ {formatNumber(data.page)} از {formatNumber(data.pages)}</span>
      {data.page < data.pages ? <Button asChild variant="outline"><Link href={`/admin/products?page=${data.page + 1}`}>بعدی</Link></Button> : <Button disabled variant="outline">بعدی</Button>}
    </nav>
  </div>
}
