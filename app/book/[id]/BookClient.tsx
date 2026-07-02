'use client'
import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import type { Book, Chapter, Lesson, UserProfile } from '@/types'

const LEVEL_COLORS: Record<string, string> = {
  beginner: '#10b981', intermediate: '#3b82f6', advanced: '#f59e0b',
}

interface Props {
  book: Book
  chapters: (Chapter & { lessons?: Lesson[] })[]
  profile: UserProfile | null
  progressMap: Record<string, { completed: boolean; pct: number }>
}

export default function BookClient({ book, chapters, profile, progressMap }: Props) {
  const [open, setOpen] = useState<string | null>(chapters[0]?.id ?? null)
  const color = LEVEL_COLORS[book.level] ?? '#6366f1'

  const totalLessons    = chapters.reduce((s, c) => s + (c.lessons?.length ?? 0), 0)
  const completedLessons = chapters.reduce((s, c) =>
    s + (c.lessons ?? []).filter(l => progressMap[l.id]?.completed).length, 0)
  const overallPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />

      <main className="max-w-2xl mx-auto px-4 pb-16 pt-6">
        {/* Back */}
        <Link href="/home" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
          ← بازگشت به کتاب‌ها
        </Link>

        {/* Book header */}
        <div className="bg-card border border-ocean-600 rounded-2xl overflow-hidden mb-6">
          <div className="h-28 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}15, ${color}35)` }}>
            <span className="text-6xl">
              {book.level === 'beginner' ? '🌱' : book.level === 'intermediate' ? '📘' : '🔥'}
            </span>
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h1 className="text-lg font-bold text-white">{book.title_fa}</h1>
                <p className="text-sm text-slate-400 mt-0.5">{book.title}</p>
                {book.author && <p className="text-xs text-slate-500 mt-1">{book.author}</p>}
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold shrink-0"
                style={{ background: `${color}20`, color }}>
                {book.category?.name_fa ?? book.level}
              </span>
            </div>
            {book.description && (
              <p className="text-sm text-slate-400 mt-3 leading-relaxed">{book.description}</p>
            )}
            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>{completedLessons} از {totalLessons} درس تکمیل</span>
                <span style={{ color }}>{overallPct}%</span>
              </div>
              <div className="h-1.5 bg-ocean-700 rounded-full overflow-hidden">
                <div style={{ width: `${overallPct}%`, background: color }}
                  className="h-full rounded-full transition-all duration-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Chapters */}
        <div className="space-y-2">
          {chapters.map(ch => {
            const isOpen    = open === ch.id
            const lessons   = ch.lessons ?? []
            const done      = lessons.filter(l => progressMap[l.id]?.completed).length

            return (
              <div key={ch.id} className="border border-ocean-600 rounded-xl overflow-hidden">
                {/* Chapter header */}
                <button onClick={() => setOpen(isOpen ? null : ch.id)}
                  className="w-full flex items-center justify-between px-4 py-3.5 bg-card hover:bg-ocean-800 transition-colors text-right">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: `${color}20`, color }}>
                      {ch.number}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{ch.title_fa}</p>
                      {ch.title_en && <p className="text-xs text-slate-500 mt-0.5">{ch.title_en}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-500">{done}/{lessons.length}</span>
                    <span className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  </div>
                </button>

                {/* Lessons */}
                {isOpen && (
                  <div className="divide-y divide-ocean-700 bg-ocean-900/50">
                    {lessons.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-slate-500">هنوز درسی اضافه نشده</p>
                    ) : (
                      lessons.sort((a, b) => a.number - b.number).map(l => {
                        const prog   = progressMap[l.id]
                        const isDone = prog?.completed

                        return (
                          <Link key={l.id} href={`/lesson/${l.id}`}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-ocean-800/60 transition-colors group">
                            {/* Status circle */}
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 border transition-colors ${
                              isDone
                                ? 'bg-green-500/15 border-green-500/50 text-green-400'
                                : 'bg-ocean-700 border-ocean-600 text-slate-400 group-hover:border-ocean-500'
                            }`}>
                              {isDone ? '✓' : l.number}
                            </div>

                            <div className="flex-1 min-w-0 text-right">
                              <p className={`text-sm truncate ${isDone ? 'text-slate-400' : 'text-white'}`}>
                                {l.title_fa}
                              </p>
                              {l.title_en && (
                                <p className="text-xs text-slate-600 truncate mt-0.5">{l.title_en}</p>
                              )}
                              {prog && !isDone && (
                                <div className="mt-1.5 h-0.5 w-16 bg-ocean-700 rounded-full overflow-hidden">
                                  <div style={{ width: `${prog.pct}%`, background: color }}
                                    className="h-full rounded-full" />
                                </div>
                              )}
                            </div>

                            {l.estimated_duration_sec && (
                              <span className="text-xs text-slate-600 shrink-0">
                                {Math.ceil(l.estimated_duration_sec / 60)} دقیقه
                              </span>
                            )}
                            <span className="text-slate-600 text-lg shrink-0">›</span>
                          </Link>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
