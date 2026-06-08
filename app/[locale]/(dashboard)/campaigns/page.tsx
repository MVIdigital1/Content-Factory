'use client'
import Link from 'next/link'
import { useLocale } from 'next-intl'

export default function CampaignsPage() {
  const locale = useLocale()
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>📡</div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>Управление рекламными кабинетами</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 380 }}>
        Полный интерфейс рекламных кампаний находится в разделе Реклама
      </div>
      <Link href={`/${locale}/ads`} style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px',
        background: 'var(--primary)', color: 'var(--on-primary)', borderRadius: 8,
        fontSize: 12, fontWeight: 600, textDecoration: 'none', marginTop: 8,
      }}>
        Перейти в Рекламные кабинеты →
      </Link>
    </div>
  )
}
