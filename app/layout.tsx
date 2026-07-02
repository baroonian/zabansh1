import type { Metadata } from "next";
import "./globals.css";
import { Inter, Vazirmatn } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Your App",
  description: "Your app description",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={`${inter.variable} ${vazirmatn.variable}`}>
      <body className="min-h-screen bg-ocean-950 text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
