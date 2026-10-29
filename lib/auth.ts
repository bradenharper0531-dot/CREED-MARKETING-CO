import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "owner" | "rep";
export type Viewer = { id: string; email: string; fullName: string; role: Role } | null;

/** The signed-in user and their role, or null. Role comes from the database, never the client. */
export async function getViewer(): Promise<Viewer> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role")
    .eq("id", user.id)
    .single();
  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? user.email ?? "",
    role: (profile?.role as Role) ?? "rep",
  };
}

export async function requireUser() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

/** Use at the top of every owner-only page and server action. */
export async function requireOwner() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "owner") redirect("/plan");
  return viewer;
}

/** "Braden" / "Peter" style first name for notes and pipeline ownership. */
export function firstName(viewer: NonNullable<Viewer>) {
  return (viewer.fullName || viewer.email).split(/[\s@]/)[0].replace(/^\w/, (c) => c.toUpperCase());
}

export { initials } from "./names";
