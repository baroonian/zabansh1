import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HomeClient from './HomeClient'

export default async function HomePage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, booksRes, catsRes, wordCountRes, knownRes] = await Promise.all([
    sb.from('users').select('*').eq('id', user.id).single(),
    sb.from('books').select('*, category:categories(id,name_fa,color)').eq('is_active', true).order('sort_order'),
    sb.from('categories').select('*').eq('is_active', true).order('sort_order'),
    sb.from('word_timestamps').select('id', { count: 'exact', head: true }),
    sb.from('user_word_status').select('id,status').eq('user_id', user.id),
  ])

  const totalWords    = wordCountRes.count ?? 0
  const knownWords    = (knownRes.data ?? []).filter(w => w.status === 'known').length
  const learningWords = (knownRes.data ?? []).filter(w => w.status === 'learning').length
  const pct = totalWords > 0 ? Math.round((knownWords / totalWords) * 100) : 0

  return (
    <HomeClient
      profile={profileRes.data}
      books={booksRes.data ?? []}
      categories={catsRes.data ?? []}
      stats={{ pct, known: knownWords, learning: learningWords, total: totalWords }}
    />
  )
}
