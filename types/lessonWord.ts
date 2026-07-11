import { WordStatus } from "./word";

export interface LessonWord {

  id: number;

  text: string;

  normalized: string;

  word_id: number;

  translation?: string;

  status?: WordStatus;

}