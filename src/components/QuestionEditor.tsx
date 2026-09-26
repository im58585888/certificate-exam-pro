"use client";

import { useActionState } from "react";
import { saveQuestionAction, type SaveState } from "@/app/admin/actions";

export function QuestionEditor({ mode, exam, originalId, initialJson }: { mode: "edit" | "new"; exam: string; originalId?: string; initialJson: string }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveQuestionAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="exam" value={exam} />
      {originalId && <input type="hidden" name="originalId" value={originalId} />}
      <textarea
        name="json"
        defaultValue={initialJson}
        spellCheck={false}
        className="input min-h-[520px] font-mono text-xs leading-relaxed"
        aria-label="Question JSON"
      />
      {state.errors && state.errors.length > 0 && (
        <ul className="list-disc space-y-1 rounded-xl bg-bad-soft px-8 py-3 text-sm text-bad" role="alert">
          {state.errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      {state.saved && <p className="rounded-xl bg-ok-soft px-4 py-2 text-sm font-semibold text-ok">Saved. Learners will see the change within about 30 seconds.</p>}
      <button className="btn-primary" disabled={pending}>{pending ? "Validating…" : mode === "new" ? "Create question" : "Save changes"}</button>
      <p className="text-xs text-muted">Changes are validated with the same rules as the question bank checker. Keep the correct option(s) marked with &quot;correct&quot;: true, and give every option a &quot;why&quot;.</p>
    </form>
  );
}
