"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Inner({ links }: { links: { href: string; label: string; exact?: boolean }[] }) {
  const path = usePathname();
  const qs = useSearchParams().toString();
  return (
    <nav aria-label="App">
      {links.map((l) => {
        const active = l.exact ? path === l.href : path === l.href || path.startsWith(l.href + "/");
        // keep the global dashboard filters when moving between dashboard pages
        const keep = l.href.startsWith("/dashboard") && qs && !l.href.includes("settings") ? `?${qs}` : "";
        return <Link key={l.href} href={l.href + keep} className={active ? "active" : ""}>{l.label}</Link>;
      })}
    </nav>
  );
}

export function NavLinks(props: { links: { href: string; label: string; exact?: boolean }[] }) {
  return <Suspense><Inner {...props} /></Suspense>;
}
