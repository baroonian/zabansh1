import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminDashboard() {
  const sb = await createClient()

  const [usersR, booksR, lessonsR, catsR] = await Promise.all([
    sb.from('users').select('id,created_at,is_blocked', { count:'exact' }),
    sb.from('books').select('id', { count:'exact' }).eq('is_active', true),
    sb.from('lessons').select('id', { count:'exact' }).eq('is_published', true),
    sb.from('categories').select('id', { count:'exact' }).eq('is_active', true),
  ])

  // user_subscriptions ممکنه هنوز جدول نداشته باشه
  const subsR = await sb.from('user_subscriptions').select('id,status').then(r => r).catch(() => ({ data: [] }))
  const subsData = (subsR as any)?.data ?? []
  const activeSubs = subsData.filter((s: any) => s.status === 'active').length

  const today = new Date().toISOString().split('T')[0]
  const newToday = (usersR.data ?? []).filter((u: any) => u.created_at?.startsWith(today)).length

  const stats = [
    { label:'کل کاربران',    value: usersR.count ?? 0, sub: `+${newToday} امروز`,    color:'#6366f1', icon:'👥', href:'/admin/users' },
    { label:'کتاب فعال',     value: booksR.count ?? 0, sub: `${catsR.count} دسته`,  color:'#10b981', icon:'📚', href:'/admin/books' },
    { label:'درس منتشرشده',  value: lessonsR.count ?? 0, sub: '',                    color:'#f59e0b', icon:'🎵', href:'/admin/books' },
    { label:'اشتراک فعال',   value: activeSubs,         sub: `از ${subsData.length} کل`, color:'#3b82f6', icon:'💎', href:'/admin/plans' },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-1">داشبورد</h1>
      <p className="text-slate-400 text-sm mb-8">خلاصه وضعیت سیستم</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <Link key={s.label} href={s.href}
            className="bg-ocean-800 border border-ocean-600 rounded-2xl p-5 hover:border-ocean-500 transition-all hover:-translate-y-0.5 group"
            style={{ borderTop: `3px solid ${s.color}` }}>
            <div className="text-3xl mb-3">{s.icon}</div>
            <div className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">{s.value.toLocaleString()}</div>
            <div className="text-sm text-slate-300 mt-1">{s.label}</div>
            {s.sub && <div className="text-xs text-slate-500 mt-0.5">{s.sub}</div>}
          </Link>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">دسترسی سریع</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href:'/admin/categories', label:'مدیریت دسته‌بندی‌ها', icon:'🗂️', desc:'افزودن، ویرایش، حذف' },
          { href:'/admin/books',      label:'مدیریت کتاب‌ها',       icon:'📚', desc:'کتاب، فصل، درس' },
          { href:'/admin/users',      label:'مدیریت کاربران',        icon:'👥', desc:'دسترسی و اشتراک' },
          { href:'/admin/plans',      label:'پلن‌های اشتراک',        icon:'💎', desc:'رایگان، نقره‌ای، طلایی' },
        ].map(q => (
          <Link key={q.href} href={q.href}
            className="bg-ocean-800 border border-ocean-600 rounded-xl p-4 hover:border-amber-500/50 hover:bg-ocean-700 transition-all group">
            <div className="text-2xl mb-2">{q.icon}</div>
            <div className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors">{q.label}</div>
            <div className="text-xs text-slate-500 mt-1">{q.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
