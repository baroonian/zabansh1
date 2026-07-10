// بررسی وضعیت رونویسی یک درس (برای polling از پنل ادمین)
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'ورود لازم است' }, { status: 401 })

  const lessonId = request.nextUrl.searchParams.get('lesson_id')
  if (!lessonId) return NextResponse.json({ error: 'lesson_id الزامی است' }, { status: 400 })

  const { data, error } = await sb
    .from('lessons')
    .select('transcription_status')
    .eq('id', lessonId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  return NextResponse.json({ status: data.transcription_status ?? 'none' })
}
