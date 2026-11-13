"use client";

import { useFormStatus } from "react-dom";
import { startQuizAction } from "@/app/actions";
import styles from "@/app/landing.module.css";

function StartButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return <button className={styles.primaryButton} disabled={pending}>{pending ? "Starting your trial…" : `Try ${count} questions free`}<span aria-hidden="true">↗</span></button>;
}

export function TrialPicker({ exams, count }: { exams: { slug: string; name: string; code: string }[]; count: number }) {
  return <form action={startQuizAction} className={styles.trialPicker}><input type="hidden" name="mode" value="trial" /><label htmlFor="hero-exam">Choose your AWS exam</label><div className={styles.trialControls}><select id="hero-exam" name="exam" defaultValue={exams[0]?.slug}>{exams.map((exam) => <option key={exam.slug} value={exam.slug}>{exam.name} · {exam.code}</option>)}</select><StartButton count={count} /></div><p>No account or payment card needed.</p></form>;
}
