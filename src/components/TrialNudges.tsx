"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { MiaPose } from "./Mia";

// Free-trial pop-ups: a sign-up nudge after question 2, then (if they skip it) the half-price offer after question 3.
// Each shows once per visitor; the offer also appears on the end-of-trial screen.

export interface TrialOffer {
  exam: string;
  examCode: string;
  percent: number;
  price: string;
  fullPrice: string;
  /** Passes aren't on sale yet: claiming reserves the price for launch. */
  reserve: boolean;
  hours: number;
  /** False once this person has had their one offer, or already has a pass. */
  eligible: boolean;
  google: boolean;
}

const KEY = (k: string) => `cep:nudge:${k}`;
export const nudgeSeen = (k: "signup" | "offer") => { try { return localStorage.getItem(KEY(k)) === "1"; } catch { return false; } };
export const markNudgeSeen = (k: "signup" | "offer") => { try { localStorage.setItem(KEY(k), "1"); } catch { /* storage blocked */ } };

function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} tabIndex={-1} className="card relative w-full max-w-md p-6 text-center outline-none">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2">✕</button>
        {children}
      </div>
    </div>
  );
}

/** After question 2: create a free account so Mia remembers your progress. */
export function SignupNudge({ answered, correct, back, google, onClose }: { answered: number; correct: number; back: string; google: boolean; onClose: () => void }) {
  const next = encodeURIComponent(back);
  const title = correct === answered ? `Nice work, you're ${correct} for ${answered}!` : correct ? `${correct} for ${answered}, nicely done!` : `${answered} down, and that's how you learn!`;
  return (
    <Modal label="Create a free account" onClose={onClose}>
      <MiaPose pose="welcoming" height={120} className="mx-auto" />
      <h2 className="mt-2 text-xl font-extrabold">{title}</h2>
      <p className="mt-1 text-sm text-soft">Create a free account so I can remember your progress, your weak spots and everything you&apos;ve learned. Your answers so far come with you.</p>
      <div className="mt-5 flex flex-col gap-2">
        {google && <a className="btn-primary !py-3" href={`/api/auth/google?next=${next}`}>Continue with Google</a>}
        <Link className={google ? "btn-ghost !py-2.5" : "btn-primary !py-3"} href={`/register?next=${next}`}>Sign up with email</Link>
        <button type="button" className="mt-1 text-sm font-semibold text-muted hover:text-ink" onClick={onClose}>Maybe later</button>
      </div>
    </Modal>
  );
}

/** The half-price offer: links to /offer/claim, which signs them up first if needed. */
export function OfferCard({ offer, signedIn, compact }: { offer: TrialOffer; signedIn: boolean; compact?: boolean }) {
  return (
    <div className={compact ? "" : "mt-1"}>
      <span className="pill bg-ok-soft text-ok">Trial offer · {offer.percent}% off</span>
      <h2 className="mt-2 text-xl font-extrabold">Keep going with Mia for half price</h2>
      <p className="mt-2"><span className="text-3xl font-extrabold">{offer.price}</span> <span className="ml-1 text-muted line-through">{offer.fullPrice}</span></p>
      <ul className="mx-auto mt-3 max-w-xs space-y-1 text-left text-sm text-soft">
        <li>✓ 30 days of unlimited {offer.examCode} practice</li>
        <li>✓ Mia on every question, mock exams, study sheet</li>
        <li>✓ One payment, no auto-renewal</li>
      </ul>
      <a className="btn-primary mt-4 w-full !py-3" href={`/offer/claim?exam=${offer.exam}`}>{offer.reserve ? `Reserve ${offer.percent}% off` : `Claim ${offer.percent}% off`}</a>
      <p className="mt-2 text-xs text-muted">
        {offer.reserve
          ? "Passes launch soon. We'll email you, and this price is held for you."
          : `Your price is held for ${offer.hours / 24} days after you claim it.`}
        {!signedIn && " A free account keeps the discount yours."}
      </p>
    </div>
  );
}

/** After question 3 (if they skipped signing up): the half-price offer. */
export function OfferNudge({ offer, signedIn, onClose }: { offer: TrialOffer; signedIn: boolean; onClose: () => void }) {
  return (
    <Modal label={`${offer.percent}% off the ${offer.examCode} pass`} onClose={onClose}>
      <OfferCard offer={offer} signedIn={signedIn} />
      <button type="button" className="mt-3 text-sm font-semibold text-muted hover:text-ink" onClick={onClose}>No thanks, continue my free questions</button>
    </Modal>
  );
}
