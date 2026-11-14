/** Topics on the contact form; the key is stored, the label is shown. */
export const CONTACT_TOPICS = {
  question: "Question about an exam or a practice question",
  account: "Account or sign-in",
  pass: "Pass, pricing or refund",
  bug: "Something isn't working",
  idea: "Feedback or feature idea",
  other: "Something else",
} as const;

export type ContactTopic = keyof typeof CONTACT_TOPICS;
export const isContactTopic = (t: string): t is ContactTopic => t in CONTACT_TOPICS;
