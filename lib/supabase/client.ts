import { createBrowserClient } from '@supabase/ssr'

// ── Singleton ────────────────────────────────────────────────
// قبلاً هر بار createClient() صدا زده می‌شد یک نمونه جدید GoTrueClient
// و اتصال Realtime جدید ساخته می‌شد (حافظه اضافه + warning در کنسول).
// الان یک نمونه واحد در کل عمر تب مرورگر استفاده می‌شود.
let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}
