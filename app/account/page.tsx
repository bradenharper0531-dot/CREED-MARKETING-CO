import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** After login: owners go to the dashboard, everyone else to My Plan. */
export default async function Account() {
  const viewer = await requireUser();
  redirect(viewer.role === "owner" ? "/dashboard" : "/plan");
}
