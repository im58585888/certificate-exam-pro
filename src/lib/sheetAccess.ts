// Who can use the study sheet (it's part of the exam pass), shared by server pages and client components.

export type SheetAccess = "ok" | "no-pass" | "signed-out";

/** Where to send someone who can't use the study sheet yet: sign-up first, then the pass. */
export const upsellHref = (access: SheetAccess) => (access === "signed-out" ? "/register?next=/pricing" : "/pricing");
