'use client'
import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react'
import Navbar from '@/components/layout/Navbar'
import type { Lesson, UserProfile, Progress } from '@/types'
import { WordStatus } from '@/types/words'
import { useWordStatus } from '@/hooks/useWordStatus'

const {

    status: wordStatus,

    toggle,

    markKnown,

    unknownWords

} = useWordStatus(

    userId,

    lesson.id,

    initialWordStatus

)

export interface LessonToken{

  readonly index:number

  readonly raw:string

  readonly normalized:string

  readonly isWord:boolean

  wordId:number

  status:WordStatus

  translation:string|null

  bookmarked:boolean

  timestampStart:number|null

  timestampEnd:number|null

}

interface WordTimestamp { word:string; word_index:number; start_ms:number; end_ms:number }
interface SubtitleCue { cue_index:number; start_ms:number; end_ms:number; text:string }

interface Props {
  lesson: Lesson & { chapter?:{ number:number; title_fa:string; book?:{ id:string; title_fa:string } } }
  profile: UserProfile|null
  userId: string
  initialWordStatus: Record<string, WordStatus>
  initialProgress: Progress|null
  wordTimestamps: WordTimestamp[]
  subtitleCues: SubtitleCue[]
}

function cleanWord(raw:string) { return raw.toLowerCase().replace(/[^a-zA-Z']/g,'') }

// ── تقسیم متن به پاراگراف‌های واقعی (بر اساس خط خالی) ──────────
function splitParagraphs(text:string): string[] {
  return text.split(/\n\s*\n+/).map(p=>p.trim()).filter(Boolean)
}

// ── تقسیم یک پاراگراف به جمله‌ها (فاصله‌ی انتهای هر جمله حفظ میشه) ──
function splitSentencesInParagraph(paragraph:string): string[] {
  const flat = paragraph.replace(/\n+/g,' ')
  const parts = flat.match(/[^.!?]+[.!?]*\s*/g) ?? [flat]
  return parts.filter(s=>s.trim().length>0)
}

function getActiveIdxByWords(sentences:string[], timestamps:WordTimestamp[], currentMs:number): number {
  if (!timestamps.length) return -1
  let wIdx = 0
  for (let si=0; si<sentences.length; si++) {
    const wCount = sentences[si].split(/\s+/).filter(w=>cleanWord(w).length>0).length
    const firstTs = timestamps[wIdx]
    const lastTs  = timestamps[Math.min(wIdx+wCount-1, timestamps.length-1)]
    if (!firstTs) break
    const start = firstTs.start_ms
    const end   = (lastTs?.end_ms ?? start) + 400
    if (currentMs>=start && currentMs<=end) return si
    if (currentMs<start) return Math.max(0, si-1)
    wIdx += wCount
  }
  return sentences.length-1
}

function getActiveIdxByCues(cues:SubtitleCue[], currentMs:number): number {
  if (!cues.length) return -1
  for (let i=0; i<cues.length; i++) {
    const buffer = 150
    if (currentMs>=cues[i].start_ms && currentMs<=cues[i].end_ms+buffer) return i
    if (currentMs<cues[i].start_ms) return Math.max(0, i-1)
  }
  return cues.length-1
}

function wordOffsetForSentence(sentences:string[], si:number): number {
  let wIdx = 0
  for (let i=0;i<si;i++) wIdx += sentences[i].split(/\s+/).filter(w=>cleanWord(w).length>0).length
  return wIdx
}

function fmt(ms:number) {
  const s = Math.floor(ms/1000)
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
}

// ================================================================
// SentenceInline — به‌جای جعبه‌ی مجزا، یک <span> که داخل پاراگراف
// به‌صورت طبیعی جریان پیدا می‌کنه. جمله فعال فقط بولد میشه، بدون
// پس‌زمینه یا کادر. memo شده تا فقط جمله‌ای که active آن عوض شده
// دوباره render بشه.
// ================================================================
interface SentenceInlineProps {
  segment: string
  isActive: boolean
  wordStatus: Record<string,'learning'|'known'>
  clickable: boolean
  onPress: () => void
  onWordPress: (raw: string) => void
  setRef: (el: HTMLSpanElement | null) => void
}

const SentenceInline = memo(function SentenceInline({
  segment, isActive, wordStatus, clickable, onPress, onWordPress, setRef,
}: SentenceInlineProps) {
  const tokens = useMemo(() => segment.split(/(\s+)/), [segment])

  return (
    <span ref={setRef} onClick={onPress} style={{ cursor: clickable ? 'pointer' : 'default' }}>
      {tokens.map((token, ti) => {
        if (/^\s+$/.test(token)) return <span key={ti}>{token}</span>
        const word   = cleanWord(token)
        const status = word ? wordStatus[word] : undefined
        const isUnknown = status==='learning'
        return (
          <span
            key={ti}
            onClick={e => { e.stopPropagation(); word && onWordPress(token) }}
            style={{
              display:      'inline-block',
              padding:      '1px 2px',
              borderRadius: 4,
              cursor:       'pointer',
              fontWeight:   isActive ? 700 : isUnknown ? 500 : 400,
              background:   isUnknown ? 'rgba(245,158,11,0.22)' : 'transparent',
              color:        isUnknown ? '#f59e0b' : '#e2e8f0',
              textDecoration: isUnknown ? 'underline dotted rgba(245,158,11,0.5)' : 'none',
            }}>
            {token}
          </span>
        )
      })}
    </span>
  )
}, (prev, next) =>
  prev.segment === next.segment &&
  prev.isActive === next.isActive &&
  prev.clickable === next.clickable &&
  prev.wordStatus === next.wordStatus
)

export default function LessonClient({
  lesson, profile, userId, initialWordStatus, initialProgress, wordTimestamps, subtitleCues
}: Props) {
  
  const [finished,   setFinished]   = useState(initialProgress?.completed??false)
  const [saving,     setSaving]     = useState(false)

  const audioRef  = useRef<HTMLAudioElement>(null)
  const segRefs   = useRef<(HTMLSpanElement|null)[]>([])
  const [playing,   setPlaying]   = useState(false)
  const [currentMs, setCurrentMs] = useState(0)
  const [duration,  setDuration]  = useState(0)
  const [speed,     setSpeed]     = useState(1)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [audioErr,  setAudioErr]  = useState(false)
  const hasAudio = !!lesson.audio_url

  const srtMode = subtitleCues.length > 0
  const aiMode  = !srtMode && wordTimestamps.length > 0
  const hasSync = srtMode || aiMode

  // ── segments: آرایه‌ی مسطح جمله‌ها/cue ها — همون چیزی که برای
  // محاسبات sync (شمارش کلمه، پیدا کردن جمله فعال) استفاده میشه ──
  const paragraphTexts = useMemo(() => splitParagraphs(lesson.text_en), [lesson.text_en])
  const paragraphSentences = useMemo(
    () => paragraphTexts.map(p => splitSentencesInParagraph(p)),
    [paragraphTexts]
  )
  const segments: string[] = useMemo(
    () => srtMode ? subtitleCues.map(c => c.text) : paragraphSentences.flat(),
    [srtMode, subtitleCues, paragraphSentences]
  )

  // ── گروه‌بندی segments به پاراگراف برای نمایش ──────────────────
  // حالت SRT: پاراگراف واقعی نداریم، پس بر اساس فاصله زمانی بزرگ بین
  // دو cue (بیش از ۲.۵ ثانیه سکوت) یک پاراگراف جدید در نظر می‌گیریم
  const paragraphs = useMemo(() => {
    if (srtMode) {
      const groups: number[][] = []
      let current: number[] = []
      subtitleCues.forEach((cue, i) => {
        if (i > 0 && cue.start_ms - subtitleCues[i-1].end_ms > 2500) {
          groups.push(current); current = []
        }
        current.push(i)
      })
      if (current.length) groups.push(current)
      return groups
    }
    let idx = 0
    return paragraphSentences.map(sentArr => sentArr.map(() => idx++))
  }, [srtMode, subtitleCues, paragraphSentences])

  const wordStatusRef = useRef(wordStatus)
  useEffect(() => { wordStatusRef.current = wordStatus }, [wordStatus])

  const lastTickRef = useRef(0)

  useEffect(()=>{
    const audio = audioRef.current
    if (!audio) return

    const onTime = () => {
      const now = performance.now()
      if (now - lastTickRef.current < 150) return
      lastTickRef.current = now

      const ms = audio.currentTime*1000
      setCurrentMs(ms)
      if (hasSync) {
        const idx = srtMode
          ? getActiveIdxByCues(subtitleCues, ms)
          : getActiveIdxByWords(segments, wordTimestamps, ms)
        setActiveIdx(prev => {
          if (prev !== idx && idx >= 0) {
            requestAnimationFrame(()=>{
              segRefs.current[idx]?.scrollIntoView({ behavior:'smooth', block:'center' })
            })
          }
          return idx
        })
      }
    }
    const onMeta  = () => setDuration(audio.duration*1000)
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => { setPlaying(false); setActiveIdx(-1) }
    const onError = () => setAudioErr(true)

    audio.addEventListener('timeupdate',     onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('play',           onPlay)
    audio.addEventListener('pause',          onPause)
    audio.addEventListener('ended',          onEnded)
    audio.addEventListener('error',          onError)
    return () => {
      audio.removeEventListener('timeupdate',     onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('play',           onPlay)
      audio.removeEventListener('pause',          onPause)
      audio.removeEventListener('ended',          onEnded)
      audio.removeEventListener('error',          onError)
    }
  },[segments, wordTimestamps, subtitleCues, srtMode, hasSync])

  const togglePlay = useCallback(() => {
    const a = audioRef.current; if (!a) return
    if (a.paused) a.play().catch(()=>setAudioErr(true)); else a.pause()
  }, [])

  const seek = useCallback((e:React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current; if (!a) return
    const ms = Number(e.target.value)
    a.currentTime = ms/1000; setCurrentMs(ms)
  }, [])

  const changeSpeed = useCallback((s:number) => {
    setSpeed(s)
    if (audioRef.current) audioRef.current.playbackRate = s
  }, [])

  const jumpToIndex = useCallback((si:number) => {
    let ms = 0
    if (srtMode) {
      ms = subtitleCues[si]?.start_ms ?? 0
    } else {
      const wIdx = wordOffsetForSentence(segments, si)
      ms = wordTimestamps[wIdx]?.start_ms ?? 0
    }
    if (audioRef.current) { audioRef.current.currentTime = ms/1000; setCurrentMs(ms) }
    segRefs.current[si]?.scrollIntoView({ behavior:'smooth', block:'center' })
  }, [srtMode, subtitleCues, segments, wordTimestamps])

  const skip = useCallback((dir:1|-1) => {
    const next = Math.max(0, Math.min(segments.length-1, activeIdx+dir))
    jumpToIndex(next)
  }, [activeIdx, segments.length, jumpToIndex])

const toggleWord = useCallback(

    (raw:string)=>{

        toggle(raw)

    },

    [toggle]

)
  const markComplete = useCallback(async () => {
    setSaving(true)
    await sb.from('progress').upsert({
      user_id:userId, lesson_id:lesson.id, completed:true,
      completion_percentage:100, last_position_ms:Math.round(currentMs),
      play_count:1, total_time_spent_ms:Math.round(duration),
      completed_at:new Date().toISOString(),
    },{ onConflict:'user_id,lesson_id' })
    setSaving(false); setFinished(true)
  }, [sb, userId, lesson.id, currentMs, duration])

  const pct = duration>0 ? Math.round((currentMs/duration)*100) : 0

  const setSegRef = useCallback((idx: number) => (el: HTMLSpanElement | null) => {
    segRefs.current[idx] = el
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-ocean-950">
      <Navbar profile={profile} />

      {hasAudio && <audio ref={audioRef} src={lesson.audio_url!} preload="metadata" />}

      {/* Breadcrumb */}
      <div className="border-b border-ocean-700 bg-ocean-900/60 px-6 py-2.5">
        <div className="max-w-3xl mx-auto flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          <a href="/home" className="hover:text-slate-300 transition-colors">خانه</a>
          <span>›</span>
          {lesson.chapter?.book && (
            <><a href={`/book/${lesson.chapter.book.id}`} className="hover:text-slate-300 transition-colors">{lesson.chapter.book.title_fa}</a><span>›</span></>
          )}
          <span className="text-slate-400">{lesson.chapter?.title_fa}</span>
          <span>›</span>
          <span className="text-white">{lesson.title_fa}</span>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 pt-6 pb-52">

        {/* Header */}
        <div className="mb-5 flex gap-4 items-start">
          {lesson.cover_url && (
            <img src={lesson.cover_url} alt={lesson.title_fa} loading="lazy" className="w-20 h-20 rounded-xl object-cover shrink-0 border border-ocean-600" />
          )}
          <div>
            <h1 className="text-xl font-bold text-white">{lesson.title_fa}</h1>
            {lesson.title_en && <p className="text-sm text-slate-400 mt-1">{lesson.title_en}</p>}
            <div className="flex gap-3 mt-2 text-xs text-slate-500 flex-wrap">
              {lesson.difficulty && (
                <span className={`px-2 py-0.5 rounded-full ${lesson.difficulty==='beginner'?'bg-green-900/40 text-green-400':lesson.difficulty==='intermediate'?'bg-amber-900/40 text-amber-400':'bg-red-900/40 text-red-400'}`}>
                  {lesson.difficulty==='beginner'?'ساده':lesson.difficulty==='intermediate'?'متوسط':'پیشرفته'}
                </span>
              )}
              {lesson.estimated_duration_sec && <span>⏱ {Math.ceil(lesson.estimated_duration_sec/60)} دقیقه</span>}
              {hasAudio && <span className="text-amber-500/80">🎧 فایل صوتی دارد</span>}
              {srtMode && <span className="text-green-500/80">✓ زیرنویس SRT (دقیق)</span>}
              {aiMode  && <span className="text-blue-400/80">✓ همگام‌سازی هوش مصنوعی</span>}
            </div>
          </div>
        </div>

        {/* Hint */}
        <div className="flex items-start gap-2 mb-5 px-4 py-3 bg-ocean-800/60 rounded-xl border border-ocean-700 text-xs text-slate-400">
          <span className="mt-0.5">💡</span>
          <span>برای علامت‌گذاری کلمات ناآشنا روی آن‌ها کلیک کن. {hasSync && hasAudio ? 'هنگام پخش، جمله فعال بولد می‌شود.' : ''}</span>
        </div>

        {/* ── متن با پاراگراف‌های واقعی — هر پاراگراف یک <p> با جریان طبیعی ── */}
        <div className="bg-ocean-800 border border-ocean-600 rounded-2xl p-6 mb-5" dir="ltr">
          {paragraphs.map((segIndices, pi) => (
            <p key={pi} style={{ marginBottom: 18, lineHeight: 1.9, fontSize: 16 }}>
              {segIndices.map(si => (
                <SentenceInline
                  key={si}
                  segment={segments[si]}
                  isActive={hasSync && hasAudio && si===activeIdx}
                  wordStatus={wordStatus}
                  clickable={hasSync}
                  onPress={() => hasSync && jumpToIndex(si)}
                  onWordPress={toggleWord}
                  setRef={setSegRef(si)}
                />
              ))}
            </p>
          ))}
        </div>

        {/* Unknown words */}
        {unknownWords.length>0 && (
          <div className="bg-ocean-800 border border-ocean-600 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
              <span>🟡</span> کلمات در حال یادگیری <span className="text-amber-500 font-bold">({unknownWords.length})</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {unknownWords.map(w=>(
                <span key={w} onClick={()=>toggleWord(w)}
                  className="cursor-pointer px-3 py-1 rounded-full text-sm font-medium transition-all hover:scale-105"
                  style={{ background:'rgba(245,158,11,0.18)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.3)' }}>
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-ocean-950/98 backdrop-blur-md border-t border-ocean-700">

        {hasAudio && !audioErr && (
          <div className="max-w-3xl mx-auto px-4 pt-4 pb-2">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-slate-500 w-10 text-left tabular-nums shrink-0">{fmt(currentMs)}</span>
              <div className="relative flex-1 h-2 group cursor-pointer" onClick={e=>{
                const rect = e.currentTarget.getBoundingClientRect()
                const p    = (e.clientX-rect.left)/rect.width
                const ms   = p*(duration||100)
                if(audioRef.current){ audioRef.current.currentTime=ms/1000; setCurrentMs(ms) }
              }}>
                <div className="absolute inset-0 bg-ocean-700 rounded-full" />
                <div className="absolute top-0 left-0 h-full bg-amber-500 rounded-full transition-all pointer-events-none" style={{width:`${pct}%`}} />
                <input type="range" min={0} max={duration||100} value={currentMs} onChange={seek}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
              </div>
              <span className="text-xs text-slate-500 w-10 tabular-nums shrink-0">{fmt(duration)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-1 items-center">
                <span className="text-xs text-slate-600 ml-1">سرعت:</span>
                {[0.5,0.75,1,1.25,1.5].map(s=>(
                  <button key={s} onClick={()=>changeSpeed(s)}
                    className={`px-2 py-1 rounded-lg text-xs transition-all ${speed===s?'bg-amber-500 text-ocean-950 font-bold':'text-slate-500 hover:text-white hover:bg-ocean-700'}`}>
                    {s}x
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <button onClick={()=>skip(-1)} disabled={!hasSync||activeIdx<=0}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-ocean-700 disabled:opacity-25 transition-all" title="جمله قبلی">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
                </button>

                <button onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-ocean-950 transition-all shadow-lg hover:shadow-amber-500/30 hover:scale-105">
                  {playing
                    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>
                    : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft:2}}><path d="M8 5v14l11-7z"/></svg>}
                </button>

                <button onClick={()=>skip(1)} disabled={!hasSync||activeIdx>=segments.length-1}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-ocean-700 disabled:opacity-25 transition-all" title="جمله بعدی">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 3.9V8.1L8.5 12zM16 6h2v12h-2z"/></svg>
                </button>
              </div>

              <div className="text-xs text-slate-600 w-24 text-left">
                {activeIdx>=0 && hasSync && <span className="text-amber-500/70">جمله {activeIdx+1}/{segments.length}</span>}
              </div>
            </div>
          </div>
        )}

        {audioErr && (
          <div className="max-w-3xl mx-auto px-4 py-2 text-center text-xs text-red-400">⚠️ خطا در بارگذاری فایل صوتی</div>
        )}

        <div className="max-w-3xl mx-auto px-4 py-3 border-t border-ocean-800 flex items-center justify-between gap-3">
          {finished ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-green-400 font-semibold flex items-center gap-2">✅ درس با موفقیت تکمیل شد!</span>
              {lesson.chapter?.book && (
                <a href={`/book/${lesson.chapter.book.id}`}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-ocean-950 font-bold rounded-xl text-sm transition-colors">
                  برگشت به کتاب ›
                </a>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                {unknownWords.length>0 ? `🟡 ${unknownWords.length} کلمه ناآشنا علامت زدی` : 'کلمات ناآشنا رو با کلیک علامت بزن'}
              </p>
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
