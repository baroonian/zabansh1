'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [name,  setName]    = useState('')
  const [email, setEmail]   = useState('')
  const [pass,  setPass]    = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pass.length < 6) { setError('رمز عبور باید حداقل ۶ کاراکتر باشد'); return }
    setError(''); setLoading(true)
    const sb = createClient()
    const { error } = await sb.auth.signUp({
      email, password: pass,
      options: { data: { full_name: name } }
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/home')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #0f2548 0%, #07111f 65%)' }}>
      <div className="w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎧</div>
          <h1 className="text-2xl font-bold text-white">English Shadowing</h1>
          <p className="text-slate-400 text-sm mt-1">همین الان شروع کن</p>
        </div>

        <div className="bg-card border border-ocean-600 rounded-2xl p-7">
          <div className="flex bg-ocean-900 rounded-xl p-1 mb-6">
            <Link href="/auth/login" className="flex-1 py-2 text-center text-sm text-slate-400 hover:text-white transition-colors">ورود</Link>
            <span className="flex-1 py-2 text-center text-sm font-semibold text-amber-500 bg-ocean-800 rounded-lg">ثبت‌نام</span>
          </div>

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">نام کامل</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                placeholder="علی محمدی"
                className="w-full px-4 py-3 bg-ocean-900 border border-ocean-600 rounded-xl text-white placeholder-ocean-500 focus:outline-none focus:border-amber-500 transition-colors text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">ایمیل</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-ocean-900 border border-ocean-600 rounded-xl text-white placeholder-ocean-500 focus:outline-none focus:border-amber-500 transition-colors text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">رمز عبور</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} required
                placeholder="حداقل ۶ کاراکتر"
                className="w-full px-4 py-3 bg-ocean-900 border border-ocean-600 rounded-xl text-white placeholder-ocean-500 focus:outline-none focus:border-amber-500 transition-colors text-sm" />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-2.5 text-red-400 text-xs text-center">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-ocean-950 font-bold rounded-xl transition-colors disabled:opacity-50 text-sm mt-2">
              {loading ? 'در حال ثبت‌نام...' : 'ساخت حساب کاربری'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
