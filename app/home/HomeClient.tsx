'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/layout/Navbar'
import Speedometer from '@/components/ui/Speedometer'
import type { Book, Category, UserProfile } from '@/types'

const LEVEL_FILTERS = [
  { key:'all',          label:'همه',          icon:'📚' },
  { key:'beginner',     label:'سطح ساده',      icon:'🌱' },
  { key:'intermediate', label:'سطح متوسط',     icon:'📘' },
  { key:'advanced',     label:'سطح پیشرفته',  icon:'🔥' },
  { key:'children',     label:'کودک',          icon:'🧒' },
  { key:'adult',        label:'بزرگسال',       icon:'👤' },
]

const LEVEL_COLORS: Record<string,string> = {
  beginner:'#10b981', intermediate:'#3b82f6', advanced:'#f59e0b',
}
const LEVEL_ICON: Record<string,string> = {
  beginner:'🌱', intermediate:'📘', advanced:'🔥',
}

interface Props {
  profile: UserProfile|null
  books: Book[]
  categories: Category[]
  stats: { pct:number; known:number; learning:number; total:number }
}

export default function HomeClient({ profile, books, categories, stats }: Props) {
  const [activeLevel, setActiveLevel] = useState('all')

  const filtered = activeLevel==='all' ? books : books.filter(b => {
    if (activeLevel==='children') return b.category && (b.category as any).name_fa?.includes('کودک')
    if (activeLevel==='adult')    return b.category && (b.category as any).name_fa?.includes('بزرگسال')
    return b.level===activeLevel
  })

  const pctLabel =
    stats.pct===0 ? 'هنوز شروع نکردی' :
    stats.pct<34  ? 'در حال شروع'      :
    stats.pct<67  ? 'پیشرفت خوب'       :
    stats.pct<90  ? 'عالی!'            : 'استاد زبان!'

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="max-w-5xl mx-auto px-4 pb-16">

        {/* Speedometer */}
        <section className="text-center py-10">
          <p className="text-xs text-slate-500 tracking-widest uppercase mb-1">پیشرفت کلی یادگیری</p>
          <div className="flex justify-center">
            <Speedometer pct={stats.pct} size={300} label={pctLabel} />
          </div>
          <div className="flex justify-center gap-3 mt-4 flex-wrap">
            {[
              { label:'کلمه بلد',        value:stats.known,    color:'#10b981' },
              { label:'در حال یادگیری',  value:stats.learning, color:'#f59e0b' },
              { label:'کل کلمات برنامه', value:stats.total,    color:'#3b82f6' },
            ].map(s=>(
              <div key={s.label} className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-ocean-600 bg-ocean-800 text-sm">
                <span style={{color:s.color}} className="font-bold">{s.value.toLocaleString()}</span>
                <span className="text-slate-400 text-xs">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Level filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {LEVEL_FILTERS.map(f=>(
            <button key={f.key} onClick={()=>setActiveLevel(f.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm border transition-all ${activeLevel===f.key?'border-amber-500 bg-amber-500/10 text-amber-400':'border-ocean-600 bg-ocean-800 text-slate-400 hover:border-ocean-500'}`}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        {/* Books grid */}
        {filtered.length===0 ? (
          <div className="text-center py-20 text-slate-500">
            <div className="text-4xl mb-3">📭</div>
            <p>کتابی در این دسته‌بندی وجود ندارد</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map(book=><BookCard key={book.id} book={book} />)}
          </div>
        )}
      </main>
    </div>
  )
}

function BookCard({ book }: { book:Book }) {
  const [hov, setHov] = useState(false)
  const color = LEVEL_COLORS[book.level] ?? '#6366f1'
  const icon  = LEVEL_ICON[book.level] ?? '📚'
  const cat   = book.category as any

  return (
    <Link href={`/book/${book.id}`}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      className="group bg-ocean-800 border border-ocean-600 rounded-xl overflow-hidden transition-all duration-200"
      style={{ transform:hov?'translateY(-3px)':'none', borderColor:hov?'#274672':'#1d3557', boxShadow:hov?'0 8px 24px rgba(0,0,0,.4)':'' }}>

      {/* Cover image */}
      <div className="h-36 relative overflow-hidden" style={{background:book.cover_url?undefined:`linear-gradient(135deg,${color}18,${color}35)`}}>
        {book.cover_url ? (
          <Image src={book.cover_url} alt={book.title_fa} fill sizes="(max-width: 768px) 45vw, 220px"
            className="object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {cat?.image_url
              ? <Image src={cat.image_url} alt={cat.name_fa} fill sizes="220px" className="object-cover opacity-60" loading="lazy" />
              : <span className="text-5xl filter drop-shadow-lg">{icon}</span>
            }
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0" style={{background:'linear-gradient(to top, rgba(17,34,64,0.8) 0%, transparent 50%)'}} />
        {/* Level badge */}
        <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium"
          style={{background:`${color}25`, color, border:`1px solid ${color}40`}}>
          {cat?.name_fa ?? book.level}
        </span>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-sm text-white leading-tight line-clamp-2 group-hover:text-amber-400 transition-colors">{book.title_fa}</p>
        {book.author && <p className="text-xs text-slate-500 mt-1 truncate">{book.author}</p>}
        <div className="flex items-center justify-between mt-2">
          <div className="h-1 flex-1 bg-ocean-700 rounded-full overflow-hidden ml-2">
            <div className="h-full w-0 rounded-full" style={{background:color}} />
          </div>
          <span className="text-xs text-slate-500">{book.total_chapters} فصل</span>
        </div>
      </div>
    </Link>
  )
}
