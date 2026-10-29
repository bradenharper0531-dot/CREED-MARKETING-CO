"use client";
import { useTransition } from "react";
import { clearSampleData, removeOwnerEmail, setRole } from "../actions";

export function RoleButton({ id, role }: { id: string; role: "owner" | "rep" }) {
  const [pending, start] = useTransition();
  const to = role === "owner" ? "rep" : "owner";
  return (
    <button className="btn btn-sm" disabled={pending}
      onClick={() => confirm(to === "owner" ? "Make this person an owner? They'll see margins, all reps and the pipeline." : "Remove owner access?") && start(() => setRole(id, to))}>
      {to === "owner" ? "Make owner" : "Make rep"}
    </button>
  );
}

export function RemoveOwnerEmail({ email }: { email: string }) {
  const [pending, start] = useTransition();
  return <button className="btn btn-ghost btn-sm" style={{ padding: 0 }} aria-label={`Remove ${email}`} disabled={pending} onClick={() => start(() => removeOwnerEmail(email))}>✕</button>;
}

export function ClearSample() {
  const [pending, start] = useTransition();
  return <button className="btn btn-sm" disabled={pending} onClick={() => confirm("Delete all sample reps and recruits?") && start(() => clearSampleData())}>{pending ? "Removing…" : "Remove sample data"}</button>;
}
