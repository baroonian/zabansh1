'use client'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  value: string
  onChange: (url: string) => void
  folder?: string
}

export default function AudioUpload({ value, onChange, folder = 'lessons' }: Props) {
  const sb = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [err, setErr] = useState('')

  const upload = async (file: File) => {
    const allowed = ['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/m4a','audio/aac']
    if (!allowed.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
      setErr('فقط فایل‌های MP3، WAV، OGG، M4A پشتیبانی می‌شود')
      return
    }
    if (file.size > 100 * 1024 * 1024) { setErr('حجم فایل باید کمتر از ۱۰۰ مگابایت باشد'); return }
    setUploading(true); setErr(''); setProgress(0)
    const ext  = file.name.split('.').pop()
    const path = `${folder}/${Date.now()}.${ext}`
    const { error } = await sb.storage.from('audio').upload(path, file, { upsert: true })
    if (error) { setErr(error.message); setUploading(false); return }
    const { data } = sb.storage.from('audio').getPublicUrl(path)
    onChange(data.publicUrl)
    setUploading(false); setProgress(100)
  }

  const fileName = value ? value.split('/').pop() : null

  return (
    <div className="mb-4">
      <label className="block text-xs text-slate-400 mb-1.5">فایل صوتی</label>

      {value && (
        <div className="mb-2 p-3 bg-ocean-900 border border-ocean-500 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <span className="text-sm">🎵</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white truncate">{fileName}</p>
              <p className="text-xs text-slate-500 mt-0.5">آپلود شده</p>
            </div>
            <button onClick={() => onChange('')}
              className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-red-900/20 rounded-lg transition-colors">
              حذف
            </button>
          </div>
          <audio controls src={value} className="w-full h-8" style={{ height: 32 }} />
        </div>
      )}

      <div onClick={() => !uploading && fileRef.current?.click()}
        className={`w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 py-4 transition-all ${uploading ? 'border-amber-500/50 bg-amber-500/5' : 'border-ocean-500 hover:border-amber-500 hover:bg-amber-500/5 cursor-pointer'}`}>
        {uploading ? (
          <div className="flex flex-col items-center gap-2 w-full px-6">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-amber-400">در حال آپلود...</span>
            <div className="w-full h-1.5 bg-ocean-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <>
            <span className="text-2xl">🎙️</span>
            <span className="text-xs text-slate-400">{value ? 'جایگزین کردن فایل صوتی' : 'آپلود فایل صوتی از سیستم'}</span>
            <span className="text-xs text-slate-600">MP3, WAV, OGG, M4A تا ۱۰۰ مگابایت</span>
          </>
        )}
      </div>

      <input ref={fileRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac" className="hidden"
        onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />

      {err && <p className="text-xs text-red-400 mt-1">{err}</p>}

      {/* OR manual URL */}
      <div className="mt-2">
        <p className="text-xs text-slate-600 mb-1">یا لینک مستقیم وارد کن:</p>
        <input type="url" value={value} onChange={e => onChange(e.target.value)}
          placeholder="https://example.com/audio.mp3"
          className="w-full px-3 py-2 bg-ocean-900 border border-ocean-600 rounded-lg text-white text-xs placeholder-slate-600 focus:outline-none focus:border-amber-500" />
      </div>
    </div>
  )
}
