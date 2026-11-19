'use client'

export function BrandIntro() {
  function skip() {
    document.documentElement.dataset.intro = 'revealing'
    window.setTimeout(() => {
      delete document.documentElement.dataset.intro
    }, 700)
  }

  return (
    <div className="brand-intro" aria-label="معرفی آ">
      <div className="intro-signature" aria-hidden="true">
        <svg className="intro-monogram" viewBox="0 0 200 220" fill="none">
          <path
            className="intro-letter"
            pathLength="1"
            d="M28 185 L47 179 L100 30 L111 30 L164 179 L181 185 L181 190 L121 190 L121 185 L140 179 L125 136 L72 136 L57 179 L77 185 L77 190 L28 190 Z M77 122 L120 122 L99 60 Z"
            fillRule="evenodd"
          />
        </svg>
        <span className="intro-caption" dir="ltr">
          coffee roasters
        </span>
        <span className="intro-motto">آ طعمی اصیل</span>
      </div>
      <button type="button" className="intro-skip" onClick={skip}>
        ورود به سایت <span aria-hidden="true">↗</span>
      </button>
    </div>
  )
}
