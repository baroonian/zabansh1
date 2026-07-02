'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types'

export default function Navbar({ profile }: { profile?: UserProfile | null }) {
  const router = useRouter()

  const logout = async () => {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const initial = (profile?.full_name || profile?.email || 'U')[0].toUpperCase()

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 h-14 bg-ocean-900/90 backdrop-blur border-b border-ocean-600">
      <div className="flex items-center gap-2.5 font-bold text-amber-500">
        <span className="text-xl">🎧</span>
        <span className="text-sm">English Shadowing</span>
      </div>

      <div className="flex items-center gap-3">
        {profile?.is_admin && (
          <a href="/admin" className="text-xs text-slate-400 hover:text-amber-400 transition-colors">
            پنل ادمین
          </a>
        )}
        <a href="/profile">
        <span className="text-xs text-slate-400 hidden sm:block">
          {profile?.full_name || profile?.email}
        </span>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-ocean-950 font-bold text-sm">
            {initial}
          </div>
        </a>        
          <button onClick={logout}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors hidden sm:block">
            خروج
          </button>
        </div>
      </div>
    </nav>
  )
}
