# 🎧 English Shadowing Web App

Next.js + Supabase + Tailwind — deploy روی Vercel

## ساختار پروژه

```
app/
├── admin/        ← صفحه مدیریت
├── auth/login/        ← صفحه ورود
├── auth/register/     ← صفحه ثبت‌نام
├── auth/callback/     ← Supabase OAuth callback
├── home/              ← صفحه اصلی (سرعت‌سنج + کتاب‌ها)
├── book/[id]/         ← جزئیات کتاب + فصل‌ها
├── lesson/[id]/       ← درس + سیستم کلمات
└── profile/           ← پروفایل + آمار

components/
├── ui/Speedometer.tsx ← سرعت‌سنج SVG
├── ui/WordText.tsx    ← متن قابل کلیک
├── ui/ProgressRing.tsx
└── layout/Navbar.tsx

lib/supabase/
├── client.ts          ← browser client
└── server.ts          ← server client (SSR)
```

## نصب و اجرای محلی

```bash
npm install
npm run dev
```

باز کن: http://localhost:3000

## Deploy روی Vercel

### روش ۱ — از GitHub (توصیه شده)

```bash
# ۱. clone کن
git clone https://github.com/baroonian/zabansh1
cd zabansh1

# ۲. فایل‌های این پروژه رو کپی کن
# ۳. push کن
git add .
git commit -m "...."
git push origin main
```

بعد در Vercel:
1. New Project → Import از GitHub
2. Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = آدرس Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = کلید anon
3. Deploy!

### روش ۲ — Vercel CLI

```bash
npm i -g vercel
vercel --prod
```

## متغیرهای محیطی

| متغیر | مقدار |
|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cvsgrhsmtcdevgrhnjpu.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | کلید anon پروژه |

## Supabase — جداول مورد نیاز

- `users` — پروفایل کاربران
- `categories` — دسته‌بندی‌ها
- `books` — کتاب‌ها (title, title_fa, level, category_id)
- `chapters` — فصل‌ها (number, title_fa, title_en)
- `lessons` — درس‌ها (number, title_fa, text_en, is_published)
- `user_word_status` — کلمات کاربر (word, status, lesson_id)
- `progress` — پیشرفت درس‌ها

## امکانات

- ✅ ثبت‌نام / ورود با Supabase Auth
- ✅ سرعت‌سنج SVG انیمیت‌شده
- ✅ لیست کتاب‌ها با فیلتر سطح
- ✅ فصل‌ها و درس‌ها با accordion
- ✅ سیستم علامت‌گذاری کلمات (کلیک → هایلایت زرد)
- ✅ ذخیره کلمات ناآشنا در Supabase
- ✅ تکمیل درس و ذخیره progress
- ✅ پروفایل با آمار و نمودار فعالیت
- ✅ SSR کامل با Next.js 15 App Router
- ✅ Proxy برای حفاظت routes
