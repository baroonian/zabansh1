import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-white mb-2">صفحه پیدا نشد</h1>
        <p className="text-slate-400 mb-6">این صفحه وجود ندارد یا حذف شده</p>
        <Link href="/home" className="px-6 py-3 bg-amber-500 text-ocean-950 font-bold rounded-xl hover:bg-amber-400 transition-colors">
          بازگشت به خانه
        </Link>
      </div>
    </div>
  )
}
