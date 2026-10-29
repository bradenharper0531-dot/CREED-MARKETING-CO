"use server";
import { createClient } from "@/lib/supabase/server";

export type ApplyState = { ok: boolean; msg: string };

/** Public application form → a "New lead" card in the owners' recruiting pipeline. */
export async function submitApplication(_: ApplyState, fd: FormData): Promise<ApplyState> {
  if (String(fd.get("company") || "")) return { ok: true, msg: "Thanks — we'll be in touch." }; // bot
  const name = String(fd.get("name") || "").trim();
  const phone = String(fd.get("phone") || "").trim();
  const email = String(fd.get("email") || "").trim().toLowerCase();
  if (!name || !phone || !email) return { ok: false, msg: "Name, phone and email are required." };

  const supabase = createClient();
  const { error } = await supabase.from("recruits").insert({
    name: name.slice(0, 120),
    phone: phone.slice(0, 40),
    email: email.slice(0, 160),
    instagram: String(fd.get("instagram") || "").slice(0, 60) || null,
    industry_interest: (["fiber", "pest", "either"].includes(String(fd.get("industry_interest"))) ? fd.get("industry_interest") : "either") as string,
    preferred_market: String(fd.get("preferred_market") || "").slice(0, 60) || null,
    pillar: (["physical", "spiritual", "mental", "financial"].includes(String(fd.get("pillar"))) ? fd.get("pillar") : null) as string | null,
    source: String(fd.get("source") || "").slice(0, 120) || null,
    stage: "new",
  });
  if (error) return { ok: false, msg: "Something went wrong sending that. Try again, or DM us on Instagram." };
  return { ok: true, msg: `Got it, ${name.split(" ")[0]}. Braden or Peter will reach out within 48 hours.` };
}
