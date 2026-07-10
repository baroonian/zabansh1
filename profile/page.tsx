import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Speedometer from '@/components/ui/Speedometer'
import LogoutButton from './LogoutButton'

export default async function ProfilePage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, progressRes, wordRes, knownRes, streakRes] = await Promise.all([
    sb.from('users').select('*').eq('id', user.id).single(),
    sb.from('progress').select('completed,total_time_spent_ms').eq('user_id', user.id),
    sb.from('word_timestamps').select('id', { count: 'exact', head: true }),
    sb.from('user_word_status').select('id,status').eq('user_id', user.id),
    sb.from('streaks').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(14),
  ])

  const profile       = profileRes.data
  const totalWords    = wordRes.count ?? 0
  const knownWords    = (knownRes.data ?? []).filter(w => w.status === 'known').length
  const learningWords = (knownRes.data ?? []).filter(w => w.status === 'learning').length
  const pct = totalWords > 0 ? Math.round(knownWords / totalWords * 100) : 0
  const completedLessons = (progressRes.data ?? []).filter(p => p.completed).length
  const totalMinutes = Math.round(
    (progressRes.data ?? []).reduce((s, p) => s + (p.total_time_spent_ms ?? 0), 0) / 60000
  )
  const pctLabel = pct === 0 ? 'هنوز شروع نکردی' : pct < 34 ? 'در حال شروع' : pct < 67 ? 'پیشرفت خوب' : 'عالی!'

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 pb-16 pt-8">
        <div className="bg-card border border-ocean-600 rounded-2xl p-6 mb-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center text-ocean-950 font-bold text-2xl shrink-0">
            {(profile?.full_name || user.email || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">{profile?.full_name ?? 'کاربر'}</h1>
            <p className="text-sm text-slate-400 mt-0.5">{user.email}</p>
            <p className="text-xs text-slate-500 mt-1">
              عضو از {new Date(profile?.created_at ?? '').toLocaleDateString('fa-IR')}
            </p>
          </div>
          <LogoutButton />
        </div>

        <div className="bg-card border border-ocean-600 rounded-2xl p-6 mb-6 text-center">
          <p className="text-xs text-slate-500 mb-2 tracking-wider">پیشرفت کلی یادگیری</p>
          <div className="flex justify-center">
            <Speedometer pct={pct} size={260} label={pctLabel} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'کلمه بلد',        value: knownWords,       color: '#10b981', icon: '✅' },
            { label: 'در حال یادگیری',  value: learningWords,    color: '#f59e0b', icon: '🟡' },
            { label: 'درس تکمیل‌شده',   value: completedLessons, color: '#3b82f6', icon: '📖' },
            { label: 'دقیقه مطالعه',     value: totalMinutes,     color: '#a78bfa', icon: '⏱' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-ocean-600 rounded-xl p-4 text-center"
              style={{ borderTop: `3px solid ${s.color}` }}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold" style={{ color: s.color }}>{s.value.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {(streakRes.data ?? []).length > 0 && (
          <div className="bg-card border border-ocean-600 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">فعالیت ۱۴ روز اخیر</h2>
            <div className="flex gap-2 flex-wrap">
              {[...(streakRes.data ?? [])].reverse().map(s => (
                <div key={s.date} className="text-center">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    s.lessons_completed > 0
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-ocean-700 text-slate-600'
                  }`}>
                    {s.lessons_completed > 0 ? s.lessons_completed : '·'}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {new Date(s.date).toLocaleDateString('fa-IR', { weekday: 'narrow' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
