import Link from "next/link";
import { QuestionEditor } from "@/components/QuestionEditor";
import { requireAdmin } from "@/lib/auth";

const TEMPLATE = {
  id: "saa-custom-001",
  domain: "secure",
  topic: "IAM",
  tags: [],
  difficulty: "medium",
  type: "single",
  stem: "Describe the company, its current setup, and the constraint that matters.",
  prompt: "Which solution meets these requirements?",
  options: [
    { key: "A", text: "Correct option", correct: true, why: "Explain why this satisfies every requirement in the scenario." },
    { key: "B", text: "Distractor", correct: false, why: "Explain the specific trap: why this looks plausible but fails a requirement." },
    { key: "C", text: "Distractor", correct: false, why: "Explain the specific trap: why this looks plausible but fails a requirement." },
    { key: "D", text: "Distractor", correct: false, why: "Explain the specific trap: why this looks plausible but fails a requirement." },
  ],
  explanation: {
    answer: "Why the correct answer is right, in terms of the scenario's requirements.",
    concept: "The underlying concept a learner should take away.",
    examTip: "The keyword pattern that signals this answer on the exam.",
    references: [{ title: "Relevant AWS documentation page", url: "https://docs.aws.amazon.com/" }],
  },
};

export default async function NewQuestion() {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <Link href="/admin/questions" className="text-sm font-bold text-brand">← All questions</Link>
      <section className="card p-5">
        <h2 className="text-xl font-extrabold">New question</h2>
        <p className="mb-3 text-sm text-muted">Use a unique id (for example saa-custom-002). Multi-select questions need &quot;type&quot;: &quot;multi&quot;, &quot;selectCount&quot;: 2, five or more options, and &quot;(Select TWO.)&quot; in the prompt.</p>
        <QuestionEditor mode="new" exam="saa-c03" initialJson={JSON.stringify(TEMPLATE, null, 2)} />
      </section>
    </div>
  );
}
