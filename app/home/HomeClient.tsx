'use client'
import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Speedometer from '@/components/ui/Speedometer'
import type { Book, Category, UserProfile } from '@/types'

const LEVEL_FILTERS = [
  { key: 'all',          label: 'همه',           icon: '📚' },
  { key: 'beginner',     label: 'سطح ساده',       icon: '🌱' },
  { key: 'intermediate', label: 'سطح متوسط',      icon: '📘' },
  { key: 'advanced',     label: 'سطح پیشرفته',   icon: '🔥' },
  { key: 'children',     label: 'کودک',           icon: '🧒' },
  { key: 'adult',        label: 'بزرگسال',        icon: '👤' },
  { key: 'Movie & TV',   label: 'فیلم و سریال',   icon: '👤' },
]

const LEVEL_COLORS: Record<string, string> = {
  beginner:     '#10b981',
  intermediate: '#3b82f6',
  advanced:     '#f59e0b',
}

interface Props {
  profile: UserProfile | null
  books: Book[]
  categories: Category[]
  stats: { pct: number; known: number; learning: number; total: number }
}

export default function HomeClient({ profile, books, categories, stats }: Props) {
  const [activeLevel, setActiveLevel] = useState('all')

  const filtered = activeLevel === 'all'
    ? books
    : books.filter(b => {
        if (activeLevel === 'children') return b.category?.name_fa?.includes('کودک')
        if (activeLevel === 'adult')    return b.category?.name_fa?.includes('بزرگسال')
        if (activeLevel === 'beginner')    return b.category?.name_fa?.includes('سطح ساده')
        if (activeLevel === 'intermediate')    return b.category?.name_fa?.includes('سطح متوسط')
        if (activeLevel === 'advanced')    return b.category?.name_fa?.includes('سطح پیشرفته')
        if (activeLevel === 'Movie & TV')    return b.category?.name_fa?.includes('فیلم و سریال')
        return b.level === activeLevel
      })

  const pctLabel =
    stats.pct === 0   ? 'هنوز شروع نکردی' :
    stats.pct < 34    ? 'در حال شروع'      :
    stats.pct < 67    ? 'پیشرفت خوب'       :
    stats.pct < 90    ? 'عالی!'            : 'استاد زبان!'

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />

      <main className="max-w-5xl mx-auto px-4 pb-16">

        {/* ── Speedometer Hero ── */}
        <section className="text-center py-10">
          <p className="text-xs text-slate-500 tracking-widest uppercase mb-1">پیشرفت کلی یادگیری</p>
          <div className="flex justify-center">
            <Speedometer pct={stats.pct} size={300} label={pctLabel} />
          </div>

          {/* Stats pills */}
          <div className="flex justify-center gap-3 mt-4 flex-wrap">
            {[
              { label: 'کلمه بلد',         value: stats.known,    color: '#10b981' },
              { label: 'در حال یادگیری',    value: stats.learning, color: '#f59e0b' },
              { label: 'کل کلمات برنامه',  value: stats.total,    color: '#3b82f6' },
            ].map(s => (
              <div key={s.label}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-ocean-600 bg-card text-sm">
                <span style={{ color: s.color }} className="font-bold">{s.value.toLocaleString()}</span>
                <span className="text-slate-400 text-xs">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Level progress bars */}
          <div className="flex justify-center gap-3 mt-5 flex-wrap">
            {[
              { label: 'ساده',     color: '#10b981', pct: 0 },
              { label: 'متوسط',   color: '#3b82f6', pct: 0 },
              { label: 'پیشرفته', color: '#f59e0b', pct: 0 },
            ].map(lv => (
              <div key={lv.label}
                className="bg-card border border-ocean-600 rounded-xl px-4 py-2.5 w-36 text-center">
                <p className="text-xs text-slate-400 mb-2">{lv.label}</p>
                <div className="h-1.5 bg-ocean-700 rounded-full overflow-hidden">
                  <div style={{ width: `${lv.pct}%`, background: lv.color }}
                    className="h-full rounded-full transition-all duration-700" />
                </div>
                <p className="text-xs text-slate-500 mt-1">{lv.pct}%</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Level Filter ── */}
        <div className="flex gap-2 flex-wrap mb-6">
          {LEVEL_FILTERS.map(f => (
            <button key={f.key} onClick={() => setActiveLevel(f.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm border transition-all ${
                activeLevel === f.key
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-ocean-600 bg-card text-slate-400 hover:border-ocean-500 hover:text-slate-300'
              }`}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        {/* ── Books Grid ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <div className="text-4xl mb-3">📭</div>
            <p>کتابی در این دسته‌بندی وجود ندارد</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function BookCard({ book }: { book: Book }) {
  const color = LEVEL_COLORS[book.level] ?? '#6366f1'
  const icon  =
    book.level === 'beginner'     ? '🌱' :
    book.level === 'intermediate' ? '📘' : '🔥'

  return (
    <Link href={`/book/${book.id}`}
      className="group bg-card border border-ocean-600 rounded-xl overflow-hidden hover:border-ocean-500 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
      {/* Cover */}
      <div className="h-32 flex items-center justify-center relative"
        style={{ background: `linear-gradient(135deg, ${color}15, ${color}30)` }}>
        <span className="text-4xl">{icon}</span>
        <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: `${color}20`, color }}>
          {book.category?.name_fa ?? book.level}
        </span>
      </div>
      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-sm text-white leading-tight line-clamp-2">{book.title_fa}</p>
        {book.author && <p className="text-xs text-slate-500 mt-1 truncate">{book.author}</p>}
        <div className="flex items-center justify-between mt-2">
          <div className="h-1 flex-1 bg-ocean-700 rounded-full overflow-hidden ml-2">
            <div className="h-full w-0 rounded-full" style={{ background: color }} />
          </div>
          <span className="text-xs text-slate-500">{book.total_chapters} فصل</span>
        </div>
      </div>
    </Link>
  )
}

