'use client'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  value: string
  onChange: (url: string) => void
  bucket?: string
  folder?: string
  label?: string
}

export default function ImageUpload({ value, onChange, bucket = 'covers', folder = 'misc', label = 'تصویر' }: Props) {
  const sb = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) { setErr('فقط فایل تصویری قابل قبول است'); return }
    if (file.size > 5 * 1024 * 1024) { setErr('حجم فایل باید کمتر از ۵ مگابایت باشد'); return }
    setUploading(true); setErr('')
    const ext  = file.name.split('.').pop()
    const path = `${folder}/${Date.now()}.${ext}`
    const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) { setErr(error.message); setUploading(false); return }
    const { data } = sb.storage.from(bucket).getPublicUrl(path)
    onChange(data.publicUrl)
    setUploading(false)
  }

  return (
    <div className="mb-4">
      <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
      {value ? (
        <div className="relative w-full h-36 rounded-xl overflow-hidden mb-2 border border-ocean-500">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button onClick={() => onChange('')}
            className="absolute top-2 left-2 w-7 h-7 bg-red-600/90 hover:bg-red-500 rounded-full text-white text-sm flex items-center justify-center transition-colors">
            ✕
          </button>
        </div>
      ) : (
        <div onClick={() => fileRef.current?.click()}
          className="w-full h-36 border-2 border-dashed border-ocean-500 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-amber-500 hover:bg-amber-500/5 transition-all mb-2">
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">در حال آپلود...</span>
            </div>
          ) : (
            <>
              <span className="text-2xl">🖼️</span>
              <span className="text-xs text-slate-400">کلیک کن یا فایل را اینجا بنداز</span>
              <span className="text-xs text-slate-600">PNG, JPG, WebP تا ۵ مگابایت</span>
            </>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
      {err && <p className="text-xs text-red-400 mt-1">{err}</p>}
    </div>
  )
}
