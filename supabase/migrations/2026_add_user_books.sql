-- =====================================================================
-- افزودن قابلیت «کتاب توسط کاربر» به دیتابیس
-- این فایل را در Supabase Dashboard → SQL Editor اجرا کن (یک‌بار کافیست)
-- =====================================================================

-- 1) ستون‌های جدید روی جدول books -------------------------------------
-- owner_id = NULL  یعنی کتاب توسط ادمین ساخته شده (رفتار فعلی، بدون تغییر)
-- owner_id = <uuid> یعنی کتاب توسط همان کاربر ساخته شده
alter table public.books
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- visibility پیش‌فرض 'public' است تا کتاب‌های فعلی/ادمین بدون تغییر UI عمومی بمانند.
-- در فرم «کتاب‌های من»، کاربر می‌تواند این مقدار را روی 'private' بگذارد.
alter table public.books
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public','private'));

create index if not exists books_owner_id_idx on public.books(owner_id);

-- 2) فعال‌سازی Row Level Security --------------------------------------
alter table public.books    enable row level security;
alter table public.chapters enable row level security;
alter table public.lessons  enable row level security;

-- تابع کمکی برای تشخیص ادمین (از جدول public.users که ستون is_admin دارد)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.users where id = auth.uid()), false)
$$;

-- ---------------------------------------------------------------------
-- BOOKS
-- ---------------------------------------------------------------------
drop policy if exists "books_select" on public.books;
create policy "books_select" on public.books
  for select
  using (
    is_active = true
    and (
      owner_id is null                 -- کتاب‌های ادمین (رفتار قبلی)
      or visibility = 'public'         -- کتاب عمومی هر کاربری
      or owner_id = auth.uid()         -- کتاب خصوصی خودِ کاربر
      or public.is_admin()             -- ادمین همه‌چیز را می‌بیند (مدیریت/نظارت)
    )
  );

drop policy if exists "books_insert" on public.books;
create policy "books_insert" on public.books
  for insert
  with check (
    auth.uid() is not null
    and (owner_id = auth.uid() or owner_id is null and public.is_admin())
  );

drop policy if exists "books_update" on public.books;
create policy "books_update" on public.books
  for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "books_delete" on public.books;
create policy "books_delete" on public.books
  for delete
  using (owner_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- CHAPTERS (وابسته به مالکیت/دیده‌شدن کتاب والد)
-- ---------------------------------------------------------------------
drop policy if exists "chapters_select" on public.chapters;
create policy "chapters_select" on public.chapters
  for select
  using (
    exists (
      select 1 from public.books b
      where b.id = chapters.book_id
        and b.is_active = true
        and (b.owner_id is null or b.visibility = 'public' or b.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "chapters_insert" on public.chapters;
create policy "chapters_insert" on public.chapters
  for insert
  with check (
    exists (
      select 1 from public.books b
      where b.id = chapters.book_id
        and (b.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "chapters_update" on public.chapters;
create policy "chapters_update" on public.chapters
  for update
  using (
    exists (select 1 from public.books b where b.id = chapters.book_id and (b.owner_id = auth.uid() or public.is_admin()))
  )
  with check (
    exists (select 1 from public.books b where b.id = chapters.book_id and (b.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "chapters_delete" on public.chapters;
create policy "chapters_delete" on public.chapters
  for delete
  using (
    exists (select 1 from public.books b where b.id = chapters.book_id and (b.owner_id = auth.uid() or public.is_admin()))
  );

-- ---------------------------------------------------------------------
-- LESSONS (وابسته به مالکیت/دیده‌شدن کتاب والد از طریق فصل)
-- ---------------------------------------------------------------------
drop policy if exists "lessons_select" on public.lessons;
create policy "lessons_select" on public.lessons
  for select
  using (
    exists (
      select 1 from public.chapters c
      join public.books b on b.id = c.book_id
      where c.id = lessons.chapter_id
        and b.is_active = true
        and (b.owner_id is null or b.visibility = 'public' or b.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "lessons_insert" on public.lessons;
create policy "lessons_insert" on public.lessons
  for insert
  with check (
    exists (
      select 1 from public.chapters c join public.books b on b.id = c.book_id
      where c.id = lessons.chapter_id and (b.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "lessons_update" on public.lessons;
create policy "lessons_update" on public.lessons
  for update
  using (
    exists (
      select 1 from public.chapters c join public.books b on b.id = c.book_id
      where c.id = lessons.chapter_id and (b.owner_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.chapters c join public.books b on b.id = c.book_id
      where c.id = lessons.chapter_id and (b.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "lessons_delete" on public.lessons;
create policy "lessons_delete" on public.lessons
  for delete
  using (
    exists (
      select 1 from public.chapters c join public.books b on b.id = c.book_id
      where c.id = lessons.chapter_id and (b.owner_id = auth.uid() or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------
-- توجه‌ها:
-- 1) اگر روی جدول‌های books/chapters/lessons از قبل Policy دیگری با نام
--    متفاوت داری که دسترسی کامل به ادمین‌ها یا کاربران می‌دهد، ممکن است با
--    این‌ها هم‌پوشانی داشته باشد (Postgres همه‌ی Policyهای منطبق را OR می‌کند).
--    بهتر است لیست Policyهای فعلی را در Dashboard → Authentication → Policies
--    بررسی و موارد قدیمی/بیش‌ازحد بازِ نامرتبط را حذف کنی.
-- 2) اگر Storage buckets (audio, covers) هم RLS محدودکننده دارند، باید یک
--    Policy برای INSERT توسط auth.role() = 'authenticated' روی
--    storage.objects برای این باکت‌ها داشته باشی (احتمالاً از قبل برای پنل
--    ادمین همین‌طور تنظیم شده و نیازی به تغییر نیست).
-- =====================================================================
