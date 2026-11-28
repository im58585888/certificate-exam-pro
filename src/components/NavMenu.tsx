"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export type NavIcon = "practice" | "study" | "sheets" | "dashboard" | "account";
export interface NavItem { href: string; title: string; note: string; icon: NavIcon; divider?: boolean }

const PATHS: Record<NavIcon, string> = {
  practice: "M8 5.5v13l10.5-6.5L8 5.5Z",
  study: "M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3v-12Zm0 12a3 3 0 0 1 3-3h11M9 8.5h6",
  sheets: "M7 3.5h7l4 4v13H7v-17Zm7 0v4h4M10 12h5M10 15.5h5",
  dashboard: "M5 19.5V11M10 19.5V5M15 19.5v-6M20 19.5V8",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8.5c.8-3.4 3.6-5.5 7-5.5s6.2 2.1 7 5.5",
};

export function NavGlyph({ icon }: { icon: NavIcon }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[icon]} />
    </svg>
  );
}

/** The header's "AI tutor" dropdown. Opens on click or tap; closes on an outside click, Esc, leaving it, or choosing an item. */
export function NavMenu({ label, items, className, panelClassName }: { label: string; items: NavItem[]; className: string; panelClassName: string }) {
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && menu.current && !menu.current.contains(event.target)) menu.current.open = false;
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  return (
    <details
      ref={menu}
      className={className}
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("a") && menu.current) menu.current.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current?.open) {
          menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        }
      }}
      onBlur={(event) => {
        if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget) && menu.current) menu.current.open = false;
      }}
    >
      <summary>{label}<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></summary>
      <div className={panelClassName}>
        {items.map((i) => (
          <div key={i.href}>
            {i.divider && <hr />}
            <Link href={i.href}>
              <NavGlyph icon={i.icon} />
              <span><b>{i.title}</b><small>{i.note}</small></span>
            </Link>
          </div>
        ))}
      </div>
    </details>
  );
}
