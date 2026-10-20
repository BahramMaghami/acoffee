'use client'

import { useId, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import type { DailySales } from '@/lib/admin-metrics'
import { formatNumber, formatPrice } from '@/lib/storefront'

const compact = new Intl.NumberFormat('fa-IR', { notation: 'compact', maximumFractionDigits: 1 })

export function SalesChart({ days, hasSales }: { days: DailySales[]; hasSales: boolean }) {
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue')
  const gradient = useId().replaceAll(':', '')
  const revenue = metric === 'revenue'
  const grid = <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
  const xAxis = <XAxis dataKey="shortLabel" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} tickMargin={12} />
  const yAxis = <YAxis width={60} tickFormatter={(value: number) => compact.format(value)} allowDecimals={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 'auto']} />
  const tooltip = <Tooltip content={({ active, payload }) => {
    const point = payload?.[0]?.payload as DailySales | undefined
    if (!active || !point) return null
    return <div className="admin-chart-tooltip" dir="rtl"><span>{point.label}</span><strong>{revenue ? formatPrice(point.revenue) : `${formatNumber(point.orders)} سفارش`}</strong></div>
  }} />
  return <section className="admin-chart-panel" aria-labelledby="sales-chart-title">
    <div className="admin-chart-heading">
      <div><h2 id="sales-chart-title">روند فروش روزانه</h2><p>{revenue ? 'درآمد به تومان' : 'تعداد سفارش‌های پرداخت‌شده'}</p></div>
      <div className="admin-chart-switch" role="group" aria-label="نوع نمودار">
        <Button variant={revenue ? 'secondary' : 'ghost'} size="sm" aria-pressed={revenue} onClick={() => setMetric('revenue')}>درآمد</Button>
        <Button variant={!revenue ? 'secondary' : 'ghost'} size="sm" aria-pressed={!revenue} onClick={() => setMetric('orders')}>تعداد سفارش</Button>
      </div>
    </div>
    {!hasSales && <p className="admin-no-sales" role="status">در این بازه هنوز سفارش پرداخت‌شده‌ای ثبت نشده است.</p>}
    <div className="admin-chart" dir="ltr" aria-label={revenue ? 'نمودار درآمد روزانه' : 'نمودار تعداد سفارش روزانه'}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 800, height: 300 }}>
        {revenue ? <AreaChart data={days} accessibilityLayer margin={{ top: 20, right: 12, bottom: 4, left: 4 }}>
          <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--admin-chart-color)" stopOpacity={0.25} /><stop offset="100%" stopColor="var(--admin-chart-color)" stopOpacity={0.015} /></linearGradient></defs>
          {grid}{xAxis}{yAxis}{tooltip}
          <Area type="monotone" dataKey="revenue" name="درآمد" stroke="var(--admin-chart-color)" strokeWidth={2.5} fill={`url(#${gradient})`} isAnimationActive={false} />
        </AreaChart> : <BarChart data={days} accessibilityLayer margin={{ top: 20, right: 12, bottom: 4, left: 4 }}>
          {grid}{xAxis}{yAxis}{tooltip}
          <Bar dataKey="orders" name="تعداد سفارش" fill="var(--admin-chart-color)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>}
      </ResponsiveContainer>
    </div>
    <details className="admin-chart-data"><summary>مشاهدهٔ داده‌های نمودار</summary>
      <div className="admin-data-scroll"><table><caption className="sr-only">آمار فروش روزانه</caption><thead><tr><th scope="col">روز</th><th scope="col">درآمد (تومان)</th><th scope="col">سفارش</th><th scope="col">بسته</th></tr></thead>
        <tbody>{days.map((day) => <tr key={day.date}><th scope="row">{day.label}</th><td>{formatNumber(day.revenue)}</td><td>{formatNumber(day.orders)}</td><td>{formatNumber(day.units)}</td></tr>)}</tbody></table></div>
    </details>
  </section>
}
