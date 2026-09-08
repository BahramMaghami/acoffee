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
