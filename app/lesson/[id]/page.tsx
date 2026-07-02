import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import LessonClient from './LessonClient'

export default async function LessonPage({ params }: { params: { id: string } }) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/auth/login')

  const [lessonRes, profileRes, wordStatusRes, progressRes] = await Promise.all([
    sb.from('lessons')
      .select('*, chapter:chapters(number, title_fa, book:books(id,title_fa))')
      .eq('id', params.id)
      .single(),
    sb.from('users').select('*').eq('id', user.id).single(),
    sb.from('user_word_status').select('word,status').eq('user_id', user.id),
    sb.from('progress').select('*').eq('user_id', user.id).eq('lesson_id', params.id).single(),
  ])

  if (!lessonRes.data) notFound()

  const wordMap: Record<string, 'learning' | 'known'> = {}
  ;(wordStatusRes.data ?? []).forEach(w => { wordMap[w.word] = w.status as 'learning' | 'known' })

  return (
    <LessonClient
      lesson={lessonRes.data}
      profile={profileRes.data}
      userId={user.id}
      initialWordStatus={wordMap}
      initialProgress={progressRes.data ?? null}
    />
  )
}
