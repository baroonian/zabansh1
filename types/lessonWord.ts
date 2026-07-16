import { WordStatus } from "./words";

export interface LessonWord {

  id: number;

  text: string;

  normalized: string;

  word_id: number;

  translation?: string;

  status?: WordStatus;

}