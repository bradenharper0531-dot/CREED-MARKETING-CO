import Link from "next/link";
import type { Viewer } from "@/lib/auth";
import { initials } from "@/lib/names";
import { Wordmark } from "@/components/site/Wordmark";
import { SignOutButton } from "@/components/site/SignOutButton";
import { NavLinks } from "./NavLinks";

export function Shell({ viewer, links, children }: {
  viewer: NonNullable<Viewer>;
  links: { href: string; label: string; exact?: boolean }[];
  children: React.ReactNode;
}) {
  return (
    <div className="app">
      <aside className="side">
        <Wordmark />
        <NavLinks links={links} />
        <div className="bottom">
          <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
            <span className="avatar">{initials(viewer.fullName || viewer.email)}</span>
            <div style={{ minWidth: 0, display: "none" }} className="who-desk">
              <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{viewer.fullName}</div>
              <div className="muted mono" style={{ fontSize: 11 }}>{viewer.role.toUpperCase()}</div>
            </div>
          </div>
          <Link href="/" className="btn btn-sm">Public site</Link>
          <SignOutButton className="btn btn-sm" />
        </div>
      </aside>
      <main className="main">{children}</main>
      <style>{`@media (min-width:960px){.who-desk{display:block!important}}`}</style>
    </div>
  );
}
