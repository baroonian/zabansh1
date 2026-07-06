'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase/client'
import type { Lesson, UserProfile, Progress } from '@/types'

interface WordTimestamp { word: string; word_index: number; start_ms: number; end_ms: number }

interface Props {
  lesson: Lesson & { chapter?: { number: number; title_fa: string; book?: { id: string; title_fa: string } } }
  profile: UserProfile | null
  userId: string
  initialWordStatus: Record<string, 'learning' | 'known'>
  initialProgress: Progress | null
  wordTimestamps: WordTimestamp[]
}

function cleanWord(raw: string) {
  return raw.toLowerCase().replace(/[^a-zA-Z']/g, '')
}

// ── tokenize text into sentences ──────────────────────────────
function tokenizeSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]*/g)?.map(s => s.trim()).filter(Boolean) ?? [text]
}

// ── find which sentence contains a given time ─────────────────
function findActiveSentence(sentences: string[], timestamps: WordTimestamp[], currentMs: number): number {
  if (!timestamps.length) return -1
  const words = sentences.map((s, si) => ({
    si,
    words: s.toLowerCase().replace(/[^a-z\s']/g, '').split(/\s+/).filter(Boolean)
  }))
  let wordIdx = 0
  for (let si = 0; si < words.length; si++) {
    const count = words[si].words.length
    const start = timestamps[wordIdx]?.start_ms ?? Infinity
    const end   = timestamps[Math.min(wordIdx + count - 1, timestamps.length - 1)]?.end_ms ?? Infinity
    if (currentMs >= start && currentMs <= end + 200) return si
    wordIdx += count
  }
  // fallback: find nearest sentence
  let wordIdx2 = 0
  for (let si = 0; si < words.length; si++) {
    const count = words[si].words.length
    const start = timestamps[wordIdx2]?.start_ms ?? Infinity
    if (currentMs < start) return Math.max(0, si - 1)
    wordIdx2 += count
  }
  return words.length - 1
}

export default function LessonClient({ lesson, profile, userId, initialWordStatus, initialProgress, wordTimestamps }: Props) {
  const sb = createClient()

  // ── word status ──────────────────────────────────────────────
  const [wordStatus, setWordStatus] = useState<Record<string, 'learning' | 'known'>>(initialWordStatus)
  const [finished,   setFinished]   = useState(initialProgress?.completed ?? false)
  const [saving,     setSaving]     = useState(false)

  // ── audio player state ───────────────────────────────────────
  const audioRef        = useRef<HTMLAudioElement>(null)
  const sentenceRefs    = useRef<(HTMLDivElement | null)[]>([])
  const [playing,       setPlaying]       = useState(false)
  const [currentMs,     setCurrentMs]     = useState(0)
  const [duration,      setDuration]      = useState(0)
  const [speed,         setSpeed]         = useState(1)
  const [activeSentIdx, setActiveSentIdx] = useState(-1)
  const [audioError,    setAudioError]    = useState(false)
  const hasAudio = !!lesson.audio_url

  const sentences = tokenizeSentences(lesson.text_en)

  // ── audio event handlers ─────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTime = () => {
      const ms = audio.currentTime * 1000
      setCurrentMs(ms)
      if (wordTimestamps.length) {
        const idx = findActiveSentence(sentences, wordTimestamps, ms)
        setActiveSentIdx(idx)
        // auto-scroll
        if (idx >= 0 && sentenceRefs.current[idx]) {
          sentenceRefs.current[idx]!.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }
    const onDuration = () => setDuration(audio.duration * 1000)
    const onPlay     = () => setPlaying(true)
    const onPause    = () => setPlaying(false)
    const onEnded    = () => { setPlaying(false); setActiveSentIdx(-1) }
    const onError    = () => setAudioError(true)

    audio.addEventListener('timeupdate',  onTime)
    audio.addEventListener('loadedmetadata', onDuration)
    audio.addEventListener('play',        onPlay)
    audio.addEventListener('pause',       onPause)
    audio.addEventListener('ended',       onEnded)
    audio.addEventListener('error',       onError)
    return () => {
      audio.removeEventListener('timeupdate',  onTime)
      audio.removeEventListener('loadedmetadata', onDuration)
      audio.removeEventListener('play',        onPlay)
      audio.removeEventListener('pause',       onPause)
      audio.removeEventListener('ended',       onEnded)
      audio.removeEventListener('error',       onError)
    }
  }, [sentences, wordTimestamps])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) audio.pause()
    else audio.play().catch(() => setAudioError(true))
  }

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const ms = Number(e.target.value)
    audio.currentTime = ms / 1000
    setCurrentMs(ms)
  }

  const changeSpeed = (s: number) => {
    setSpeed(s)
    if (audioRef.current) audioRef.current.playbackRate = s
  }

  const skipSentence = (dir: 1 | -1) => {
    const idx = Math.max(0, Math.min(sentences.length - 1, activeSentIdx + dir))
    // find start_ms of first word in that sentence
    let wordIdx = 0
    for (let si = 0; si < idx; si++) {
      const count = sentences[si].toLowerCase().replace(/[^a-z\s']/g, '').split(/\s+/).filter(Boolean).length
      wordIdx += count
    }
    const ms = wordTimestamps[wordIdx]?.start_ms ?? 0
    if (audioRef.current) { audioRef.current.currentTime = ms / 1000; setCurrentMs(ms) }
  }

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  // ── word toggle ──────────────────────────────────────────────
  const toggleWord = useCallback(async (raw: string) => {
    const word = cleanWord(raw)
    if (!word || word.length < 2) return
    const cur  = wordStatus[word]
    const next = cur === 'learning' ? undefined : 'learning'
    setWordStatus(prev => {
      const n = { ...prev }
      if (!next) delete n[word]
      else n[word] = 'learning'
      return n
    })
    if (next === 'learning') {
      await sb.from('user_word_status').upsert(
        { user_id: userId, word, status: 'learning', lesson_id: lesson.id },
        { onConflict: 'user_id,word' }
      )
    } else {
      await sb.from('user_word_status').delete().eq('user_id', userId).eq('word', word)
    }
  }, [wordStatus, userId, lesson.id, sb])

  // ── mark complete ────────────────────────────────────────────
  const markComplete = async () => {
    setSaving(true)
    await sb.from('progress').upsert({
      user_id: userId, lesson_id: lesson.id, completed: true,
      completion_percentage: 100, last_position_ms: Math.round(currentMs),
      play_count: 1, total_time_spent_ms: Math.round(duration),
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' })
    setSaving(false)
    setFinished(true)
  }

  const unknownWords = Object.entries(wordStatus).filter(([, s]) => s === 'learning').map(([w]) => w)
  const pct = duration > 0 ? Math.round((currentMs / duration) * 100) : 0

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile} />

      {/* hidden audio element */}
      {hasAudio && (
        <audio ref={audioRef} src={lesson.audio_url!} preload="metadata" />
      )}

      {/* Breadcrumb */}
      <div className="border-b border-ocean-600 bg-ocean-900/50 px-6 py-2.5">
        <div className="max-w-3xl mx-auto flex items-center gap-2 text-xs text-slate-500">
          <a href="/home" className="hover:text-slate-300">خانه</a>
          <span>›</span>
          {lesson.chapter?.book && (
            <>
              <a href={`/book/${lesson.chapter.book.id}`} className="hover:text-slate-300">{lesson.chapter.book.title_fa}</a>
              <span>›</span>
            </>
          )}
          <span className="text-slate-400">{lesson.chapter?.title_fa}</span>
          <span>›</span>
          <span className="text-white">{lesson.title_fa}</span>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 pt-6 pb-44">

        {/* Title */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-white">{lesson.title_fa}</h1>
          {lesson.title_en && <p className="text-sm text-slate-400 mt-1">{lesson.title_en}</p>}
          <div className="flex gap-3 mt-2 text-xs text-slate-500">
            {lesson.difficulty && <span>سختی: {lesson.difficulty}</span>}
            {lesson.estimated_duration_sec && <span>⏱ {Math.ceil(lesson.estimated_duration_sec / 60)} دقیقه</span>}
          </div>
        </div>

        {/* Hint */}
        <div className="flex items-center gap-2 mb-5 px-4 py-2.5 bg-ocean-800/60 rounded-xl border border-ocean-600 text-xs text-slate-400">
          <span>💡</span>
          <span>برای علامت‌گذاری کلمات ناآشنا روی آن‌ها کلیک کن</span>
          {hasAudio && <span className="mr-auto text-amber-500/70">🎧 فایل صوتی موجود است</span>}
        </div>

        {/* Text — sentences */}
        <div className="bg-ocean-800 border border-ocean-600 rounded-2xl p-6" dir="ltr">
          {sentences.map((sentence, si) => {
            const isActive = si === activeSentIdx
            const tokens   = sentence.split(/(\s+)/)
            return (
              <div
                key={si}
                ref={el => { sentenceRefs.current[si] = el }}
                className="mb-4 last:mb-0 rounded-xl px-3 py-2 transition-all duration-300"
                style={{
                  background:  isActive ? 'rgba(245,158,11,0.12)' : 'transparent',
                  borderRight: isActive ? '3px solid #f59e0b' : '3px solid transparent',
                  opacity:     hasAudio && activeSentIdx >= 0 && !isActive ? 0.55 : 1,
                }}>
                {tokens.map((token, ti) => {
                  if (/^\s+$/.test(token)) return <span key={ti}>{token}</span>
                  const word   = cleanWord(token)
                  const status = word ? wordStatus[word] : undefined
                  return (
                    <span key={ti} onClick={() => word && toggleWord(token)}
                      className="word-token select-none"
                      style={{
                        background:  status === 'learning' ? 'rgba(245,158,11,0.22)' : undefined,
                        color:       status === 'learning' ? '#f59e0b' : undefined,
                        fontWeight:  isActive ? 500 : 400,
                        fontSize:    isActive ? '1.08em' : '1em',
                        cursor:      'pointer',
                        padding:     '1px 3px',
                        borderRadius: 4,
                        transition:  'all 0.2s',
                      }}>
                      {token}
                    </span>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Unknown words */}
        {unknownWords.length > 0 && (
          <div className="mt-5 bg-ocean-800 border border-ocean-600 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
              <span>🟡</span> کلمات در حال یادگیری ({unknownWords.length} کلمه)
            </p>
            <div className="flex flex-wrap gap-2">
              {unknownWords.map(w => (
                <span key={w} onClick={() => toggleWord(w)} className="cursor-pointer px-3 py-1 rounded-full text-sm font-medium"
                  style={{ background:'rgba(245,158,11,0.18)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.3)' }}>
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Fixed bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-ocean-600 bg-ocean-950/95 backdrop-blur">

        {/* Audio Player */}
        {hasAudio && !audioError && (
          <div className="max-w-3xl mx-auto px-4 pt-3 pb-1">
            {/* Progress bar */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-slate-500 w-10 text-left shrink-0">{fmt(currentMs)}</span>
              <div className="relative flex-1 h-1.5 group">
                <div className="absolute inset-0 bg-ocean-700 rounded-full" />
                <div className="absolute top-0 left-0 h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }} />
                <input type="range" min={0} max={duration || 100} value={currentMs} onChange={seek}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
              </div>
              <span className="text-xs text-slate-500 w-10 shrink-0">{fmt(duration)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-3 mb-2">
              {/* Speed */}
              <div className="flex gap-1">
                {[0.5, 0.75, 1, 1.25, 1.5].map(s => (
                  <button key={s} onClick={() => changeSpeed(s)}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${speed === s ? 'bg-amber-500 text-ocean-950 font-bold' : 'text-slate-400 hover:text-white'}`}>
                    {s}x
                  </button>
                ))}
              </div>

              {/* Main controls */}
              <div className="flex items-center gap-3">
                {/* Prev sentence */}
                <button onClick={() => skipSentence(-1)} disabled={!wordTimestamps.length}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
                  </svg>
                </button>

                {/* Play/Pause */}
                <button onClick={togglePlay}
                  className="w-11 h-11 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-ocean-950 transition-colors shadow-lg">
                  {playing ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19h4V5H6zm8-14v14h4V5z"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                {/* Next sentence */}
                <button onClick={() => skipSentence(1)} disabled={!wordTimestamps.length}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 3.9V8.1L8.5 12zM16 6h2v12h-2z"/>
                  </svg>
                </button>
              </div>

              {/* Unknown count */}
              <div className="text-xs text-slate-500 w-20 text-left">
                {unknownWords.length > 0 ? `🟡 ${unknownWords.length} کلمه` : ''}
              </div>
            </div>
          </div>
        )}

        {audioError && (
          <div className="max-w-3xl mx-auto px-4 py-2 text-xs text-red-400 text-center">
            ⚠️ خطا در بارگذاری فایل صوتی
          </div>
        )}

        {/* Complete button */}
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3 border-t border-ocean-800">
          {finished ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-green-400 font-semibold flex items-center gap-2">✅ درس با موفقیت تکمیل شد!</span>
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
                {unknownWords.length > 0 ? `${unknownWords.length} کلمه ناآشنا علامت زدی` : 'کلمات ناآشنا رو علامت بزن'}
              </div>
              <button onClick={markComplete} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 whitespace-nowrap">
                {saving ? 'ذخیره...' : '✅ همه لغات را بلد بودم'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
