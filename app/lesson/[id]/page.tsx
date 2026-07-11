import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import LessonClient from './LessonClient'
import type { WordStatus } from '@/types/word'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const sb = await createClient()

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
      .eq('id', id)
      .single(),

    sb.from('users').select('*').eq('id', user.id).single(),

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
      .select('*')
      .eq('user_id', user.id)
      .eq('lesson_id', id)
      .maybeSingle(),

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
  ])

  if (!lessonRes.data) notFound()

  const wordMap: Record<string, WordStatus> = {}

  ;(wordStatusRes.data ?? []).forEach((item: any) => {
    wordMap[item.words.word] = item.status as WordStatus
  })

  return (
    <LessonClient
      lesson={lessonRes.data}
      profile={profileRes.data}
      userId={user.id}
      initialWordStatus={wordMap}
      initialProgress={progressRes.data ?? null}
      wordTimestamps={timestampsRes.data ?? []}
      subtitleCues={subtitleRes.data ?? []}
    />
  )
}