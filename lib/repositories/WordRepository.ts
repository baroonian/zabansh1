import { createClient } from "@/lib/supabase/client";
import { WORD_STATUS, type WordStatus } from "@/types/word";

const sb = createClient();

export class WordRepository {

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
        {
          onConflict: "user_id,word_id",
        }
      );

  }

  static async markLearning(
    userId:string,
    wordId:number,
    lessonId:string
  ){

    return this.setStatus(
      userId,
      wordId,
      lessonId,
      WORD_STATUS.LEARNING
    );

  }

  static async markKnown(
    userId:string,
    wordId:number,
    lessonId:string
  ){

    return sb
      .from("user_word_status")
      .upsert(
        {
          user_id:userId,
          word_id:wordId,
          lesson_id:lessonId,

          status:WORD_STATUS.KNOWN,

          known_at:new Date().toISOString(),

          last_seen_at:new Date().toISOString()

        },
        {
          onConflict:"user_id,word_id"
        }
      );

  }

  static async markMastered(
    userId:string,
    wordId:number,
    lessonId:string
  ){

    return sb
      .from("user_word_status")
      .upsert(
        {
          user_id:userId,
          word_id:wordId,
          lesson_id:lessonId,

          status:WORD_STATUS.MASTERED,

          review_count:1,

          last_seen_at:new Date().toISOString()

        },
        {
          onConflict:"user_id,word_id"
        }
      );

  }

}