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
            <p>
              برای روزهای معمولی،
              <br />
              قهوه‌های غیرمعمولی.
            </p>
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
            <span className="eyebrow">از دانه تا فنجان</span>
            <p>
              چیزهای خوب، ساده‌اند.
              <br />
              یک قهوه، یک فنجان، کمی وقت برای خودت.
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>آ؛ با حوصله، برای تو.</span>
          <span dir="ltr">GOOD COFFEE. EVERY DAY.</span>
        </div>
      </div>
    </footer>
  )
}
