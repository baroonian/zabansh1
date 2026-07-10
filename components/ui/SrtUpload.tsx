'use client'
import { useRef, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseSRT, type SrtCue } from '@/lib/srt'

interface Props {
  lessonId?: string   // اگر درس هنوز ذخیره نشده undefined است
  onSaved?: (count: number) => void
}

export default function SrtUpload({ lessonId, onSaved }: Props) {
  const sb = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [cues, setCues] = useState<SrtCue[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [existingCount, setExistingCount] = useState<number | null>(null)

  useEffect(() => {
    if (lessonId) {
      sb.from('subtitle_cues').select('id', { count: 'exact', head: true }).eq('lesson_id', lessonId)
        .then(r => setExistingCount(r.count ?? 0))
    }
  }, [lessonId])

  const handleFile = async (file: File) => {
    setErr('')
    if (!file.name.toLowerCase().endsWith('.srt')) {
      setErr('فقط فایل با پسوند .srt پذیرفته می‌شود')
      return
    }
    const text = await file.text()
    const parsed = parseSRT(text)
    if (!parsed.length) {
      setErr('فایل SRT معتبر نبود یا خالی است')
      return
    }
    setCues(parsed)
    setFileName(file.name)
  }

  const save = async () => {
    if (!lessonId) { setErr('اول درس را ذخیره کن، بعد فایل SRT را آپلود کن'); return }
    if (!cues) return
    setSaving(true); setErr('')

    // حذف زیرنویس‌های قبلی این درس
    const delRes = await sb.from('subtitle_cues').delete().eq('lesson_id', lessonId)
    if (delRes.error) { setSaving(false); setErr(delRes.error.message); return }

    const rows = cues.map(c => ({
      lesson_id: lessonId,
      cue_index: c.index,
      start_ms: c.start_ms,
      end_ms: c.end_ms,
      text: c.text,
    }))

    const CHUNK = 300
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await sb.from('subtitle_cues').insert(rows.slice(i, i + CHUNK))
      if (error) { setSaving(false); setErr(error.message); return }
    }

    setSaving(false)
    setExistingCount(rows.length)
    setCues(null)
    setFileName('')
    onSaved?.(rows.length)
  }

  const clearExisting = async () => {
    if (!lessonId) return
    if (!confirm('زیرنویس فعلی این درس حذف شود؟')) return
    await sb.from('subtitle_cues').delete().eq('lesson_id', lessonId)
    setExistingCount(0)
  }

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  return (
    <div className="mb-4 p-3 bg-ocean-900 border border-ocean-600 rounded-xl">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <p className="text-xs font-medium text-slate-200">آپلود فایل زیرنویس SRT (همگام‌سازی دقیق دستی)</p>
          {existingCount !== null && existingCount > 0 && !cues && (
            <p className="text-xs text-green-400 mt-0.5">✅ {existingCount} خط زیرنویس ثبت شده است</p>
          )}
          {existingCount === 0 && !cues && (
            <p className="text-xs text-slate-500 mt-0.5">هنوز فایل SRT آپلود نشده</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {existingCount !== null && existingCount > 0 && !cues && (
            <button onClick={clearExisting} className="px-2 py-1.5 text-xs bg-red-900/20 text-red-400 rounded-lg hover:bg-red-900/40 transition-colors">
              حذف
            </button>
          )}
          <button onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 text-xs bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors">
            📄 انتخاب فایل .srt
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".srt" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {err && <p className="text-xs text-red-400 mt-1">{err}</p>}

      {cues && (
        <div className="mt-3 p-3 bg-ocean-800 border border-ocean-600 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-300">{fileName} — <span className="text-amber-400 font-medium">{cues.length}</span> خط پیدا شد</p>
            <button onClick={save} disabled={saving}
              className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-500 text-white rounded-lg disabled:opacity-50 transition-colors">
              {saving ? 'در حال ذخیره...' : '✅ ذخیره و اعمال'}
            </button>
          </div>
          {/* پیش‌نمایش چند خط اول */}
          <div className="max-h-32 overflow-y-auto space-y-1">
            {cues.slice(0, 5).map((c, i) => (
              <div key={i} className="text-xs text-slate-500 flex gap-2">
                <span className="text-slate-600 shrink-0 tabular-nums">{fmt(c.start_ms)}–{fmt(c.end_ms)}</span>
                <span className="truncate">{c.text}</span>
              </div>
            ))}
            {cues.length > 5 && <p className="text-xs text-slate-600">... و {cues.length - 5} خط دیگر</p>}
          </div>
        </div>
      )}

      {!lessonId && <p className="text-xs text-slate-600 mt-2">برای آپلود SRT، اول درس را یک بار ذخیره کن.</p>}
    </div>
  )
}
