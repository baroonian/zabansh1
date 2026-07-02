'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type WordStatusMap = Record<string, 'learning' | 'known'>

export function useWordStatus(
  userId: string,
  lessonId: string,
  initial: WordStatusMap = {}
) {
  const sb = createClient()
  const [status, setStatus] = useState<WordStatusMap>(initial)

  const clean = (raw: string) =>
    raw.toLowerCase().replace(/[^a-zA-Z']/g, '')

  const toggle = useCallback(async (raw: string) => {
    const word = clean(raw)
    if (!word || word.length < 2) return

    const cur  = status[word]
    const next = cur === 'learning' ? null : 'learning'

    setStatus(prev => {
      const n = { ...prev }
      if (!next) delete n[word]
      else n[word] = 'learning'
      return n
    })

    if (next === 'learning') {
      await sb.from('user_word_status').upsert(
        { user_id: userId, word, status: 'learning', lesson_id: lessonId },
        { onConflict: 'user_id,word' }
      )
    } else {
      await sb.from('user_word_status')
        .delete().eq('user_id', userId).eq('word', word)
    }
  }, [status, userId, lessonId, sb])

  const markKnown = useCallback(async (word: string) => {
    const w = clean(word)
    if (!w) return
    setStatus(prev => ({ ...prev, [w]: 'known' }))
    await sb.from('user_word_status').upsert(
      { user_id: userId, word: w, status: 'known', lesson_id: lessonId },
      { onConflict: 'user_id,word' }
    )
  }, [userId, lessonId, sb])

  const unknownWords = Object.entries(status)
    .filter(([, s]) => s === 'learning')
    .map(([w]) => w)

  return { status, toggle, markKnown, unknownWords }
}
