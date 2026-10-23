import { notFound } from 'next/navigation'
import { getProductEditor, productFormValues } from '@/lib/admin-products'
import { uploadConfigured } from '@/lib/cloudinary'
import { ProductForm } from '../../product-form'
import '../../products.css'

export const metadata = { title: 'ویرایش محصول' }
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { categories, product } = await getProductEditor((await params).id)
  if (!product) notFound()
  return <div className="shell admin-page"><header className="admin-heading"><div><span className="eyebrow">مدیریت آ</span><h1>ویرایش محصول</h1><p>{product.name}</p></div></header><ProductForm key={product.updatedAt.toISOString()} categories={categories} initial={productFormValues(product)} imageUrl={product.imageUrl} uploadEnabled={uploadConfigured()} /></div>
}
