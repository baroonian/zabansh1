import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebar from './AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  //if (!user) redirect('/auth/login')

  const { data: profile } = await sb.from('users').select('is_admin').eq('id', user.id).single()
  //if (!profile?.is_admin) redirect('/home')

  return (
    <div className="flex min-h-screen" dir="rtl">
      <AdminSidebar />
      <div className="flex-1 bg-ocean-950 overflow-auto">
        {children}
      </div>
    </div>
  )
}
