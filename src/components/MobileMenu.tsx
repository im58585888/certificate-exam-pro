"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function MobileMenu({ children, className }: { children: ReactNode; className: string }) {
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && menu.current && !menu.current.contains(event.target)) {
        menu.current.open = false;
      }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  return (
    <details
      ref={menu}
      className={className}
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("a, button") && menu.current) menu.current.open = false;
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
      <summary>Menu <span aria-hidden="true">+</span></summary>
      <nav aria-label="Mobile navigation">{children}</nav>
    </details>
  );
}
