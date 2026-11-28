import Link from "next/link";
import { getUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { FREE_TRIAL_QUESTIONS } from "@/lib/exams";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NavGlyph, NavMenu, type NavItem } from "./NavMenu";
import styles from "./SiteHeader.module.css";

// Three things in the header: the "AI tutor" menu (everything you study with), Pricing, and signing in or out. Admins
// also get Admin. On phones the same items sit in one menu, the AI tutor group first.

export async function SiteHeader() {
  const user = await getUser();
  const tutor: NavItem[] = user
    ? [
      { href: "/practice", title: "Practice", note: "Practice sets and mock exams", icon: "practice" },
      { href: "/study", title: "Study sheet", note: "Your mistakes by AWS service", icon: "study" },
      { href: "/aws", title: "Cheat sheets", note: "AWS services and comparisons", icon: "sheets" },
      { href: "/dashboard", title: "Dashboard", note: "Scores, progress and streak", icon: "dashboard" },
      { href: "/account", title: "Account", note: "Your passes, email and password", icon: "account", divider: true },
    ]
    : [
      { href: "/practice", title: "Practice", note: `Free trial: ${FREE_TRIAL_QUESTIONS} questions per exam`, icon: "practice" },
      { href: "/aws", title: "Cheat sheets", note: "AWS services and comparisons", icon: "sheets" },
    ];

  const rest = (
    <>
      <Link href="/pricing">Pricing</Link>
      {user ? (
        <>
          {isAdmin(user) && <Link href="/admin">Admin</Link>}
          <form action={logoutAction}><button>Log out</button></form>
        </>
      ) : (
        <>
          <Link href="/login">Sign in</Link>
          <Link className={styles.signup} href="/practice">Try free</Link>
        </>
      )}
    </>
  );

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" aria-label="Certificate Exam Pro home"><Logo size={28} /></Link>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          <NavMenu label="AI tutor" items={tutor} className={styles.tutor} panelClassName={styles.panel} />
          {rest}
        </nav>
        <MobileMenu className={styles.mobileMenu}>
          <p className={styles.group}>AI tutor</p>
          {tutor.map((i) => <Link key={i.href} href={i.href} className={styles.mobileItem}><NavGlyph icon={i.icon} />{i.title}</Link>)}
          <hr className={styles.rule} />
          {rest}
        </MobileMenu>
      </div>
    </header>
  );
}
