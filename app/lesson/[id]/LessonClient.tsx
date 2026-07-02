'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase/client'
import type { Lesson, UserProfile, Progress } from '@/types'

interface Props {
  lesson: Lesson & { chapter?: { number: number; title_fa: string; book?: { id: string; title_fa: string } } }
  profile: UserProfile | null
  userId: string
  initialWordStatus: Record<string, 'learning' | 'known'>
  initialProgress: Progress | null
}

function cleanWord(raw: string) {
  return raw.toLowerCase().replace(/[^a-zA-Z']/g, '')
}

export default function LessonClient({ lesson, profile, userId, initialWordStatus, initialProgress }: Props) {
  const router = useRouter()
  const sb = createClient()

  const [wordStatus, setWordStatus] = useState<Record<string, 'learning' | 'known'>>(initialWordStatus)
  const [finished,  setFinished]    = useState(initialProgress?.completed ?? false)
  const [saving,    setSaving]      = useState(false)

  // Toggle word as unknown/known
  const toggleWord = useCallback(async (raw: string) => {
    const word = cleanWord(raw)
    if (!word || word.length < 2) return

    const cur  = wordStatus[word]
    const next = cur === 'learning' ? undefined : 'learning'

    setWordStatus(prev => {
      const n = { ...prev }
      if (!next) delete n[word]
      else n[word] = next
      return n
    })

    if (next === 'learning') {
      await sb.from('user_word_status').upsert(
        { user_id: userId, word, status: 'learning', lesson_id: lesson.id },
        { onConflict: 'user_id,word' }
      )
    } else {
      await sb.from('user_word_status')
        .delete()
        .eq('user_id', userId)
        .eq('word', word)
    }
  }, [wordStatus, userId, lesson.id, sb])

  // Mark lesson as complete
  const markComplete = async () => {
    setSaving(true)
    await sb.from('progress').upsert(
      {
        user_id: userId,
        lesson_id: lesson.id,
        completed: true,
        completion_percentage: 100,
        last_position_ms: 0,
        play_count: 1,
        total_time_spent_ms: 0,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    )
    setSaving(false)
    setFinished(true)
  }

  const unknownWords = Object.entries(wordStatus).filter(([, s]) => s === 'learning').map(([w]) => w)

  // Tokenize text — split preserving spaces
  const tokens = lesson.text_en.split(/(\s+)/)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile} />

      {/* Breadcrumb */}
      <div className="border-b border-ocean-600 bg-ocean-900/50 px-6 py-2.5">
        <div className="max-w-3xl mx-auto flex items-center gap-2 text-xs text-slate-500">
          <a href="/home" className="hover:text-slate-300 transition-colors">خانه</a>
          <span>›</span>
          {lesson.chapter?.book && (
            <>
              <a href={`/book/${lesson.chapter.book.id}`} className="hover:text-slate-300 transition-colors">
                {lesson.chapter.book.title_fa}
              </a>
              <span>›</span>
            </>
          )}
          <span className="text-slate-400">{lesson.chapter?.title_fa}</span>
          <span>›</span>
          <span className="text-white">{lesson.title_fa}</span>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 pt-6 pb-32">

        {/* Lesson title */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">{lesson.title_fa}</h1>
          {lesson.title_en && <p className="text-sm text-slate-400 mt-1">{lesson.title_en}</p>}
          <div className="flex gap-3 mt-3 text-xs text-slate-500">
            {lesson.difficulty && <span>سختی: {lesson.difficulty}</span>}
            {lesson.estimated_duration_sec && <span>⏱ {Math.ceil(lesson.estimated_duration_sec / 60)} دقیقه</span>}
          </div>
        </div>

        {/* Hint */}
        <div className="flex items-center gap-2 mb-5 px-4 py-2.5 bg-ocean-800/60 rounded-xl border border-ocean-600 text-xs text-slate-400">
          <span>💡</span>
          <span>کلمه‌ای که بلد نیستی را کلیک کن تا هایلایت زرد بشه و برای یادگیری ذخیره بشه</span>
        </div>

        {/* Text */}
        <div className="bg-card border border-ocean-600 rounded-2xl p-6 leading-loose text-lg"
          dir="ltr" style={{ textAlign: 'left' }}>
          {tokens.map((token, i) => {
            if (/^\s+$/.test(token)) return <span key={i}>{token}</span>
            const word   = cleanWord(token)
            const status = word ? wordStatus[word] : undefined
            return (
              <span key={i}
                className={`word-token select-none ${status === 'learning' ? 'unknown' : ''}`}
                onClick={() => word && toggleWord(token)}>
                {token}
              </span>
            )
          })}
        </div>

        {/* Unknown words list */}
        {unknownWords.length > 0 && (
          <div className="mt-5 bg-card border border-ocean-600 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
              <span>🟡</span> کلمات در حال یادگیری ({unknownWords.length} کلمه)
            </p>
            <div className="flex flex-wrap gap-2">
              {unknownWords.map(w => (
                <span key={w}
                  className="px-3 py-1 rounded-full text-sm font-medium cursor-pointer"
                  style={{ background: 'rgba(245,158,11,0.18)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                  onClick={() => toggleWord(w)}>
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-ocean-600 bg-ocean-900/95 backdrop-blur px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          {finished ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-green-400 font-semibold flex items-center gap-2">
                ✅ درس با موفقیت تکمیل شد!
              </span>
              {lesson.chapter?.book && (
                <a href={`/book/${lesson.chapter.book.id}`}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-ocean-950 font-bold rounded-xl text-sm transition-colors">
                  درس بعدی ›
                </a>
              )}
            </div>
          ) : (
            <>
              <div className="text-xs text-slate-500">
                {unknownWords.length > 0
                  ? `${unknownWords.length} کلمه ناآشنا علامت زدی`
                  : 'کلمات ناآشنا رو علامت بزن'}
              </div>
              <button onClick={markComplete} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                {saving ? 'در حال ذخیره...' : '✅ همه لغات را بلد بودم'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
