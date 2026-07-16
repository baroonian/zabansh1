import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MyBooksClient from './MyBooksClient'

export default async function MyBooksPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, booksRes, catsRes] = await Promise.all([
    sb.from('users').select('*').eq('id', user.id).single(),
    sb.from('books')
      .select('*, category:categories(id,name_fa,color)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
    // همان دسته‌بندی‌هایی که ادمین تعریف کرده
    sb.from('categories').select('*').eq('is_active', true).order('sort_order'),
  ])

  return (
    <MyBooksClient
      userId={user.id}
      profile={profileRes.data}
      initialBooks={booksRes.data ?? []}
      cats={catsRes.data ?? []}
    />
  )
}
