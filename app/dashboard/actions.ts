"use server";
/**
 * Owner-only server actions. Every action re-checks the role on the server
 * (requireOwner), and the database re-checks again with row-level security.
 */
import { revalidatePath } from "next/cache";
import { requireOwner, firstName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Note, Stage } from "@/lib/types";

const STAGE_IDS: Stage[] = ["new", "contacted", "interviewing", "offer", "signed", "cold", "not_fit"];
const ownerName = (v: string | null | undefined) => (v === "Braden" || v === "Peter" ? v : null);
const str = (fd: FormData, k: string, max = 200) => { const v = String(fd.get(k) ?? "").trim().slice(0, max); return v || null; };

// ---------------- Pipeline ----------------
export async function moveRecruit(id: string, stage: Stage) {
  await requireOwner();
  if (!STAGE_IDS.includes(stage)) throw new Error("Bad stage");
  const supabase = createClient();
  const patch: Record<string, unknown> = { stage, last_touch: new Date().toISOString() };
  if (stage === "signed") patch.signed_at = new Date().toISOString();
  const { error } = await supabase.from("recruits").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "layout");
}

export async function addRecruitNote(recruitId: string, body: string): Promise<Note> {
  const viewer = await requireOwner();
  const text = body.trim().slice(0, 2000);
  if (!text) throw new Error("Empty note");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recruit_notes")
    .insert({ recruit_id: recruitId, body: text, author_id: viewer.id, author_name: firstName(viewer) })
    .select("id, author_name, body, created_at")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("recruits").update({ last_touch: new Date().toISOString() }).eq("id", recruitId);
  revalidatePath("/dashboard/pipeline");
  return data as Note;
}

export async function saveRecruit(fd: FormData) {
  await requireOwner();
  const supabase = createClient();
  const id = str(fd, "id");
  const row = {
    name: str(fd, "name", 120) ?? "Unnamed",
    phone: str(fd, "phone", 40),
    email: str(fd, "email", 160),
    instagram: str(fd, "instagram", 60),
    industry_interest: (["fiber", "pest", "either"].includes(String(fd.get("industry_interest"))) ? fd.get("industry_interest") : "either") as string,
    preferred_market: str(fd, "preferred_market", 60),
    pillar: (["physical", "spiritual", "mental", "financial"].includes(String(fd.get("pillar"))) ? fd.get("pillar") : null) as string | null,
    owner_name: ownerName(str(fd, "owner_name")),
    next_follow_up: str(fd, "next_follow_up", 10),
    source: str(fd, "source", 120),
  };
  const { error } = id
    ? await supabase.from("recruits").update(row).eq("id", id)
    : await supabase.from("recruits").insert({ ...row, stage: "new" });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "layout");
}

export async function deleteRecruit(id: string) {
  await requireOwner();
  const { error } = await createClient().from("recruits").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "layout");
}

/** Signed recruit → rep record (keeps name, phone, email, market, who recruited them). */
export async function convertToRep(recruitId: string, industry: "fiber" | "pest") {
  await requireOwner();
  const supabase = createClient();
  const { data: r } = await supabase.from("recruits").select("*").eq("id", recruitId).single();
  if (!r) throw new Error("Recruit not found");
  const { data: m } = await supabase.from("markets").select("id").eq("name", r.preferred_market ?? "").maybeSingle();
  // link to their login if they already created an account with the same email
  const { data: p } = r.email ? await supabase.from("profiles").select("id").eq("email", String(r.email).toLowerCase()).maybeSingle() : { data: null };
  const { error } = await supabase.from("reps").insert({
    name: r.name, phone: r.phone, email: r.email, industry, market_id: m?.id ?? null,
    recruited_by: r.owner_name, profile_id: p?.id ?? null, status: "active",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "layout");
}

// ---------------- Reps ----------------
export async function saveRep(fd: FormData) {
  await requireOwner();
  const supabase = createClient();
  const id = str(fd, "id");
  const email = str(fd, "email", 160)?.toLowerCase() ?? null;
  let profile_id: string | null = null;
  if (email) {
    const { data } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
    profile_id = data?.id ?? null;
  }
  const row = {
    name: str(fd, "name", 120) ?? "Unnamed",
    email, profile_id,
    phone: str(fd, "phone", 40),
    industry: fd.get("industry") === "pest" ? "pest" : "fiber",
    market_id: str(fd, "market_id", 60),
    recruited_by: ownerName(str(fd, "recruited_by")),
    start_date: str(fd, "start_date", 10),
    status: fd.get("status") === "inactive" ? "inactive" : "active",
  };
  const { error } = id ? await supabase.from("reps").update(row).eq("id", id) : await supabase.from("reps").insert(row);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "layout");
}

export async function deleteRep(id: string) {
  await requireOwner();
  const { error } = await createClient().from("reps").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "layout");
}

