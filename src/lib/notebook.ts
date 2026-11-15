import "server-only";
import { query } from "./db";

// The learner's own layer on top of the auto-built study sheet: saved tutor content ("clips"), notes,
// custom sections, and auto concept cards they've hidden.

export interface StudyItem {
  id: number;
  kind: "clip" | "note";
  topic: string | null;
  domain: string | null;
  section_id: number | null;
  title: string | null;
  body: string;
  source_question: string | null;
  created_at: Date;
}

export interface StudySection {
  id: number;
  name: string;
}

export interface Notebook {
  items: StudyItem[];
  sections: StudySection[];
  hidden: Set<string>;
}

export async function loadNotebook(userId: string, exam: string): Promise<Notebook> {
  const [items, sections, hidden] = await Promise.all([
    query<StudyItem>(
      `select id, kind, topic, domain, section_id, title, body, source_question, created_at from study_items
       where user_id = $1 and exam = $2 and deleted_at is null order by created_at`,
      [userId, exam],
    ),
    query<StudySection>(`select id, name from study_sections where user_id = $1 and exam = $2 order by created_at`, [userId, exam]),
    query<{ topic: string }>(`select topic from study_hidden_cards where user_id = $1 and exam = $2`, [userId, exam]),
  ]);
  return { items, sections, hidden: new Set(hidden.map((h) => h.topic)) };
}
