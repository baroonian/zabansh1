import type { Metadata } from 'next'
import "./globals.css";
import { Inter } from "next/font/google";
import { Vazirmatn } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: 'English Shadowing | یادگیری زبان به روش شدویینگ',
  description: 'یادگیری آسان زبان بدون تلاش',
}

export default function RootLayout({
  return (
    <html lang="fa" dir="rtl" className={`${inter.variable} ${vazirmatn.variable}`}>
      <body className="min-h-screen bg-ocean-950 text-slate-200 antialiased">
        {children}
      </body>
    </html>
  )
}
