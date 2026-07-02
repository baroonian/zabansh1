import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import BookClient from './BookClient'

export default async function BookPage({ params }: { params: { id: string } }) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/auth/login')

  const [bookRes, chaptersRes, profileRes, progressRes] = await Promise.all([
    sb.from('books').select('*, category:categories(*)').eq('id', params.id).single(),
    sb.from('chapters').select('*, lessons(id,number,title_fa,title_en,estimated_duration_sec,is_published)').eq('book_id', params.id).order('number'),
    sb.from('users').select('*').eq('id', user.id).single(),
    sb.from('progress').select('lesson_id,completed,completion_percentage').eq('user_id', user.id),
  ])

  if (!bookRes.data) notFound()

  const progressMap: Record<string, { completed: boolean; pct: number }> = {}
  ;(progressRes.data ?? []).forEach(p => {
    progressMap[p.lesson_id] = { completed: p.completed, pct: p.completion_percentage }
  })

  return (
    <BookClient
      book={bookRes.data}
      chapters={chaptersRes.data ?? []}
      profile={profileRes.data}
      progressMap={progressMap}
    />
  )
}
