'use client'
import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { WordRepository } from '@/lib/repositories/WordRepository'
import type { UserProfile } from '@/types'

interface WordItem {
  wordId: number
  word: string
  translation: string | null
  reviewCount: number
}

interface Props {
  profile: UserProfile | null
  userId: string
  initialWords: WordItem[]
}

// ── ورودی ترجمه با ذخیره‌ی خودکار (debounce روی blur) ────────────
function TranslationInput({ wordId, initial }: { wordId: number; initial: string | null }) {
  const [value, setValue] = useState(initial ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const lastSavedRef = useRef(initial ?? '')

  const save = useCallback(async () => {
    if (value === lastSavedRef.current) return
    setSaving(true)
    await WordRepository.updateTranslation(wordId, value.trim())
    lastSavedRef.current = value
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }, [wordId, value])

  return (
    <div className="flex-1 min-w-0">
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        placeholder="ترجمه فارسی..."
        className="w-full px-3 py-2 bg-ocean-900 border border-ocean-600 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
      />
      <div className="h-3 mt-0.5">
        {saving && <span className="text-xs text-slate-500">در حال ذخیره...</span>}
        {saved && !saving && <span className="text-xs text-green-500">✓ ذخیره شد</span>}
      </div>
    </div>
  )
}

export default function LearningWordsClient({ profile, userId, initialWords }: Props) {
  const [words, setWords] = useState<WordItem[]>(initialWords)
  const [pendingId, setPendingId] = useState<number | null>(null)

  const handleReview = useCallback(async (wordId: number, rating: 'easy' | 'medium' | 'hard') => {
    setPendingId(wordId)
    try {
      await WordRepository.reviewWord(userId, wordId, rating)
      if (rating === 'easy') {
        // فقط با «آسان» از لیست یادگیری خارج و به «بلد» منتقل میشه
        setWords(prev => prev.filter(w => w.wordId !== wordId))
      }
      // متوسط/دشوار: در لیست می‌مونه، فقط شمارنده‌ی مرور سرور آپدیت شده
    } finally {
      setPendingId(null)
    }
  }, [userId])

  return (
    <div className="min-h-screen bg-ocean-950">
      <Navbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 pb-16 pt-6">

        <Link href="/profile" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-5 transition-colors">
          ← بازگشت به پروفایل
        </Link>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            🟡 کلمات در حال یادگیری
            <span className="text-sm font-normal text-amber-500">({words.length})</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            برای هر کلمه ترجمه‌اش رو ثبت کن و بعد از مرور، سختی‌اش رو مشخص کن.
            با زدن «آسان» کلمه بلد محسوب میشه و از این لیست خارج میشه.
          </p>
        </div>

        {words.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <div className="text-4xl mb-3">🎉</div>
            <p>هیچ کلمه‌ای در حال یادگیری نداری!</p>
            <p className="text-xs text-slate-600 mt-1">کلمات ناآشنا رو حین خواندن درس‌ها علامت بزن تا اینجا نمایش داده بشن.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {words.map(w => {
              const isPending = pendingId === w.wordId
              return (
                <div key={w.wordId}
                  className="bg-ocean-800 border border-ocean-600 rounded-xl p-4 transition-opacity"
                  style={{ opacity: isPending ? 0.5 : 1 }}>

                  <div className="flex items-start gap-3 mb-3">
                    <div className="pt-2">
                      <span className="text-lg font-semibold text-white" dir="ltr">{w.word}</span>
                      {w.reviewCount > 0 && (
                        <span className="text-xs text-slate-500 mr-2">مرور شده: {w.reviewCount} بار</span>
                      )}
                    </div>
                    <TranslationInput wordId={w.wordId} initial={w.translation} />
                  </div>

                  <div className="flex gap-2">
                    <button
                      disabled={isPending}
                      onClick={() => handleReview(w.wordId, 'easy')}
                      className="flex-1 py-2 text-xs font-medium rounded-lg bg-green-900/30 text-green-400 border border-green-700/40 hover:bg-green-900/50 transition-colors disabled:opacity-50">
                      ✅ آسان
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => handleReview(w.wordId, 'medium')}
                      className="flex-1 py-2 text-xs font-medium rounded-lg bg-amber-900/30 text-amber-400 border border-amber-700/40 hover:bg-amber-900/50 transition-colors disabled:opacity-50">
                      🟡 متوسط
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => handleReview(w.wordId, 'hard')}
                      className="flex-1 py-2 text-xs font-medium rounded-lg bg-red-900/30 text-red-400 border border-red-700/40 hover:bg-red-900/50 transition-colors disabled:opacity-50">
                      🔴 دشوار
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
