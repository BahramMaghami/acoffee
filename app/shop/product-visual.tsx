export function ProductVisual({ name }: { name: string }) {
  return <div className="product-placeholder" role="img" aria-label={'جای تصویر ' + name}>
    <span aria-hidden="true">آ</span>
  </div>
}
