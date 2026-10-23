import { getProductEditor } from '@/lib/admin-products'
import { uploadConfigured } from '@/lib/cloudinary'
import { ProductForm } from '../product-form'
import '../products.css'

export const metadata = { title: 'ساخت محصول' }
export default async function NewProductPage() {
  const { categories } = await getProductEditor()
  return <div className="shell admin-page"><header className="admin-heading"><div><span className="eyebrow">مدیریت آ</span><h1>ساخت محصول</h1><p>قهوهٔ جدید را به فروشگاه اضافه کن.</p></div></header><ProductForm categories={categories} uploadEnabled={uploadConfigured()} /></div>
}
