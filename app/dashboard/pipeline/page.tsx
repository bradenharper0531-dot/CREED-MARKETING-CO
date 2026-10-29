import { createClient } from "@/lib/supabase/server";
import type { Recruit } from "@/lib/types";
import { Board, type NoteRow } from "./Board";

export default async function Pipeline() {
  const supabase = createClient();
  const [rRes, nRes, mRes] = await Promise.all([
    supabase.from("recruits").select("*").order("last_touch", { ascending: false }),
    supabase.from("recruit_notes").select("id, recruit_id, author_name, body, created_at").order("created_at", { ascending: false }).limit(3000),
    supabase.from("markets").select("name").order("sort"),
  ]);
  return (
    <>
      <div className="page-head"><div><span className="tag">Pipeline</span><h1 style={{ marginTop: 10 }}>Who&apos;s coming in.</h1></div></div>
      <Board recruits={(rRes.data as Recruit[]) ?? []} notes={(nRes.data as NoteRow[]) ?? []} markets={(mRes.data ?? []).map((m) => m.name as string)} />
    </>
  );
}
