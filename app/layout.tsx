import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'English Shadowing | یادگیری زبان',
  description: 'یادگیری زبان انگلیسی با روش سایه‌نشینی',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-ocean-950 text-slate-200 antialiased">
        {children}
      </body>
    </html>
  )
}
