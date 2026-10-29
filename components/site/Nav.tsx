import Link from "next/link";
import type { Viewer } from "@/lib/auth";
import { initials } from "@/lib/names";
import { SignOutButton } from "./SignOutButton";
import { Wordmark } from "./Wordmark";

export { Wordmark };

export function Nav({ viewer }: { viewer: Viewer }) {
  return (
    <header className="nav">
      <div className="container nav-in">
        <Wordmark />
        <nav className="nav-links" aria-label="Sections">
          <a href="#who">Who We Are</a>
          <a href="#pillars">The Four Pillars</a>
          <a href="#money">The Money</a>
          <a href="#markets">Markets</a>
          <a href="#calculator">Calculator</a>
          <a href="#join">Join</a>
        </nav>
        <div className="nav-right">
          {viewer ? (
            <details className="usermenu">
              <summary className="avatar" aria-label="Account menu">{initials(viewer.fullName || viewer.email)}</summary>
              <div className="menu">
                <div className="who">{viewer.email}<br />{viewer.role === "owner" ? "Owner" : "Rep"}</div>
                {viewer.role === "owner" && <Link href="/dashboard">Owner dashboard</Link>}
                <Link href="/plan">My plan</Link>
                <SignOutButton />
              </div>
            </details>
          ) : (
            <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
          )}
          <a href="#join" className="btn btn-primary btn-sm">Apply</a>
        </div>
      </div>
    </header>
  );
}
