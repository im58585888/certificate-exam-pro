"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

// Sends one anonymous page-view beacon per page. No cookies or storage; honors Global Privacy Control and Do Not Track,
// and skips automated browsers.
export function Tracker() {
  const path = usePathname();
  const params = useSearchParams();
  const first = useRef(true);

  useEffect(() => {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.globalPrivacyControl || nav.doNotTrack === "1") return;
    // Automated browsers (scanners, uptime checks, test tools) aren't visitors.
    if (nav.webdriver) return;
    const get = (k: string) => params.get(k) ?? undefined;
    const clickId = ["fbclid", "gclid", "rdt_cid"].find((k) => params.has(k));
    const body = JSON.stringify({
      path,
      // The outside referrer only describes how the visit began, so send it with the first page only.
      referrer: first.current ? document.referrer : undefined,
      utm: { source: get("utm_source"), medium: get("utm_medium"), campaign: get("utm_campaign"), content: get("utm_content") },
      clickId,
      width: window.innerWidth,
    });
    first.current = false;
    fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
  }, [path, params]);

  return null;
}
