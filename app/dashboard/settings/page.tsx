import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { shortDate } from "@/lib/dates";
import { addOwnerEmail } from "../actions";
import { RoleButton, RemoveOwnerEmail, ClearSample } from "./SettingsButtons";

export default async function Settings() {
  const viewer = await requireOwner();
  const supabase = createClient();
  const [p, o, s1, s2] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, created_at").order("created_at"),
    supabase.from("owner_emails").select("email").order("email"),
    supabase.from("reps").select("id", { count: "exact", head: true }).eq("is_sample", true),
    supabase.from("recruits").select("id", { count: "exact", head: true }).eq("is_sample", true),
  ]);
  const people = p.data ?? [];
  const sampleCount = (s1.count ?? 0) + (s2.count ?? 0);
  return (
    <>
      <div className="page-head"><div><span className="tag">Settings</span><h1 style={{ marginTop: 10 }}>Accounts &amp; roles.</h1></div></div>
      <div className="stack">
        <section className="card">
          <div className="card-head"><span className="tag">Users</span><h2>Everyone with a login</h2><span className="muted mono" style={{ marginLeft: "auto", fontSize: 12 }}>{people.length}</span></div>
          <div className="tbl-wrap">
            <table className="tbl cards">
              <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Role</th><th></th></tr></thead>
              <tbody>{people.map((u) => (
                <tr key={u.id}>
                  <td data-l="Name" className="lead">{u.full_name ?? "—"}</td>
                  <td data-l="Email">{u.email}</td>
                  <td data-l="Joined" className="mono">{shortDate(u.created_at)}</td>
                  <td data-l="Role"><span className={`pill ${u.role === "owner" ? "st-progress" : "st-new"}`}>{u.role === "owner" ? "Owner" : "Rep"}</span></td>
                  <td data-l="">{u.id === viewer.id ? <span className="muted" style={{ fontSize: 13 }}>You</span> : <RoleButton id={u.id} role={u.role as "owner" | "rep"} />}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><span className="tag">Owner allowlist</span><h2>Who becomes an owner on sign-up</h2></div>
          <div className="card-body">
            <p className="muted" style={{ fontSize: 14 }}>Anyone who signs up with one of these emails is an owner automatically. Adding an email here also promotes an existing account with that email. Everyone else signs up as a rep.</p>
            <div className="minichips">{(o.data ?? []).map((e) => <span key={e.email} className="minichip" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><b>{e.email}</b><RemoveOwnerEmail email={e.email} /></span>)}</div>
            <form action={addOwnerEmail} style={{ display: "flex", gap: 8, maxWidth: 480 }}>
              <input name="email" type="email" placeholder="email@domain.com" required />
              <button className="btn">Add</button>
            </form>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><span className="tag">Sample data</span><h2>Starter records</h2></div>
          <div className="card-body">
            <p className="muted" style={{ fontSize: 14 }}>{sampleCount ? `${sampleCount} sample reps and recruits are loaded so the dashboard has something on it. Remove them once your real data is in.` : "No sample data left."}</p>
            {sampleCount > 0 && <ClearSample />}
          </div>
        </section>
      </div>
    </>
  );
}
