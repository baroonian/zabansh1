'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function GoogleButton() {
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    setLoading(true)
    const sb = createClient()
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/home`,
      },
    })
    // در صورت موفقیت مرورگر ریدایرکت می‌شود، پس فقط خطا را هندل می‌کنیم
    if (error) { setLoading(false); alert('خطا در اتصال به گوگل: ' + error.message) }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2.5 py-3 bg-white hover:bg-slate-100 text-slate-800 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.6-5.2-11.6-11.6S17.6 12.3 24 12.3c3 0 5.6 1.1 7.7 2.9l5.7-5.7C33.7 6.1 29.1 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c10 0 19.1-7.2 19.1-20 0-1.2-.1-2.4-.3-3.5z"/>
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.6 18.9 12.3 24 12.3c3 0 5.6 1.1 7.7 2.9l5.7-5.7C33.7 6.1 29.1 4 24 4c-7.6 0-14.2 4.3-17.7 10.7z"/>
        <path fill="#4CAF50" d="M24 44c5.1 0 9.6-1.9 13-5.1l-6-5.1c-2 1.5-4.6 2.5-7 2.5-5.3 0-9.6-3.5-11.3-8.3l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.7-2.7 5-5 6.7l6 5.1C39.5 37 44 31 44 24c0-1.2-.1-2.4-.4-3.5z"/>
      </svg>
      {loading ? 'در حال اتصال...' : 'ادامه با حساب گوگل'}
    </button>
  )
}
