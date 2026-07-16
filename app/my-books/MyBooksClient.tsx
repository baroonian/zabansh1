'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/layout/Navbar'
import ImageUpload from '@/components/ui/ImageUpload'
import AudioUpload from '@/components/ui/AudioUpload'
import TranscribeButton from '@/components/ui/TranscribeButton'
import SrtUpload from '@/components/ui/SrtUpload'
import type { Book, Category, Chapter, Lesson, UserProfile } from '@/types'

// ── UI کمکی (مشابه پنل ادمین) ────────────────────────────────
const Modal = ({ title, children, onClose, onSave, saving, wide }: {
  title:string; children:React.ReactNode; wide?:boolean
  onClose:()=>void; onSave?:()=>void; saving?:boolean
}) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className={`bg-ocean-800 border border-ocean-600 rounded-2xl ${wide?'w-full max-w-3xl':'w-full max-w-lg'} max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-center justify-between p-5 border-b border-ocean-600">
        <h3 className="font-semibold text-white">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
      </div>
      <div className="p-5">{children}</div>
      {onSave && (
        <div className="flex gap-3 justify-end p-5 border-t border-ocean-600">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 border border-ocean-600 rounded-lg hover:border-slate-400">لغو</button>
          <button onClick={onSave} disabled={saving} className="px-5 py-2 text-sm bg-amber-500 text-ocean-950 font-bold rounded-lg hover:bg-amber-400 disabled:opacity-50">
            {saving ? 'ذخیره...' : 'ذخیره'}
          </button>
        </div>
      )}
    </div>
  </div>
)

const Inp = ({ label, value, onChange, placeholder, type='text', multiline }: {
  label:string; value:string; onChange:(v:string)=>void; placeholder?:string; type?:string; multiline?:boolean
}) => (
  <div className="mb-4">
    <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
    {multiline
      ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={4}
          className="w-full px-3 py-2.5 bg-ocean-900 border border-ocean-500 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none" />
      : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          className="w-full px-3 py-2.5 bg-ocean-900 border border-ocean-500 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500" />}
  </div>
)

const Sel = ({ label, value, onChange, opts }: { label:string; value:string; onChange:(v:string)=>void; opts:{v:string;l:string}[] }) => (
  <div className="mb-4">
    <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
    <select value={value} onChange={e=>onChange(e.target.value)}
      className="w-full px-3 py-2.5 bg-ocean-900 border border-ocean-500 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500">
      {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
)

// ── Lesson Modal (دقیقاً همان فرآیند ادمین: صدا، رونویسی AI، SRT، تصویر) ──
function LessonModal({ lesson, chapterId, onClose, onSaved }: { lesson?:Lesson; chapterId:string; onClose:()=>void; onSaved:()=>void }) {
  const sb = createClient()
  const [f, setF] = useState({
    title_fa: lesson?.title_fa??'', title_en: lesson?.title_en??'',
    number: String(lesson?.number??1), text_en: lesson?.text_en??'',
    audio_url: lesson?.audio_url??'', cover_url: lesson?.cover_url??'',
    difficulty: lesson?.difficulty??'beginner',
    estimated_duration_sec: String(lesson?.estimated_duration_sec??60),
    is_published: lesson?.is_published??false,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [savedLessonId, setSavedLessonId] = useState(lesson?.id)
  const [transcriptionStatus, setTranscriptionStatus] = useState(
    (lesson as any)?.transcription_status ?? 'none'
  )
  const [wordCount, setWordCount] = useState<number | null>(null)

  useEffect(() => {
    if (savedLessonId) {
      sb.from('word_timestamps').select('id', { count: 'exact', head: true }).eq('lesson_id', savedLessonId)
        .then(r => setWordCount(r.count ?? 0))
    }
  }, [savedLessonId, transcriptionStatus])

  const save = async () => {
    if (!f.title_fa.trim() || !f.text_en.trim()) { setErr('عنوان و متن الزامی هستند'); return }
    setSaving(true); setErr('')
    const payload = {
      chapter_id: chapterId, title_fa: f.title_fa, title_en: f.title_en||null,
      number: parseInt(f.number)||1, text_en: f.text_en,
      audio_url: f.audio_url||null, cover_url: f.cover_url||null,
      difficulty: f.difficulty as 'beginner'|'intermediate'|'advanced',
      estimated_duration_sec: parseInt(f.estimated_duration_sec)||null,
      is_published: f.is_published,
    }
    if (lesson) {
      const res = await sb.from('lessons').update(payload).eq('id', lesson.id)
      setSaving(false)
      if (res.error) { setErr(res.error.message); return }
      onSaved(); onClose()
    } else {
      const res = await sb.from('lessons').insert(payload).select('id').single()
      setSaving(false)
      if (res.error) { setErr(res.error.message); return }
      setSavedLessonId(res.data.id)
      onSaved()
      // مودال را نمی‌بندیم تا بشود فوراً رونویسی خودکار را زد
    }
  }

  return (
    <Modal title={lesson?'ویرایش درس':'درس جدید'} onClose={onClose} onSave={save} saving={saving} wide>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="عنوان فارسی *" value={f.title_fa} onChange={v=>setF(x=>({...x,title_fa:v}))} />
        <Inp label="عنوان انگلیسی" value={f.title_en} onChange={v=>setF(x=>({...x,title_en:v}))} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Inp label="شماره" value={f.number} onChange={v=>setF(x=>({...x,number:v}))} type="number" />
        <Sel label="سختی" value={f.difficulty} onChange={v=>setF(x=>({...x,difficulty:v as 'beginner'|'intermediate'|'advanced'}))}
          opts={[{v:'beginner',l:'ساده'},{v:'intermediate',l:'متوسط'},{v:'advanced',l:'پیشرفته'}]} />
        <Inp label="مدت (ثانیه)" value={f.estimated_duration_sec} onChange={v=>setF(x=>({...x,estimated_duration_sec:v}))} type="number" />
      </div>

      <AudioUpload value={f.audio_url} onChange={v=>setF(x=>({...x,audio_url:v}))} folder="lessons" />

      <TranscribeButton
        lessonId={savedLessonId}
        audioUrl={f.audio_url}
        initialStatus={transcriptionStatus}
        onDone={() => setTranscriptionStatus('done')}
      />
      {wordCount !== null && wordCount > 0 && (
        <p className="text-xs text-green-500/80 -mt-2 mb-4">✓ {wordCount} کلمه با صدا همگام‌سازی شده است (AI)</p>
      )}

      <SrtUpload lessonId={savedLessonId} />
      <p className="text-xs text-slate-600 -mt-3 mb-4">
        💡 اگر هم رونویسی AI و هم فایل SRT را آپلود کنی، فایل SRT اولویت دارد چون معمولاً دقیق‌تر است.
      </p>

      <ImageUpload value={f.cover_url} onChange={v=>setF(x=>({...x,cover_url:v}))} bucket="covers" folder="lessons" label="تصویر درس (اختیاری)" />

      <Inp label="متن درس *" value={f.text_en} onChange={v=>setF(x=>({...x,text_en:v}))} multiline placeholder="متن انگلیسی درس..." />

      <label className="flex items-center gap-2 cursor-pointer mt-2">
        <div onClick={()=>setF(x=>({...x,is_published:!x.is_published}))}
          className={`w-10 h-5 rounded-full relative transition-colors ${f.is_published?'bg-amber-500':'bg-ocean-600'}`}>
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${f.is_published?'left-5':'left-0.5'}`} />
        </div>
        <span className="text-sm text-slate-300">منتشر شده</span>
      </label>
      {err && <div className="mt-3 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 text-xs">{err}</div>}
    </Modal>
  )
}

