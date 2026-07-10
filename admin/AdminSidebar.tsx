'use client'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/admin',             icon: '📊', label: 'داشبورد' },
  { href: '/admin/categories',  icon: '🗂️',  label: 'دسته‌بندی‌ها' },
  { href: '/admin/books',       icon: '📚', label: 'کتاب‌ها' },
  { href: '/admin/users',       icon: '👥', label: 'کاربران' },
  { href: '/admin/plans',       icon: '💎', label: 'پلن‌های اشتراک' },
]

export default function AdminSidebar() {
  const path = usePathname()
  const router = useRouter()

  const logout = async () => {
    await createClient().auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="w-56 shrink-0 bg-ocean-900 border-l border-ocean-600 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-ocean-600">
        <div className="text-amber-500 font-bold text-sm flex items-center gap-2">
          <span>🎧</span> پنل مدیریت
        </div>
        <div className="text-slate-500 text-xs mt-1">English Shadowing</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV.map(n => {
          const active = path === n.href || (n.href !== '/admin' && path.startsWith(n.href))
          return (
            <Link key={n.href} href={n.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-amber-500/15 text-amber-400 font-medium'
                  : 'text-slate-400 hover:bg-ocean-800 hover:text-slate-200'
              }`}>
              <span className="text-base">{n.icon}</span>
              {n.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-ocean-600 space-y-1">
        <Link href="/home"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors">
          ← بازگشت به سایت
        </Link>
        <button onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-500 hover:bg-red-900/20 transition-colors">
          خروج از حساب
        </button>
      </div>
    </aside>
  )
}
