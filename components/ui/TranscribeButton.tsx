'use client'
import { useState, useEffect, useRef } from 'react'

type Status = 'none' | 'processing' | 'done' | 'failed'

interface Props {
  lessonId?: string   // اگر درس هنوز ذخیره نشده باشد undefined است
  audioUrl: string
  initialStatus?: Status
  onDone?: () => void  // برای رفرش کردن word count بعد از اتمام
}

const LABELS: Record<Status, { text: string; color: string; icon: string }> = {
  none:       { text: 'هنوز رونویسی نشده',     color: 'text-slate-500',  icon: '⚪' },
  processing: { text: 'در حال پردازش هوش مصنوعی...', color: 'text-amber-400', icon: '⏳' },
  done:       { text: 'رونویسی و همگام‌سازی انجام شد', color: 'text-green-400', icon: '✅' },
  failed:     { text: 'خطا در رونویسی — دوباره تلاش کن', color: 'text-red-400',   icon: '❌' },
}

export default function TranscribeButton({ lessonId, audioUrl, initialStatus, onDone }: Props) {
  const [status, setStatus] = useState<Status>(initialStatus ?? 'none')
  const [starting, setStarting] = useState(false)
  const [err, setErr] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (status === 'processing' && lessonId) {
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/transcribe/status?lesson_id=${lessonId}`)
          const j = await r.json()
          if (j.status && j.status !== 'processing') {
            setStatus(j.status)
            if (pollRef.current) clearInterval(pollRef.current)
            if (j.status === 'done') onDone?.()
          }
        } catch { /* نادیده بگیر، دوباره تلاش می‌کنیم */ }
      }, 4000)
      return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }
  }, [status, lessonId, onDone])

  const start = async () => {
    if (!lessonId) { setErr('اول درس را ذخیره کن، بعد رونویسی را شروع کن'); return }
    if (!audioUrl) { setErr('اول فایل صوتی را آپلود کن'); return }
    setStarting(true); setErr('')
    try {
      const r = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lesson_id: lessonId, audio_url: audioUrl }),
      })
      const j = await r.json()
      setStarting(false)
      if (!r.ok) { setErr(j.error ?? 'خطای نامشخص'); return }
      setStatus('processing')
    } catch {
      setStarting(false)
      setErr('اتصال برقرار نشد')
    }
  }

  const info = LABELS[status]

  return (
    <div className="mb-4 p-3 bg-ocean-900 border border-ocean-600 rounded-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span>{info.icon}</span>
          <div>
            <p className="text-xs font-medium text-slate-200">همگام‌سازی صدا با متن (AI)</p>
            <p className={`text-xs ${info.color} mt-0.5`}>{info.text}</p>
          </div>
        </div>
        <button
          onClick={start}
          disabled={starting || status === 'processing' || !audioUrl}
          className="shrink-0 px-3 py-1.5 text-xs bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {starting ? 'در حال شروع...' : status === 'done' ? '🔄 رونویسی مجدد' : status === 'failed' ? '🔄 تلاش دوباره' : '🎙️ شروع رونویسی خودکار'}
        </button>
      </div>
      {!audioUrl && <p className="text-xs text-slate-600 mt-2">برای رونویسی خودکار، اول فایل صوتی درس را آپلود کن.</p>}
      {err && <p className="text-xs text-red-400 mt-2">{err}</p>}
    </div>
  )
}
