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
      .from("words").insert({ word: normalized }).select("id").single();

    if (!createErr && created) return created.id;

    // race condition: کاربر دیگه‌ای هم‌زمان همین کلمه رو ساخته (unique constraint) — دوباره بخون
    const { data: retry } = await sb.from("words").select("id").eq("word", normalized).maybeSingle();
    if (retry) return retry.id;

    throw new Error("امکان ثبت کلمه نبود: " + (createErr?.message ?? ""));
  }

  /**
   * نسخه‌ی دسته‌ای — به‌جای N بار رفت‌وبرگشت به سرور، همه‌ی کلمات یک متن
   * (مثلاً کل زیرنویس SRT) رو در حداقل درخواست resolve می‌کنه.
   * عمداً از upsert استفاده نمی‌کنیم: upsert روی تداخل یک UPDATE واقعی
   * انجام می‌ده که policy جدول words نداره (فقط INSERT مجازه) و باعث
   * fail شدن کل batch می‌شه. به‌جاش: اول SELECT، بعد فقط INSERT موارد جدید.
   */
  static async batchGetOrCreateWordIds(words: string[]): Promise<Map<string, number>> {
    const unique = [...new Set(words.map(normalizeWord).filter(Boolean))];
    if (!unique.length) return new Map();

    const CHUNK = 500;
    const result = new Map<string, number>();
    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK);

      const { data: existing } = await sb.from("words").select("id,word").in("word", chunk);
      (existing ?? []).forEach(r => result.set(r.word, r.id));

      const newWords = chunk.filter(w => !result.has(w));
      if (newWords.length) {
        const { data: inserted, error } = await sb
          .from("words")
          .insert(newWords.map(w => ({ word: w })))
          .select("id,word");
        if (!error) {
          (inserted ?? []).forEach(r => result.set(r.word, r.id));
        } else {
          // race condition احتمالی (کاربر دیگه هم‌زمان همون کلمه رو ساخته) — دوباره بخون
          const { data: retry } = await sb.from("words").select("id,word").in("word", newWords);
          (retry ?? []).forEach(r => result.set(r.word, r.id));
        }
      }
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

  // ================================================================
  // صفحه‌ی مرور کلمات در حال یادگیری
  // ================================================================

  /** لیست کامل کلمات در حال یادگیری کاربر، به همراه ترجمه (اگه ثبت شده باشه) */
  static async getLearningWords(userId: string): Promise<{
    wordId: number; word: string; translation: string | null; reviewCount: number
  }[]> {
    const { data, error } = await sb
      .from("user_word_status")
      .select("word_id, review_count, words(word, translation)")
      .eq("user_id", userId)
      .eq("status", WORD_STATUS.LEARNING)
      .order("last_seen_at", { ascending: false });

    if (error) throw new Error("خطا در دریافت لیست کلمات: " + error.message);

    return (data ?? []).map((r: any) => ({
      wordId: r.word_id,
      word: r.words?.word ?? "",
      translation: r.words?.translation ?? null,
      reviewCount: r.review_count ?? 0,
    }));
  }

  /** ثبت/ویرایش ترجمه‌ی یک کلمه در دیکشنری سراسری */
  static async updateTranslation(wordId: number, translation: string) {
    return sb.from("words").update({ translation }).eq("id", wordId);
  }

  /**
   * ثبت نتیجه‌ی مرور یک کلمه در صفحه‌ی «کلمات در حال یادگیری».
   * - آسان   → وضعیت به known تغییر می‌کنه و از لیست یادگیری خارج میشه
   * - متوسط/دشوار → فقط شمارنده‌ها آپدیت میشن، کلمه در لیست یادگیری می‌مونه
   * توجه: عمداً lesson_id رو دست نمی‌زنیم (این صفحه به یک درس خاص وابسته نیست)
   */
  static async reviewWord(userId: string, wordId: number, rating: 'easy' | 'medium' | 'hard') {
    const { data: current } = await sb
      .from("user_word_status")
      .select("review_count,correct_count,incorrect_count")
      .eq("user_id", userId).eq("word_id", wordId).maybeSingle();

    const review_count    = (current?.review_count ?? 0) + 1;
    const correct_count   = (current?.correct_count ?? 0) + (rating === 'easy' ? 1 : 0);
    const incorrect_count = (current?.incorrect_count ?? 0) + (rating === 'hard' ? 1 : 0);

    if (rating === 'easy') {
      return sb.from("user_word_status").update({
        status: WORD_STATUS.KNOWN,
        known_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        review_count, correct_count, incorrect_count,
      }).eq("user_id", userId).eq("word_id", wordId);
    }

    return sb.from("user_word_status").update({
      last_seen_at: new Date().toISOString(),
      review_count, correct_count, incorrect_count,
    }).eq("user_id", userId).eq("word_id", wordId);
  }
}
