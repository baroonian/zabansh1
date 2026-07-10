// شروع فرآیند تبدیل صوت به متن با AssemblyAI
// این route فقط باید توسط ادمین صدا زده شود (بررسی auth انجام می‌شود)
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ASSEMBLYAI_BASE = 'https://api.assemblyai.com/v2'

export async function POST(request: NextRequest) {
  try {
    // ── احراز هویت: فقط ادمین ──────────────────────────────
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'ورود لازم است' }, { status: 401 })

    const { data: profile } = await sb.from('users').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'فقط ادمین مجاز است' }, { status: 403 })

    const { lesson_id, audio_url } = await request.json()
    if (!lesson_id || !audio_url) {
      return NextResponse.json({ error: 'lesson_id و audio_url الزامی است' }, { status: 400 })
    }

    const apiKey = process.env.ASSEMBLYAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ASSEMBLYAI_API_KEY تنظیم نشده است' }, { status: 500 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (!siteUrl) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_SITE_URL تنظیم نشده است' }, { status: 500 })
    }

    const admin = createAdminClient()

    // ── ارسال درخواست به AssemblyAI ────────────────────────
    const webhookUrl = `${siteUrl}/api/transcribe/webhook`
    const res = await fetch(`${ASSEMBLYAI_BASE}/transcript`, {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url,
        language_detection: true,
        webhook_url: webhookUrl,
        webhook_auth_header_name: 'x-webhook-secret',
        webhook_auth_header_value: process.env.TRANSCRIBE_WEBHOOK_SECRET,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      await admin.from('lessons').update({ transcription_status: 'failed' }).eq('id', lesson_id)
      return NextResponse.json({ error: `خطا از AssemblyAI: ${errText}` }, { status: 502 })
    }

    const json = await res.json()

    // ── ذخیره transcript_id و وضعیت processing ─────────────
    await admin.from('lessons').update({
      transcript_id: json.id,
      transcription_status: 'processing',
    }).eq('id', lesson_id)

    return NextResponse.json({ ok: true, transcript_id: json.id })
  } catch (err) {
    console.error('transcribe start error:', err)
    return NextResponse.json({ error: 'خطای داخلی سرور' }, { status: 500 })
  }
}
