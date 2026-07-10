// وبهوک AssemblyAI — وقتی رونویسی تمام شد اینجا صدا زده می‌شود
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ASSEMBLYAI_BASE = 'https://api.assemblyai.com/v2'

interface AAIWord { text: string; start: number; end: number; confidence: number }

export async function POST(request: NextRequest) {
  try {
    // ── تأیید امنیتی وبهوک ──────────────────────────────────
    const secret = request.headers.get('x-webhook-secret')
    if (secret !== process.env.TRANSCRIBE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const transcriptId = body.transcript_id as string
    const status = body.status as string

    if (!transcriptId) return NextResponse.json({ error: 'transcript_id missing' }, { status: 400 })

    const admin = createAdminClient()

    // ── پیدا کردن درس مرتبط ────────────────────────────────
    const { data: lesson } = await admin
      .from('lessons')
      .select('id')
      .eq('transcript_id', transcriptId)
      .single()

    if (!lesson) return NextResponse.json({ error: 'lesson not found' }, { status: 404 })

    if (status === 'error') {
      await admin.from('lessons').update({ transcription_status: 'failed' }).eq('id', lesson.id)
      return NextResponse.json({ ok: true })
    }

    if (status !== 'completed') {
      // وضعیت میانی — کاری لازم نیست
      return NextResponse.json({ ok: true })
    }

    // ── دریافت متن کامل رونویسی از AssemblyAI ─────────────
    const apiKey = process.env.ASSEMBLYAI_API_KEY!
    const res = await fetch(`${ASSEMBLYAI_BASE}/transcript/${transcriptId}`, {
      headers: { authorization: apiKey },
    })
    if (!res.ok) {
      await admin.from('lessons').update({ transcription_status: 'failed' }).eq('id', lesson.id)
      return NextResponse.json({ error: 'خطا در دریافت transcript' }, { status: 502 })
    }
    const data = await res.json()
    const words: AAIWord[] = data.words ?? []

    if (!words.length) {
      await admin.from('lessons').update({ transcription_status: 'failed' }).eq('id', lesson.id)
      return NextResponse.json({ error: 'کلمه‌ای یافت نشد' }, { status: 422 })
    }

    // ── پاک کردن رکوردهای قبلی این درس (اگر دوباره اجرا شد) ──
    await admin.from('word_timestamps').delete().eq('lesson_id', lesson.id)

    // ── درج دسته‌ای timestamps ─────────────────────────────
    const rows = words.map((w, i) => ({
      lesson_id: lesson.id,
      word: w.text.toLowerCase().replace(/[^a-z']/g, ''),
      word_index: i,
      start_ms: w.start,
      end_ms: w.end,
    })).filter(r => r.word.length > 0)

    const CHUNK = 500
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await admin.from('word_timestamps').insert(rows.slice(i, i + CHUNK))
      if (error) {
        await admin.from('lessons').update({ transcription_status: 'failed' }).eq('id', lesson.id)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // ── بروزرسانی متن درس با متن دقیق تشخیص داده‌شده (اختیاری) ──
    // متن اصلی dest دست نخورده باقی می‌ماند مگر ادمین بخواهد جایگزین شود

    await admin.from('lessons').update({ transcription_status: 'done' }).eq('id', lesson.id)

    return NextResponse.json({ ok: true, wordsCount: rows.length })
  } catch (err) {
    console.error('webhook error:', err)
    return NextResponse.json({ error: 'خطای داخلی سرور' }, { status: 500 })
  }
}