// ── Chapter Modal ──────────────────────────────────────────────
function ChapterModal({ chapter, bookId, onClose, onSaved }: { chapter?:Chapter; bookId:string; onClose:()=>void; onSaved:()=>void }) {
  const sb = createClient()
  const [f, setF] = useState({
    title_fa: chapter?.title_fa??'', title_en: chapter?.title_en??'',
    number: String(chapter?.number??1), cover_url: chapter?.cover_url??'',
  })
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [lessonModal, setLessonModal] = useState<null|Lesson|'new'>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (chapter) sb.from('lessons').select('*').eq('chapter_id', chapter.id).order('number').then(r=>setLessons(r.data??[]))
  }, [chapter?.id])

  const save = async () => {
    if (!f.title_fa.trim()) { setErr('عنوان فارسی الزامی است'); return }
    setSaving(true); setErr('')
    const payload = { book_id:bookId, title_fa:f.title_fa, title_en:f.title_en||null, number:parseInt(f.number)||1, cover_url:f.cover_url||null }
    const res = chapter ? await sb.from('chapters').update(payload).eq('id',chapter.id) : await sb.from('chapters').insert(payload)
    setSaving(false)
    if (res.error) { setErr(res.error.message); return }
    onSaved(); onClose()
  }

  const delLesson = async (id:string) => {
    if (!confirm('درس حذف شود؟')) return
    await sb.from('lessons').delete().eq('id',id)
    setLessons(ls=>ls.filter(l=>l.id!==id))
  }

  const reloadLessons = () => {
    if (chapter) sb.from('lessons').select('*').eq('chapter_id',chapter.id).order('number').then(r=>setLessons(r.data??[]))
  }

  return (
    <>
      <Modal title={chapter?`فصل: ${chapter.title_fa}`:'فصل جدید'} onClose={onClose} onSave={save} saving={saving} wide>
        <div className="grid grid-cols-2 gap-3">
          <Inp label="عنوان فارسی *" value={f.title_fa} onChange={v=>setF(x=>({...x,title_fa:v}))} />
          <Inp label="عنوان انگلیسی" value={f.title_en} onChange={v=>setF(x=>({...x,title_en:v}))} />
        </div>
        <Inp label="شماره فصل" value={f.number} onChange={v=>setF(x=>({...x,number:v}))} type="number" />
        <ImageUpload value={f.cover_url} onChange={v=>setF(x=>({...x,cover_url:v}))} bucket="covers" folder="chapters" label="تصویر فصل (اختیاری)" />
        {err && <div className="mb-3 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 text-xs">{err}</div>}

        {chapter && (
          <div className="border-t border-ocean-600 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-300">درس‌ها ({lessons.length})</span>
              <button onClick={()=>setLessonModal('new')} className="text-xs px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30">+ درس جدید</button>
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {lessons.map(l=>(
                <div key={l.id} className="flex items-center gap-3 px-3 py-2 bg-ocean-900 rounded-lg">
                  {l.cover_url && <img src={l.cover_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-500">{l.number}.</span>
                      <span className="text-sm text-slate-200 truncate">{l.title_fa}</span>
                      {l.audio_url && <span className="text-xs">🎵</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${l.is_published?'bg-green-900/40 text-green-400':'bg-red-900/40 text-red-400'}`}>
                        {l.is_published?'منتشر':'پیش‌نویس'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={()=>setLessonModal(l)} className="text-xs text-slate-400 hover:text-white px-2">✏️</button>
                    <button onClick={()=>delLesson(l.id)} className="text-xs text-red-500 px-2">🗑</button>
                  </div>
                </div>
              ))}
              {lessons.length===0 && <p className="text-xs text-slate-500 text-center py-4">هنوز درسی ندارد</p>}
            </div>
          </div>
        )}
      </Modal>
      {lessonModal&&chapter&&(
        <LessonModal lesson={lessonModal==='new'?undefined:lessonModal as Lesson} chapterId={chapter.id} onClose={()=>setLessonModal(null)} onSaved={reloadLessons} />
      )}
    </>
  )
}

// ── Book Modal (به‌جای «فعال/غیرفعال» ادمین، اینجا «عمومی/خصوصی» است) ──
function BookModal({ book, cats, userId, onClose, onSaved }: { book?:Book; cats:Category[]; userId:string; onClose:()=>void; onSaved:()=>void }) {
  const sb = createClient()
  const [f, setF] = useState({
    title: book?.title??'', title_fa: book?.title_fa??'', author: book?.author??'',
    description: book?.description??'', cover_url: book?.cover_url??'',
    level: book?.level??'beginner', category_id: book?.category_id??(cats[0]?.id??''),
    visibility: book?.visibility??'private',
  })
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [chapModal, setChapModal] = useState<null|Chapter|'new'>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (book) sb.from('chapters').select('*').eq('book_id',book.id).order('number').then(r=>setChapters(r.data??[]))
  }, [book?.id])

  const save = async () => {
    if (!f.title_fa.trim()) { setErr('عنوان فارسی الزامی است'); return }
    setSaving(true); setErr('')
    const payload = {
      title: f.title||f.title_fa, title_fa: f.title_fa, author: f.author||null,
      description: f.description||null, cover_url: f.cover_url||null,
      level: f.level as Book['level'], category_id: f.category_id||null,
      visibility: f.visibility as 'public'|'private',
      is_active: true,
    }
    const res = book
      ? await sb.from('books').update(payload).eq('id',book.id)
      : await sb.from('books').insert({...payload, owner_id: userId, sort_order: 0, total_chapters: 0})
    setSaving(false)
    if (res.error) { setErr(res.error.message); return }
    onSaved(); onClose()
  }

  const delChapter = async (id:string) => {
    if (!confirm('فصل و تمام درس‌هایش حذف شود؟')) return
    const {error} = await sb.from('chapters').delete().eq('id',id)
    if (error) { alert(error.message); return }
    setChapters(cs=>cs.filter(c=>c.id!==id))
  }

  const reloadChapters = () => {
    if (book) sb.from('chapters').select('*').eq('book_id',book.id).order('number').then(r=>setChapters(r.data??[]))
  }

  return (
    <>
      <Modal title={book?`ویرایش: ${book.title_fa}`:'کتاب جدید'} onClose={onClose} onSave={save} saving={saving} wide>
        <div className="grid grid-cols-2 gap-3">
          <Inp label="عنوان فارسی *" value={f.title_fa} onChange={v=>setF(x=>({...x,title_fa:v}))} />
          <Inp label="عنوان انگلیسی"  value={f.title}    onChange={v=>setF(x=>({...x,title:v}))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Inp label="نویسنده" value={f.author} onChange={v=>setF(x=>({...x,author:v}))} />
          <Sel label="دسته‌بندی" value={f.category_id} onChange={v=>setF(x=>({...x,category_id:v}))}
            opts={[{v:'',l:'بدون دسته'},...cats.map(c=>({v:c.id,l:c.name_fa}))]} />
        </div>
        <Sel label="سطح" value={f.level} onChange={v=>setF(x=>({...x,level:v as Book['level']}))}
          opts={[{v:'beginner',l:'سطح ساده'},{v:'intermediate',l:'سطح متوسط'},{v:'advanced',l:'سطح پیشرفته'}]} />
        <Inp label="توضیحات" value={f.description} onChange={v=>setF(x=>({...x,description:v}))} multiline />

        <ImageUpload value={f.cover_url} onChange={v=>setF(x=>({...x,cover_url:v}))} bucket="covers" folder="books" label="تصویر جلد کتاب" />

        <label className="flex items-center gap-2 cursor-pointer mb-1">
          <div onClick={()=>setF(x=>({...x,visibility: x.visibility==='public'?'private':'public'}))}
            className={`w-10 h-5 rounded-full relative transition-colors ${f.visibility==='public'?'bg-amber-500':'bg-ocean-600'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${f.visibility==='public'?'left-5':'left-0.5'}`} />
          </div>
          <span className="text-sm text-slate-300">انتشار عمومی (سایر کاربران هم می‌بینند)</span>
        </label>
        <p className="text-xs text-slate-600 mb-3">
          {f.visibility==='public' ? '🌍 این کتاب برای همه‌ی کاربران قابل مشاهده خواهد بود.' : '🔒 این کتاب فقط برای خودت قابل مشاهده است.'}
        </p>
        {err && <div className="mb-3 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 text-xs">{err}</div>}

        {book && (
          <div className="border-t border-ocean-600 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-300">فصل‌ها ({chapters.length})</span>
              <button onClick={()=>setChapModal('new')} className="text-xs px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30">+ فصل جدید</button>
            </div>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {chapters.map(ch=>(
                <div key={ch.id} className="flex items-center gap-3 px-3 py-2 bg-ocean-900 rounded-lg">
                  {ch.cover_url && <img src={ch.cover_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />}
                  <span className="text-sm text-slate-200 flex-1"><span className="text-amber-500 ml-2">{ch.number}.</span>{ch.title_fa}</span>
                  <div className="flex gap-1.5">
                    <button onClick={()=>setChapModal(ch)} className="text-xs text-slate-400 hover:text-white px-2">✏️ ویرایش</button>
                    <button onClick={()=>delChapter(ch.id)} className="text-xs text-red-500 px-2">🗑</button>
                  </div>
                </div>
              ))}
              {chapters.length===0 && <p className="text-xs text-slate-500 text-center py-4">هنوز فصلی ندارد</p>}
            </div>
          </div>
        )}
      </Modal>
      {chapModal&&book&&(
        <ChapterModal chapter={chapModal==='new'?undefined:chapModal as Chapter} bookId={book.id} onClose={()=>setChapModal(null)} onSaved={reloadChapters} />
      )}
    </>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function MyBooksClient({ userId, profile, initialBooks, cats }: {
  userId: string; profile: UserProfile|null; initialBooks: Book[]; cats: Category[]
}) {
  const sb = createClient()
  const [books, setBooks] = useState<Book[]>(initialBooks)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<null|'new'|Book>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await sb.from('books')
      .select('*,category:categories(id,name_fa,color)')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
    setBooks(data??[]); setLoading(false)
  }

  const del = async (id:string) => {
    if (!confirm('کتاب و تمام فصل‌ها و درس‌هایش حذف شود؟')) return
    const {error} = await sb.from('books').delete().eq('id',id)
    if (error) { alert(error.message); return }
    load()
  }

  const LEVEL_BADGE: Record<string,string> = { beginner:'bg-green-900/40 text-green-400', intermediate:'bg-blue-900/40 text-blue-400', advanced:'bg-amber-900/40 text-amber-400' }
  const LEVEL_LABEL: Record<string,string> = { beginner:'ساده', intermediate:'متوسط', advanced:'پیشرفته' }

  return (
    <div className="min-h-screen bg-ocean-950" dir="rtl">
      <Navbar profile={profile} />
      <div className="max-w-5xl mx-auto p-6">
        <Link href="/home" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-5 transition-colors">← بازگشت به کتاب‌ها</Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">کتاب‌های من</h1>
            <p className="text-slate-400 text-sm mt-1">{books.length} کتاب — می‌توانی کتاب و درس بسازی و آن را عمومی یا خصوصی منتشر کنی</p>
          </div>
          <button onClick={()=>setModal('new')} className="px-4 py-2.5 bg-amber-500 text-ocean-950 font-bold rounded-xl hover:bg-amber-400 text-sm">+ کتاب جدید</button>
        </div>

        {loading ? <div className="text-center py-20 text-slate-400">در حال بارگذاری...</div> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {books.map(b => {
              const color = b.level==='beginner'?'#10b981':b.level==='intermediate'?'#3b82f6':'#f59e0b'
              return (
                <div key={b.id} className="bg-ocean-800 border border-ocean-600 rounded-xl overflow-hidden hover:border-ocean-500 transition-all">
                  <div className="h-32 relative" style={{background: b.cover_url?undefined:`${color}22`}}>
                    {b.cover_url
                      ? <img src={b.cover_url} alt={b.title_fa} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl">{b.level==='beginner'?'🌱':b.level==='intermediate'?'📘':'🔥'}</div>
                    }
                    <span className={`absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded-full ${LEVEL_BADGE[b.level]}`}>{LEVEL_LABEL[b.level]}</span>
                    <span className={`absolute top-2 left-2 text-xs px-1.5 py-0.5 rounded-full ${b.visibility==='public'?'bg-green-900/80 text-green-300':'bg-slate-800/90 text-slate-300'}`}>
                      {b.visibility==='public'?'🌍 عمومی':'🔒 خصوصی'}
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="font-medium text-white text-xs mb-0.5 line-clamp-2">{b.title_fa}</div>
                    {b.author && <div className="text-xs text-slate-500 mb-2 truncate">{b.author}</div>}
                    <div className="text-xs text-slate-600 mb-2">{(b.category as any)?.name_fa??'—'}</div>
                    <div className="flex gap-1.5">
                      <button onClick={()=>setModal(b)} className="flex-1 py-1 text-xs bg-ocean-700 hover:bg-ocean-600 text-slate-300 rounded-lg">✏️</button>
                      <button onClick={()=>del(b.id)} className="px-2 py-1 text-xs bg-red-900/20 text-red-400 rounded-lg">🗑</button>
                    </div>
                  </div>
                </div>
              )
            })}
            {books.length===0 && (
              <div className="col-span-full text-center py-16 text-slate-500">
                <div className="text-4xl mb-3">📚</div>
                <p>هنوز کتابی نساخته‌ای</p>
                <p className="text-xs mt-1">با دکمهٔ «+ کتاب جدید» شروع کن</p>
              </div>
            )}
          </div>
        )}
      </div>
      {modal && <BookModal book={modal==='new'?undefined:modal as Book} cats={cats} userId={userId} onClose={()=>setModal(null)} onSaved={load} />}
    </div>
  )
}
