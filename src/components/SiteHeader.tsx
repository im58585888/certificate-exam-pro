import Link from "next/link";
import { getUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import styles from "./SiteHeader.module.css";

export async function SiteHeader() {
  const user = await getUser();
  const navigation = (
    <>
      <Link href="/practice">Practice</Link>
      <Link href="/study">Study sheet</Link>
      <Link href="/aws">Cheat sheets</Link>
      {user && <Link href="/dashboard">Dashboard</Link>}
      <Link href="/pricing">Pricing</Link>
      {user ? (
        <>
          {isAdmin(user) && <Link href="/admin">Admin</Link>}
          <Link href="/account">Account</Link>
          <form action={logoutAction}><button>Log out</button></form>
        </>
      ) : (
        <>
          <Link href="/login">Log in</Link>
          <Link className={styles.signup} href="/register">Sign up</Link>
        </>
      )}
    </>
  );
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" aria-label="Certificate Exam Pro home"><Logo size={28} /></Link>
        <nav className={styles.desktopNav} aria-label="Main navigation">{navigation}</nav>
        <MobileMenu className={styles.mobileMenu}>{navigation}</MobileMenu>
      </div>
    </header>
  );
}
