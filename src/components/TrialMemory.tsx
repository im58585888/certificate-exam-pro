"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Keeps the "free trial used" marker (cookie cep_trials, set by the server when a trial starts) backed up in local
// storage, and restores the cookie from it if only cookies were cleared. Holds exam ids only, nothing personal.

const COOKIE = "cep_trials";
const KEY = "cep:trials";
const valid = (s: string) => /^[a-z0-9-]{3,20}$/.test(s);

export function TrialMemory() {
  const path = usePathname(); // re-sync after each navigation (a trial starts on a client-side redirect)
  useEffect(() => {
    try {
      const raw = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? "";
      const fromCookie = decodeURIComponent(raw).split(",").filter(valid);
      const stored = (localStorage.getItem(KEY) ?? "").split(",").filter(valid);
      const all = [...new Set([...fromCookie, ...stored])].sort();
      if (!all.length) return;
      const joined = all.join(",");
      if (joined !== [...stored].sort().join(",")) localStorage.setItem(KEY, joined);
      if (joined !== [...fromCookie].sort().join(",")) {
        document.cookie = `${COOKIE}=${encodeURIComponent(joined)}; path=/; max-age=${400 * 86400}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
      }
    } catch {
      // Storage blocked (private mode, strict settings): the server-side checks still apply.
    }
  }, [path]);
  return null;
}
