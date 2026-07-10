'use client'
import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import type { Book, Chapter, Lesson, UserProfile } from '@/types'

const LEVEL_COLORS: Record<string,string> = {
  beginner:'#10b981', intermediate:'#3b82f6', advanced:'#f59e0b',
}
const LEVEL_LABEL: Record<string,string> = {
  beginner:'سطح ساده', intermediate:'سطح متوسط', advanced:'سطح پیشرفته',
}

interface Props {
  book: Book
  chapters: (Chapter & { lessons?:Lesson[] })[]
  profile: UserProfile|null
  progressMap: Record<string,{ completed:boolean; pct:number }>
}

export default function BookClient({ book, chapters, profile, progressMap }: Props) {
  const [open, setOpen] = useState<string|null>(chapters[0]?.id??null)
  const color = LEVEL_COLORS[book.level] ?? '#6366f1'

  const totalLessons     = chapters.reduce((s,c)=>s+(c.lessons?.length??0),0)
  const completedLessons = chapters.reduce((s,c)=>s+(c.lessons??[]).filter(l=>progressMap[l.id]?.completed).length,0)
  const overallPct = totalLessons>0 ? Math.round((completedLessons/totalLessons)*100) : 0

  return (
    <div className="min-h-screen bg-ocean-950">
      <Navbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 pb-16 pt-6">

        <Link href="/home" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-5 transition-colors">← بازگشت به کتاب‌ها</Link>

        {/* Book header */}
        <div className="bg-ocean-800 border border-ocean-600 rounded-2xl overflow-hidden mb-6">
          {/* Cover */}
          <div className="h-44 relative overflow-hidden" style={{background:book.cover_url?undefined:`linear-gradient(135deg,${color}18,${color}35)`}}>
            {book.cover_url
              ? <img src={book.cover_url} alt={book.title_fa} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center">
                  {book.category && (book.category as any).image_url
                    ? <img src={(book.category as any).image_url} alt="" className="w-full h-full object-cover opacity-40" />
                    : <span className="text-7xl opacity-80">{book.level==='beginner'?'🌱':book.level==='intermediate'?'📘':'🔥'}</span>
                  }
                </div>
            }
            <div className="absolute inset-0 bg-gradient-to-t from-ocean-900 via-ocean-900/40 to-transparent" />
            <div className="absolute bottom-4 right-4 left-4">
              <h1 className="text-xl font-bold text-white drop-shadow">{book.title_fa}</h1>
              <p className="text-sm text-slate-300 mt-0.5 drop-shadow">{book.title}</p>
            </div>
            <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{background:`${color}25`,color,border:`1px solid ${color}40`}}>
              {LEVEL_LABEL[book.level]}
            </span>
          </div>

          <div className="p-5">
            {book.author && <p className="text-xs text-slate-500 mb-2">{book.author}</p>}
            {book.description && <p className="text-sm text-slate-400 mb-4 leading-relaxed">{book.description}</p>}

            {/* Progress */}
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>{completedLessons} از {totalLessons} درس تکمیل</span>
                <span style={{color}}>{overallPct}%</span>
              </div>
              <div className="h-1.5 bg-ocean-700 rounded-full overflow-hidden">
                <div style={{width:`${overallPct}%`,background:color}} className="h-full rounded-full transition-all duration-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Chapters */}
        {chapters.length===0 ? (
          <div className="text-center py-16 text-slate-500">
            <div className="text-4xl mb-3">📂</div>
            <p>هنوز فصلی اضافه نشده</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chapters.map(ch=>{
              const isOpen    = open===ch.id
              const lessons   = ch.lessons??[]
              const done      = lessons.filter(l=>progressMap[l.id]?.completed).length
              const chPct     = lessons.length>0 ? Math.round((done/lessons.length)*100) : 0
              return (
                <div key={ch.id} className="border border-ocean-600 rounded-xl overflow-hidden">
                  <button onClick={()=>setOpen(isOpen?null:ch.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 bg-ocean-800 hover:bg-ocean-700 transition-colors text-right">
                    {/* Chapter cover/number */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                      style={{background:`${color}20`,border:`1px solid ${color}30`}}>
                      {ch.cover_url
                        ? <img src={ch.cover_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-sm font-bold" style={{color}}>{ch.number}</span>
                      }
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-sm font-medium text-white">{ch.title_fa}</p>
                      {ch.title_en && <p className="text-xs text-slate-500 mt-0.5">{ch.title_en}</p>}
                      {/* Chapter progress */}
                      {lessons.length>0 && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="h-1 flex-1 bg-ocean-700 rounded-full overflow-hidden">
                            <div style={{width:`${chPct}%`,background:color}} className="h-full rounded-full" />
                          </div>
                          <span className="text-xs text-slate-600">{done}/{lessons.length}</span>
                        </div>
                      )}
                    </div>
                    <span className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen?'rotate-180':''}`}>▾</span>
                  </button>

                  {isOpen && (
                    <div className="divide-y divide-ocean-700 bg-ocean-900/50">
                      {lessons.length===0 ? (
                        <p className="px-4 py-3 text-xs text-slate-500">هنوز درسی اضافه نشده</p>
                      ) : lessons.sort((a,b)=>a.number-b.number).map(l=>{
                        const prog   = progressMap[l.id]
                        const isDone = prog?.completed
                        return (
                          <Link key={l.id} href={`/lesson/${l.id}`}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-ocean-800/60 transition-colors group">
                            {/* Lesson cover or status */}
                            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                              style={{
                                background: isDone?'rgba(16,185,129,0.15)':'rgba(17,34,64,0.8)',
                                border:`1px solid ${isDone?'rgba(16,185,129,0.4)':'rgba(29,53,87,0.8)'}`
                              }}>
                              {l.cover_url
                                ? <img src={l.cover_url} alt="" className="w-full h-full object-cover" />
                                : <span className={`text-xs font-bold ${isDone?'text-green-400':'text-slate-500 group-hover:text-slate-300'}`}>
                                    {isDone ? '✓' : l.number}
                                  </span>
                              }
                            </div>

                            <div className="flex-1 min-w-0 text-right">
                              <p className={`text-sm truncate ${isDone?'text-slate-400':'text-white'}`}>{l.title_fa}</p>
                              {l.title_en && <p className="text-xs text-slate-600 truncate mt-0.5">{l.title_en}</p>}
                              {l.audio_url && <span className="text-xs text-amber-500/70">🎵 دارای صدا</span>}
                              {prog && !isDone && (
                                <div className="mt-1 h-0.5 w-16 bg-ocean-700 rounded-full overflow-hidden">
                                  <div style={{width:`${prog.pct}%`,background:color}} className="h-full rounded-full" />
                                </div>
                              )}
                            </div>

                            {l.estimated_duration_sec && (
                              <span className="text-xs text-slate-600 shrink-0">{Math.ceil(l.estimated_duration_sec/60)} دقیقه</span>
                            )}
                            <span className="text-slate-600 text-lg shrink-0">›</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
