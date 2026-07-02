'use client'
import { memo } from 'react'

interface Props {
  text: string
  wordStatus: Record<string, 'learning' | 'known'>
  onWordClick: (word: string) => void
}

function clean(raw: string) {
  return raw.toLowerCase().replace(/[^a-zA-Z']/g, '')
}

const WordText = memo(function WordText({ text, wordStatus, onWordClick }: Props) {
  const tokens = text.split(/(\s+)/)

  return (
    <div dir="ltr" style={{ textAlign: 'left', lineHeight: 2.2, fontSize: 18 }}>
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) return <span key={i}>{token}</span>

        const word   = clean(token)
        const status = word ? wordStatus[word] : undefined

        return (
          <span key={i}
            onClick={() => word && onWordClick(token)}
            className={`word-token select-none ${status === 'learning' ? 'unknown' : ''}`}
            title={status === 'learning' ? 'در حال یادگیری — کلیک برای حذف' : 'کلیک برای علامت‌گذاری'}>
            {token}
          </span>
        )
      })}
    </div>
  )
})

export default WordText
