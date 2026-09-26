import Link from "next/link";
import { getUser, isAdmin } from "@/lib/auth";
import { getAccess } from "@/lib/billing";
import { logoutAction } from "@/app/actions";
import { Logo } from "./Logo";

export async function SiteHeader() {
  const user = await getUser();
  const access = await getAccess(user?.id);
  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" aria-label="Certificate Exam Pro home"><Logo /></Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm font-semibold text-soft">
          <Link className="rounded-lg px-3 py-2 hover:text-ink" href="/practice/saa-c03">Practice</Link>
          {user && <Link className="rounded-lg px-3 py-2 hover:text-ink" href="/dashboard">Dashboard</Link>}
          {(!access.active || access.admin) && <Link className="rounded-lg px-3 py-2 hover:text-ink" href="/pricing">Pricing</Link>}
          {user ? (
            <>
              {isAdmin(user) && <Link className="rounded-lg px-3 py-2 font-bold text-brand hover:text-ink" href="/admin">Admin</Link>}
              <Link className="rounded-lg px-3 py-2 hover:text-ink" href="/account">Account</Link>
              <form action={logoutAction}><button className="rounded-lg px-3 py-2 hover:text-ink">Log out</button></form>
            </>
          ) : (
            <>
              <Link className="rounded-lg px-3 py-2 hover:text-ink" href="/login">Log in</Link>
              <Link className="btn-primary ml-1 !px-4 !py-2" href="/register">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
