import "server-only";
import { query } from "./db";

// The learner's own layer on top of the auto-built study sheet: saved tutor content ("clips"), notes,
// their own topics (study_sections), and per-topic choices (pinned, hidden, added).

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

export interface TopicPref {
  topic: string;
  pinned: boolean;
  hidden: boolean;
  added: boolean;
}

export interface Notebook {
  items: StudyItem[];
  sections: StudySection[];
  prefs: Map<string, TopicPref>;
}

export const EMPTY_NOTEBOOK: Notebook = { items: [], sections: [], prefs: new Map() };

export async function loadNotebook(userId: string, exam: string): Promise<Notebook> {
  const [items, sections, prefs] = await Promise.all([
    query<StudyItem>(
      `select id, kind, topic, domain, section_id, title, body, source_question, created_at from study_items
       where user_id = $1 and exam = $2 and deleted_at is null order by created_at`,
      [userId, exam],
    ),
    query<StudySection>(`select id, name from study_sections where user_id = $1 and exam = $2 order by created_at`, [userId, exam]),
    query<TopicPref>(`select topic, pinned, hidden, added from study_topic_prefs where user_id = $1 and exam = $2`, [userId, exam]),
  ]);
  return { items, sections, prefs: new Map(prefs.map((p) => [p.topic, p])) };
}