export async function logStats(repId: string, day: string, sales: number, installs: number) {
  await requireOwner();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Bad date");
  const { error } = await createClient().from("rep_stats").upsert(
    { rep_id: repId, day, sales: Math.max(0, Math.round(sales)), installs: Math.max(0, Math.round(installs)) },
    { onConflict: "rep_id,day" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard", "layout");
}

/**
 * CSV import of daily numbers. Columns (header row required):
 *   rep,date,sales,installs     — rep = exact rep name (or email)
 */
export async function importStatsCsv(csv: string): Promise<{ imported: number; skipped: string[] }> {
  await requireOwner();
  const supabase = createClient();
  const { data: reps } = await supabase.from("reps").select("id, name, email");
  const lines = csv.trim().split(/\r?\n/);
  const head = lines.shift()?.toLowerCase().split(",").map((s) => s.trim()) ?? [];
  const idx = (k: string) => head.indexOf(k);
  const skipped: string[] = [];
  const rows: { rep_id: string; day: string; sales: number; installs: number }[] = [];
  for (const line of lines.slice(0, 5000)) {
    const c = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
    const who = (c[idx("rep")] ?? "").toLowerCase();
    const rep = reps?.find((r) => r.name.toLowerCase() === who || (r.email ?? "").toLowerCase() === who);
    const day = c[idx("date")] ?? "";
    if (!rep || !/^\d{4}-\d{2}-\d{2}$/.test(day)) { skipped.push(line); continue; }
    rows.push({ rep_id: rep.id, day, sales: Math.max(0, parseInt(c[idx("sales")] ?? "0") || 0), installs: Math.max(0, parseInt(c[idx("installs")] ?? "0") || 0) });
  }
  if (rows.length) {
    const { error } = await supabase.from("rep_stats").upsert(rows, { onConflict: "rep_id,day" });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/dashboard", "layout");
  return { imported: rows.length, skipped: skipped.slice(0, 20) };
}

export async function addRepNote(repId: string, body: string): Promise<Note> {
  const viewer = await requireOwner();
  const { data, error } = await createClient()
    .from("rep_notes")
    .insert({ rep_id: repId, body: body.trim().slice(0, 2000), author_id: viewer.id, author_name: firstName(viewer) })
    .select("id, author_name, body, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data as Note;
}

// ---------------- Markets ----------------
const numOrNull = (fd: FormData, k: string) => { const v = String(fd.get(k) ?? "").trim(); return v === "" ? null : Number(v); };
const lines = (fd: FormData, k: string) => String(fd.get(k) ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

export async function saveMarket(fd: FormData) {
  await requireOwner();
  const supabase = createClient();
  const id = str(fd, "id");
  let pace_tiers: unknown = null;
  const tiers = lines(fd, "pace_tiers");
  if (tiers.length) pace_tiers = tiers.map((t) => { const [l, v] = t.split("="); return { l: l.trim(), v: Number(v) || 0 }; });
  const name = str(fd, "name", 60) ?? "New market";
  const pub = {
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    industry: (["fiber", "pest", "starlink"].includes(String(fd.get("industry"))) ? fd.get("industry") : "fiber") as string,
    provider: str(fd, "provider", 60),
    leads: str(fd, "leads", 80),
    connect: numOrNull(fd, "connect"),
    connect_label: str(fd, "connect_label", 40),
    public_rate_label: str(fd, "public_rate_label", 80),
    pace: numOrNull(fd, "pace") ?? 2,
    pace_tiers,
    notes: lines(fd, "notes"),
    rep_base: numOrNull(fd, "rep_base"),
    rep_cap: numOrNull(fd, "rep_cap"),
    rep_step: numOrNull(fd, "rep_step") ?? 20,
    rep_bump: numOrNull(fd, "rep_bump") ?? 25,
    rep_basis: fd.get("rep_basis") === "installed" ? "installed" : "sold",
    sort: numOrNull(fd, "sort") ?? 0,
    updated_at: new Date().toISOString(),
  };
  let marketId = id;
  if (id) {
    const { error } = await supabase.from("markets").update(pub).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from("markets").insert(pub).select("id").single();
    if (error) throw new Error(error.message);
    marketId = data.id;
  }
  const { error: e2 } = await supabase.from("market_rates").upsert({
    market_id: marketId,
    base: numOrNull(fd, "full_base"),
    cap: numOrNull(fd, "full_cap"),
    step: numOrNull(fd, "full_step") ?? 25,
    bump: numOrNull(fd, "full_bump") ?? 25,
    basis: fd.get("full_basis") === "installed" ? "installed" : "sold",
    owner_notes: lines(fd, "owner_notes"),
  });
  if (e2) throw new Error(e2.message);
  revalidatePath("/", "layout");
}

export async function deleteMarket(id: string) {
  await requireOwner();
  const { error } = await createClient().from("markets").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

// ---------------- Settings ----------------
export async function setRole(userId: string, role: "owner" | "rep") {
  const viewer = await requireOwner();
  if (userId === viewer.id) throw new Error("You can't change your own role.");
  const { error } = await createClient().from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

export async function addOwnerEmail(fd: FormData) {
  await requireOwner();
  const email = str(fd, "email", 160)?.toLowerCase();
  if (!email || !email.includes("@")) return;
  const { error } = await createClient().from("owner_emails").upsert({ email });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

export async function removeOwnerEmail(email: string) {
  await requireOwner();
  const { error } = await createClient().from("owner_emails").delete().eq("email", email);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

export async function clearSampleData() {
  await requireOwner();
  const supabase = createClient();
  await supabase.from("reps").delete().eq("is_sample", true);
  await supabase.from("recruits").delete().eq("is_sample", true);
  revalidatePath("/dashboard", "layout");
}
