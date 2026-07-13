'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { WordRepository } from '@/lib/repositories/WordRepository'
import { WORD_STATUS, type WordStatus } from '@/types/word'
import type { WordStateMap } from '@/types/lessonToken'

/**
 * هوک وضعیت کلمات — کاملاً بر اساس wordId کار می‌کنه.
 * تغییر وضعیت یک کلمه فقط یک ورودی از Map رو عوض می‌کنه، نه کل آرایه‌ی
 * چند هزار توکنی درس رو. یعنی toggleLearning فقط باعث re-render همون
 * SentenceInline‌ای می‌شه که اون کلمه توشه (به لطف React.memo).
 */
export function useWordStatus(
  userId: string,
  lessonId: string,
  initial: WordStateMap = {}
) {
  const [state, setState] = useState<WordStateMap>(initial)

  // ref برای خوندن آخرین state داخل callbackهای stable (بدون نیاز به وابستگی به state)
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  const toggleLearning = useCallback(async (wordId: number) => {
    const cur = stateRef.current[wordId]
    const next: WordStatus | undefined = cur === WORD_STATUS.LEARNING ? undefined : WORD_STATUS.LEARNING

    setState(prev => {
      const n = { ...prev }
      if (!next) delete n[wordId]
      else n[wordId] = WORD_STATUS.LEARNING
      return n
    })

    if (next) await WordRepository.markLearning(userId, wordId, lessonId)
    else await WordRepository.clearStatus(userId, wordId)
  }, [userId, lessonId])

  const markKnown = useCallback(async (wordId: number) => {
    setState(prev => ({ ...prev, [wordId]: WORD_STATUS.KNOWN }))
    await WordRepository.markKnown(userId, wordId, lessonId)
  }, [userId, lessonId])

  const markMastered = useCallback(async (wordId: number) => {
    setState(prev => ({ ...prev, [wordId]: WORD_STATUS.MASTERED }))
    await WordRepository.markMastered(userId, wordId, lessonId)
  }, [userId, lessonId])

  const unknownWordIds = useMemo(
    () => Object.entries(state).filter(([, s]) => s === WORD_STATUS.LEARNING).map(([id]) => Number(id)),
    [state]
  )

  return { state, toggleLearning, markKnown, markMastered, unknownWordIds }
}
