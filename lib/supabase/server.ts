import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(
          cookiesToSet: {
            name: string
            value: string
            options?: Record<string, unknown>
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              // @ts-expect-error - options type mismatch between next/headers and @supabase/ssr
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookies can only be set in middleware/route handlers
          }
        },
      },
    }
  )
}
