'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/storefront'

function cardStep(element: HTMLDivElement) {
  const card = element.firstElementChild as HTMLElement | null
  return (card?.offsetWidth ?? element.clientWidth) + parseFloat(getComputedStyle(element).columnGap || '0')
}

export function CategorySlider({ id, title, href, count, children }: {
  id: string
  title: string
  href: string
  count: number
  children: ReactNode
}) {
  const track = useRef<HTMLDivElement>(null)
  const interacting = useRef(false)
  const [navigation, setNavigation] = useState({ previous: false, next: false })

  useEffect(() => {
    const element = track.current
    if (!element) return
    const update = () => {
      // RTL scrollLeft starts at zero and becomes negative toward later cards.
      const position = Math.abs(element.scrollLeft)
      setNavigation({ previous: position > 2, next: position < element.scrollWidth - element.clientWidth - 2 })
    }
    const frame = requestAnimationFrame(update)
    const observer = new ResizeObserver(update)
    observer.observe(element)
    element.addEventListener('scroll', update, { passive: true })
    const timer = window.setInterval(() => {
      if (document.hidden || interacting.current || element.closest('section')?.contains(document.activeElement) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const maximum = element.scrollWidth - element.clientWidth
      if (maximum <= 2) return
      const atEnd = Math.abs(element.scrollLeft) >= maximum - 2
      element.scrollTo({ left: atEnd ? 0 : element.scrollLeft - cardStep(element), behavior: 'smooth' })
    }, 3000)
    return () => {
      window.clearInterval(timer)
      cancelAnimationFrame(frame)
      observer.disconnect()
      element.removeEventListener('scroll', update)
    }
  }, [])

  const move = (direction: 'previous' | 'next') => {
    const element = track.current
    if (!element) return
    const distance = cardStep(element)
    element.scrollBy({ left: direction === 'next' ? -distance : distance, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  return (
    <section
      className="category-slider"
      aria-labelledby={`${id}-title`}
      aria-roledescription="اسلایدر"
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') interacting.current = true }}
      onPointerLeave={() => { interacting.current = false }}
      onPointerDown={() => { interacting.current = true }}
      onPointerUp={(event) => { interacting.current = event.pointerType === 'mouse' }}
      onPointerCancel={() => { interacting.current = false }}
    >
      <div className="category-slider-heading">
        <div><h2 id={`${id}-title`}>{title}</h2><p>{formatNumber(count)} قهوه</p></div>
        <Button asChild variant="outline" size="sm">
          <Link href={href}>مشاهدهٔ همه <ArrowLeft /></Link>
        </Button>
      </div>
      <div
        ref={track}
        id={`${id}-track`}
        className="category-slider-track"
        dir="rtl"
        tabIndex={0}
        role="group"
        aria-label={`محصولات ${title}`}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            move(event.key === 'ArrowLeft' ? 'next' : 'previous')
          }
        }}
      >
        {children}
      </div>
      <div className="category-slider-navigation" role="group" aria-label={`حرکت در ${title}`}>
        <Button type="button" variant="outline" size="icon" disabled={!navigation.previous} onClick={() => move('previous')} aria-label="محصولات قبلی" aria-controls={`${id}-track`}><ChevronRight /></Button>
        <Button type="button" variant="outline" size="icon" disabled={!navigation.next} onClick={() => move('next')} aria-label="محصولات بعدی" aria-controls={`${id}-track`}><ChevronLeft /></Button>
      </div>
    </section>
  )
}
