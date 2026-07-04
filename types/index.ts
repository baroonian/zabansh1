export interface Category {
  id: string
  name: string
  name_fa: string
  description?: string
  icon?: string
  color: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Book {
  id: string
  category_id?: string
  title: string
  title_fa: string
  author?: string
  description?: string
  cover_url?: string
  level: 'beginner' | 'intermediate' | 'advanced'
  is_active: boolean
  sort_order: number
  total_chapters: number
  created_at: string
  updated_at: string
  category?: Category
}

export interface Chapter {
  id: string
  book_id: string
  number: number
  title_fa: string
  title_en?: string
  description?: string
  book?: Book
  lessons?: Lesson[]
}

export interface Lesson {
  id: string
  chapter_id: string
  number: number
  title_fa: string
  title_en?: string
  text_en: string
  text_parsed?: Record<string, unknown>
  audio_url?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  estimated_duration_sec?: number
  is_published: boolean
  chapter?: Chapter
}

export interface UserWordStatus {
  id: string
  user_id: string
  word: string
  status: 'learning' | 'known'
  lesson_id?: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  is_admin: boolean
  is_blocked: boolean
  preferred_speed: number
  theme: 'light' | 'dark' | 'system'
  created_at: string
  updated_at: string
}

export interface Progress {
  id: string
  user_id: string
  lesson_id: string
  completed: boolean
  completion_percentage: number
  last_position_ms: number
  play_count: number
  total_time_spent_ms: number
  completed_at?: string
  updated_at: string
}

// ─── Subscription Plans ───────────────────────────────────────
export type PlanType = 'free' | 'silver' | 'gold'
export type BillingCycle = 'monthly' | 'yearly'

export interface Plan {
  id: string
  name: PlanType
  name_fa: string
  description?: string
  price_monthly: number
  price_yearly: number
  features: string[]
  max_books?: number
  max_downloads?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  billing_cycle: BillingCycle
  status: 'active' | 'expired' | 'cancelled' | 'trial'
  started_at: string
  expires_at: string
  amount_paid: number
  created_at: string
  plan?: Plan
  user?: UserProfile
}
