"use client";

import { useState, useTransition } from "react";
import { reportQuestionAction } from "@/app/actions";
import { REPORT_REASONS, type ReportReason } from "@/lib/reports";

export function ReportQuestion({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | string>("idle");
  const [pending, start] = useTransition();

  if (status === "sent") return <p className="mt-4 text-sm font-semibold text-ok">Thanks. We review every report within 48 hours, and fixes are listed on the <a href="/changelog" className="underline">What changed</a> page.</p>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-4 text-sm font-semibold text-muted underline-offset-2 hover:text-ink hover:underline">
        Report a problem with this question · reviewed within 48 hours
      </button>
    );
  }
  return (
    <form
      className="mt-4 space-y-2 rounded-xl border border-line p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await reportQuestionAction(questionId, reason, message);
          setStatus(res.ok ? "sent" : res.error ?? "Something went wrong.");
        });
      }}
    >
      <p className="text-sm font-bold">What&apos;s wrong with this question?</p>
      <select className="input" value={reason} onChange={(e) => setReason(e.target.value as ReportReason)} required aria-label="Reason">
        <option value="" disabled>Choose a reason…</option>
        {Object.entries(REPORT_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <textarea className="input min-h-20" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000}
        placeholder="Optional: tell us more (links to AWS docs help)." aria-label="Details" />
      {status !== "idle" && <p className="text-sm font-semibold text-bad">{status}</p>}
      <div className="flex gap-2">
        <button className="btn-primary !py-2" disabled={!reason || pending}>{pending ? "Sending…" : "Send report"}</button>
        <button type="button" className="btn-ghost !py-2" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
