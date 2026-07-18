import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import LessonClient from './LessonClient'
import type { WordStatus } from '@/types/word'
import type { LessonToken, WordStateMap } from '@/types/lessonToken'
import { tokenizeLesson } from '@/lib/tokenizer'
import { extractWords } from '@/lib/extractWords'

// ── تقسیم متن به پاراگراف واقعی (بر اساس خط خالی) — قبل از tokenize ──
function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean)
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sb = await createClient()

  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/auth/login')

  const [lessonRes, profileRes, progressRes, timestampsRes, subtitleRes] = await Promise.all([
    sb.from('lessons')
      .select('*, chapter:chapters(number,title_fa,book:books(id,title_fa))')
      .eq('id', id)
      .single(),
    sb.from('users').select('*').eq('id', user.id).single(),
    sb.from('progress').select('*').eq('user_id', user.id).eq('lesson_id', id).maybeSingle(),
    sb.from('word_timestamps').select('word,word_index,start_ms,end_ms').eq('lesson_id', id).order('word_index'),
    sb.from('subtitle_cues').select('cue_index,start_ms,end_ms,text').eq('lesson_id', id).order('cue_index'),
  ])

  if (!lessonRes.data) notFound()
  const lesson = lessonRes.data

  // ── Vocabulary Engine: tokenize هر پاراگراف جدا (ساختار پاراگراف حفظ میشه) ──
  const paragraphTexts = splitParagraphs(lesson.text_en)
  const paragraphTokens: LessonToken[][] = paragraphTexts.map(p => tokenizeLesson(p))

  // ── دسته‌بندی و resolve همه‌ی کلمات یکتای این درس در یک درخواست ──
  const uniqueWords = extractWords(lesson.text_en)
  let initialWordState: WordStateMap = {}

  if (uniqueWords.length) {
    const CHUNK = 500
    const idByWord = new Map<string, number>()

    for (let i = 0; i < uniqueWords.length; i += CHUNK) {
      const chunk = uniqueWords.slice(i, i + CHUNK)

      // ۱. اول کلماتی که از قبل وجود دارن رو بگیر (فقط SELECT — همیشه مجازه)
      const { data: existingRows } = await sb
        .from('words')
        .select('id,word')
        .in('word', chunk)
      ;(existingRows ?? []).forEach(r => idByWord.set(r.word, r.id))

      // ۲. فقط کلماتی که واقعاً جدیدن رو INSERT کن (نه upsert — چون
      // upsert روی تداخل نیاز به UPDATE policy داره که نداریم و کل
      // batch رو fail می‌کنه)
      const newWords = chunk.filter(w => !idByWord.has(w))
      if (newWords.length) {
        const { data: insertedRows, error } = await sb
          .from('words')
          .insert(newWords.map(w => ({ word: w })))
          .select('id,word')
        if (!error) {
          (insertedRows ?? []).forEach(r => idByWord.set(r.word, r.id))
        } else {
          // اگه هم‌زمان کاربر دیگه‌ای دقیقاً همون کلمه رو ساخته باشه (race condition)
          // ممکنه insert به خاطر unique constraint fail بشه — دوباره select کن
          const { data: retryRows } = await sb.from('words').select('id,word').in('word', newWords)
          ;(retryRows ?? []).forEach(r => idByWord.set(r.word, r.id))
        }
      }
    }

    // پر کردن wordId هر توکن با استفاده از دیکشنری resolve‌شده
    paragraphTokens.forEach(sentTokens => {
      sentTokens.forEach(t => {
        if (t.isWord) t.wordId = idByWord.get(t.normalized) ?? null
      })
    })

    // فقط وضعیت کلمات همین درس رو بگیر (نه کل کلمات کاربر در کل اپ)
    const wordIds = [...idByWord.values()]
    if (wordIds.length) {
      const { data: statusRows } = await sb
        .from('user_word_status')
        .select('word_id,status')
        .eq('user_id', user.id)
        .in('word_id', wordIds)

      ;(statusRows ?? []).forEach(r => {
        initialWordState[r.word_id] = r.status as WordStatus
      })
    }
  }

  return (
    <LessonClient
      lesson={lesson}
      profile={profileRes.data}
      userId={user.id}
      paragraphTokens={paragraphTokens}
      initialWordState={initialWordState}
      initialProgress={progressRes.data ?? null}
      wordTimestamps={timestampsRes.data ?? []}
      subtitleCues={subtitleRes.data ?? []}
    />
  )
}
