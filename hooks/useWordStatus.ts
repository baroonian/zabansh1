'use client'
import { useState, useCallback } from 'react'
<<<<<<< Updated upstream
import { createClient } from '@/lib/supabase/client'

export type WordStatusMap = Record<string, 'learning' | 'known'>
=======
import { WordRepository } from "@/lib/repositories/WordRepository";
import { WORD_STATUS, type WordStatus } from '@/types/words'
import { normalizeWord } from '@/lib/normalizeWord'

export type WordStatusMap = Record<string, WordStatus>;
>>>>>>> Stashed changes

export function useWordStatus(
  userId: string,
  lessonId: string,
  initial: WordStatusMap = {}
) {
<<<<<<< Updated upstream
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

=======
  
  const [status, setStatus] = useState<WordStatusMap>(initial)

const toggle = useCallback(
    async (wordId:number, word:string) => {

        const normalized = normalizeWord(word);

        if(!normalized)
            return;

        const cur=status[normalized];

        const next=
            cur===WORD_STATUS.LEARNING
            ? null
            : WORD_STATUS.LEARNING;

        setStatus(prev=>{

            const n={...prev};

            if(!next)
                delete n[normalized];
            else
                n[normalized]=WORD_STATUS.LEARNING;

            return n;

        });

        if(next===WORD_STATUS.LEARNING){

            await WordRepository.markLearning(

                userId,

                wordId,

                lessonId

            );

        }

    },
    [status,userId,lessonId]
);

const markKnown = useCallback(
async (wordId:number,word:string)=>{

    const normalized=normalizeWord(word);

    if(!normalized)
        return;

    setStatus(prev=>({

        ...prev,

        [normalized]:WORD_STATUS.KNOWN

    }));

    await WordRepository.markKnown(

        userId,

        wordId,

        lessonId

    );

},
[userId,lessonId]
);

const unknownWords = Object.entries(status)
    .filter(([, s]) => s === WORD_STATUS.LEARNING)
    .map(([w]) => w)

>>>>>>> Stashed changes
  return { status, toggle, markKnown, unknownWords }
}
