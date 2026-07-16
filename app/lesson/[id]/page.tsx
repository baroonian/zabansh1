import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import LessonClient from './LessonClient'
<<<<<<< Updated upstream

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
=======
import type { WordStatus } from '@/types/words'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
>>>>>>> Stashed changes
  const { id } = await params

  const sb = await createClient()
<<<<<<< Updated upstream
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/auth/login')

  const [lessonRes, profileRes, wordStatusRes, progressRes] = await Promise.all([
    sb.from('lessons')
      .select('*, chapter:chapters(number, title_fa, book:books(id,title_fa))')
=======

  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) redirect('/auth/login')

  const [
    lessonRes,
    profileRes,
    wordStatusRes,
    progressRes,
    timestampsRes,
    subtitleRes,
  ] = await Promise.all([
    sb
      .from('lessons')
      .select(
        '*, chapter:chapters(number,title_fa,book:books(id,title_fa))'
      )
>>>>>>> Stashed changes
      .eq('id', id)
      .single(),

    sb.from('users').select('*').eq('id', user.id).single(),
<<<<<<< Updated upstream
    sb.from('user_word_status').select('word,status').eq('user_id', user.id),
    sb.from('progress')
=======

    sb
      .from('user_word_status')
      .select(`
        word_id,
        status,
        words!inner(
          id,
          word
        )
      `)
      .eq('user_id', user.id),

    sb
      .from('progress')
>>>>>>> Stashed changes
      .select('*')
      .eq('user_id', user.id)
      .eq('lesson_id', id)
      .maybeSingle(),
<<<<<<< Updated upstream
=======

    sb
      .from('word_timestamps')
      .select('word,word_index,start_ms,end_ms')
      .eq('lesson_id', id)
      .order('word_index'),

    sb
      .from('subtitle_cues')
      .select('cue_index,start_ms,end_ms,text')
      .eq('lesson_id', id)
      .order('cue_index'),
>>>>>>> Stashed changes
  ])

  if (!lessonRes.data) notFound()

<<<<<<< Updated upstream
  const wordMap: Record<string, 'learning' | 'known'> = {}
  ;(wordStatusRes.data ?? []).forEach(w => {
    wordMap[w.word] = w.status as 'learning' | 'known'
=======
  const wordMap: Record<string, WordStatus> = {}

  ;(wordStatusRes.data ?? []).forEach((item: any) => {
    wordMap[item.words.word] = item.status as WordStatus
>>>>>>> Stashed changes
  })

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