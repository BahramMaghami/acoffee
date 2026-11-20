import Link from 'next/link'
import { ArrowUpLeft } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-top">
          <div>
            <Link href="/" className="wordmark">
              acoffee<span>.</span>
            </Link>
            <p>آ طعمی اصیل</p>
            <a
              className="footer-enamad"
              referrerPolicy="origin"
              target="_blank"
              rel="noopener"
              href="https://trustseal.enamad.ir/?id=8423362&Code=2en90T52eUArSdjA31AO3kwMlzgHhpbU"
            >
              {/* The trust seal must load directly from Enamad, without image proxying. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                referrerPolicy="origin"
                src="https://trustseal.enamad.ir/logo.aspx?id=8423362&Code=2en90T52eUArSdjA31AO3kwMlzgHhpbU"
                alt="نماد اعتماد الکترونیکی آ — مشاهدهٔ اعتبار"
                style={{ cursor: 'pointer' }}
                {...{ code: '2en90T52eUArSdjA31AO3kwMlzgHhpbU' }}
              />
            </a>
          </div>
          <nav aria-label="پیوندهای پایین صفحه">
            <Link href="/shop">
              قهوه‌های ما <ArrowUpLeft size={15} />
            </Link>
            <Link href="/about">
              داستان آ <ArrowUpLeft size={15} />
            </Link>
            <Link href="/guide">
              راهنمای دم‌آوری <ArrowUpLeft size={15} />
            </Link>
          </nav>
          <div className="footer-note">
            <span className="eyebrow">پشتیبانی</span>
            <p>
              برای پشتیبانی با شمارهٔ{' '}
              <a
                className="underline underline-offset-4"
                href="tel:09115905681"
              >
                <bdi dir="ltr">۰۹۱۱۵۹۰۵۶۸۱</bdi>
              </a>{' '}
              تماس بگیرید.
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>قهوه‌های آ</span>
          <span className="footer-credit">
            طراح سایت:{' '}
            <a
              href="https://bahrammaghami.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              بهرام مقامی
            </a>
          </span>
          <span dir="ltr">A COFFEE ROASTERY</span>
        </div>
      </div>
    </footer>
  )
}
