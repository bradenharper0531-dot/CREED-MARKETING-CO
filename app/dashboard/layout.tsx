import { requireOwner } from "@/lib/auth";
import { Shell } from "@/components/app/Shell";

export const dynamic = "force-dynamic";

/** Every page under /dashboard is OWNER-only. Reps are redirected to /plan. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireOwner();
  return (
    <Shell
      viewer={viewer}
      links={[
        { href: "/dashboard", label: "Overview", exact: true },
        { href: "/dashboard/reps", label: "Reps" },
        { href: "/dashboard/pipeline", label: "Pipeline" },
        { href: "/dashboard/markets", label: "Markets" },
        { href: "/dashboard/plan", label: "Margin plan" },
        { href: "/dashboard/settings", label: "Settings" },
      ]}
    >
      {children}
    </Shell>
  );
}
