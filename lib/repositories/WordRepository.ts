import { createClient } from "@/lib/supabase/client";
import { WORD_STATUS, type WordStatus } from "@/types/word";
import { normalizeWord } from "@/lib/normalizeWord";

const sb = createClient();

export class WordRepository {

  /** یک کلمه رو پیدا/می‌سازه و id عددی‌اش رو برمی‌گردونه (لازم فقط برای موارد تکی) */
  static async getOrCreateWordId(word: string): Promise<number> {
    const normalized = normalizeWord(word);
    if (!normalized) throw new Error("کلمه نامعتبر است");

    const { data: existing, error: findErr } = await sb
      .from("words").select("id").eq("word", normalized).maybeSingle();
    if (findErr) throw new Error("خطا در جستجوی کلمه: " + findErr.message);
    if (existing) return existing.id;

    const { data: created, error: createErr } = await sb
      .from("words").upsert({ word: normalized }, { onConflict: "word" })
      .select("id").single();
    if (createErr || !created) throw new Error("امکان ثبت کلمه نبود: " + (createErr?.message ?? ""));
    return created.id;
  }

  /**
   * نسخه‌ی دسته‌ای — به‌جای N بار رفت‌وبرگشت به سرور، همه‌ی کلمات یک متن
   * (مثلاً کل زیرنویس SRT) رو در یک درخواست resolve می‌کنه.
   * خروجی: Map از کلمه‌ی نرمال‌شده به id عددی‌اش.
   */
  static async batchGetOrCreateWordIds(words: string[]): Promise<Map<string, number>> {
    const unique = [...new Set(words.map(normalizeWord).filter(Boolean))];
    if (!unique.length) return new Map();

    const CHUNK = 500;
    const result = new Map<string, number>();
    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK);
      const { data, error } = await sb
        .from("words")
        .upsert(chunk.map(w => ({ word: w })), { onConflict: "word" })
        .select("id,word");
      if (error) throw new Error("خطا در ثبت دسته‌ای کلمات: " + error.message);
      (data ?? []).forEach(r => result.set(r.word, r.id));
    }
    return result;
  }

  static async setStatus(userId: string, wordId: number, lessonId: string, status: WordStatus) {
    return sb.from("user_word_status").upsert(
      { user_id: userId, word_id: wordId, lesson_id: lessonId, status, last_seen_at: new Date().toISOString() },
      { onConflict: "user_id,word_id" }
    );
  }

  static async markLearning(userId: string, wordId: number, lessonId: string) {
    return this.setStatus(userId, wordId, lessonId, WORD_STATUS.LEARNING);
  }

  static async markKnown(userId: string, wordId: number, lessonId: string) {
    return sb.from("user_word_status").upsert(
      { user_id: userId, word_id: wordId, lesson_id: lessonId, status: WORD_STATUS.KNOWN,
        known_at: new Date().toISOString(), last_seen_at: new Date().toISOString() },
      { onConflict: "user_id,word_id" }
    );
  }

  static async markMastered(userId: string, wordId: number, lessonId: string) {
    return sb.from("user_word_status").upsert(
      { user_id: userId, word_id: wordId, lesson_id: lessonId, status: WORD_STATUS.MASTERED,
        last_seen_at: new Date().toISOString() },
      { onConflict: "user_id,word_id" }
    );
  }

  /** حذف وضعیت (وقتی کاربر کلمه رو از "در حال یادگیری" خارج می‌کنه → برمی‌گرده به NEW ضمنی) */
  static async clearStatus(userId: string, wordId: number) {
    return sb.from("user_word_status").delete().eq("user_id", userId).eq("word_id", wordId);
  }
}
