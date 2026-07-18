import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LearningWordsClient from './LearningWordsClient'

export default async function LearningWordsPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await sb.from('users').select('*').eq('id', user.id).single()

  // لیست اولیه سمت سرور گرفته میشه (برای لود سریع بدون چشمک صفحه)؛
  // عملیات‌های بعدی (ترجمه، مرور) سمت کلاینت از طریق WordRepository انجام میشن.
  const { data } = await sb
    .from('user_word_status')
    .select('word_id, review_count, words(word, translation)')
    .eq('user_id', user.id)
    .eq('status', 'learning')
    .order('last_seen_at', { ascending: false })

  const initialWords = (data ?? []).map((r: any) => ({
    wordId: r.word_id,
    word: r.words?.word ?? '',
    translation: r.words?.translation ?? null,
    reviewCount: r.review_count ?? 0,
  }))

  return (
    <LearningWordsClient
      profile={profile}
      userId={user.id}
      initialWords={initialWords}
    />
  )
}
