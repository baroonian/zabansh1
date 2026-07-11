import { createClient } from "@/lib/supabase/client";
import { WORD_STATUS, type WordStatus } from "@/types/word";
import { normalizeWord } from "@/lib/normalizeWord";

const sb = createClient();

export class WordRepository {

  /**
   * پیدا کردن یا ساختن کلمه در دیکشنری سراسری (جدول words) و
   * برگردوندن id عددی‌اش. بدون این تابع، هیچ راهی برای گرفتن
   * word_id لازم برای ثبت وضعیت کاربر وجود نداشت.
   */
  static async getOrCreateWordId(word: string): Promise<number> {
    const normalized = normalizeWord(word);
    if (!normalized) throw new Error("کلمه نامعتبر است");

    const { data: existing, error: findErr } = await sb
      .from("words")
      .select("id")
      .eq("word", normalized)
      .maybeSingle();

    if (findErr) throw new Error("خطا در جستجوی کلمه: " + findErr.message);
    if (existing) return existing.id;

    const { data: created, error: createErr } = await sb
      .from("words")
      .upsert({ word: normalized }, { onConflict: "word" })
      .select("id")
      .single();

    if (createErr || !created) {
      throw new Error("امکان ثبت کلمه در دیکشنری نبود: " + (createErr?.message ?? ""));
    }
    return created.id;
  }

  static async setStatus(
    userId: string,
    wordId: number,
    lessonId: string,
    status: WordStatus
  ) {
    return sb
      .from("user_word_status")
      .upsert(
        {
          user_id: userId,
          word_id: wordId,
          lesson_id: lessonId,
          status,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id,word_id" }
      );
  }

  static async markLearning(userId: string, wordId: number, lessonId: string) {
    return this.setStatus(userId, wordId, lessonId, WORD_STATUS.LEARNING);
  }

  static async markKnown(userId: string, wordId: number, lessonId: string) {
    return sb
      .from("user_word_status")
      .upsert(
        {
          user_id: userId,
          word_id: wordId,
          lesson_id: lessonId,
          status: WORD_STATUS.KNOWN,
          known_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id,word_id" }
      );
  }

  static async markMastered(userId: string, wordId: number, lessonId: string) {
    return sb
      .from("user_word_status")
      .upsert(
        {
          user_id: userId,
          word_id: wordId,
          lesson_id: lessonId,
          status: WORD_STATUS.MASTERED,
          review_count: 1,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id,word_id" }
      );
  }

  /** حذف وضعیت (وقتی کاربر کلمه‌ای رو از "در حال یادگیری" خارج می‌کنه) */
  static async clearStatus(userId: string, wordId: number) {
    return sb
      .from("user_word_status")
      .delete()
      .eq("user_id", userId)
      .eq("word_id", wordId);
  }
}
