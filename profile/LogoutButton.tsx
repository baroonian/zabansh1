'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()
  const logout = async () => {
    await createClient().auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }
  return (
    <button onClick={logout}
      className="px-3 py-1.5 text-xs text-red-400 border border-red-900/40 rounded-lg hover:bg-red-900/20 transition-colors">
      خروج
    </button>
  )
}
