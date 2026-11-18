// Supabase Edge Function — emails the owners when someone applies.
//
// Fired by a Database Webhook on INSERT into `recruits` (see README). Sends one
// email to everyone in ALERT_TO through Resend (free: 3,000/month, 100/day).
// Hitting "Reply" in the email replies straight to the applicant.
//
// It never trusts what it's sent: it takes only the new row's id, reads the real
// row from the database, and "claims" it by stamping `notified_at` only if it's
// still empty and the application is under 15 minutes old. So each application
// is emailed at most once, and calling this URL by hand can't send anything new
// (the public can already add applications through the form anyway).
//
// Secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY   from resend.com → API Keys (sending access)
//   ALERT_FROM       e.g. "Creed Applications <apply@creedmarketing.org>"
//                    (must be on a domain verified in Resend)
//   ALERT_TO         comma-separated, e.g. braden@gmail.com,peter@gmail.com
//   DASHBOARD_URL    optional — link to the pipeline, e.g. https://creedmarketing.org/#/dashboard/pipeline
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

type Recruit = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  industry_interest: string | null;
  preferred_market: string | null;
  pillar: string | null;
  start_date: string | null;
  has_car: boolean | null;
  has_license: boolean | null;
  source: string | null;
  experience: string | null;
  is_sample: boolean | null;
  notified_at: string | null;
};

const env = (k: string) => Deno.env.get(k) ?? '';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const yn = (v: boolean | null) => (v == null ? '—' : v ? 'Yes' : 'No');
const cap = (s: string | null) => (s ? s[0].toUpperCase() + s.slice(1) : '—');

function longDate(d: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function rows(r: Recruit): [string, string][] {
  const interest = r.industry_interest === 'pest' ? 'Pest control' : r.industry_interest === 'fiber' ? 'Fiber' : 'Either';
  const out: [string, string][] = [
    ['Applying for', interest],
    ['Phone', r.phone ?? '—'],
    ['Email', r.email ?? '—'],
  ];
  // older / hand-added leads may carry these; the current Apply form doesn't ask for them
  if (r.instagram) out.push(['Instagram', r.instagram]);
  if (r.preferred_market) out.push(['Market', r.preferred_market]);
  if (r.start_date) out.push(['Can start', longDate(r.start_date)]);
  if (r.has_car != null) out.push(['Car', yn(r.has_car)]);
  if (r.has_license != null) out.push(["Driver's license", yn(r.has_license)]);
  if (r.pillar) out.push(['Pillar to grow', cap(r.pillar)]);
  return out;
}

function html(r: Recruit) {
  const dash = env('DASHBOARD_URL');
  const tr = rows(r)
    .map(([k, v]) => `<tr><td style="padding:9px 0;border-top:1px solid #2e2a22;color:#9a927f;font-size:13px;width:150px">${esc(k)}</td><td style="padding:9px 0;border-top:1px solid #2e2a22;color:#f2ede1;font-size:14px">${esc(v)}</td></tr>`)
    .join('');
  const tel = r.phone ? `<a href="tel:${esc(r.phone.replace(/[^\d+]/g, ''))}" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;border-radius:6px;background:#f5c518;color:#0b0b0a;font-weight:600;font-size:14px;text-decoration:none">Call ${esc(r.name.split(' ')[0])}</a>` : '';
  const open = dash ? `<a href="${esc(dash)}" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;border-radius:6px;border:1px solid #b8901a;color:#f5c518;font-weight:600;font-size:14px;text-decoration:none">Open pipeline</a>` : '';
  return `<!doctype html><html><body style="margin:0;background:#0b0b0a;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0a;padding:28px 12px"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#151412;border:1px solid #2e2a22;border-radius:10px">
      <tr><td style="padding:24px 26px 6px">
        <div style="font-size:13px;font-weight:700;letter-spacing:.16em;color:#f5c518">CREED</div>
        <div style="margin-top:14px;display:inline-block;padding:2px 8px;border-radius:4px;background:#2b2410;color:#f5c518;font-family:Menlo,monospace;font-size:11px;letter-spacing:.1em">NEW APPLICANT</div>
        <h1 style="margin:10px 0 4px;color:#f2ede1;font-size:26px;letter-spacing:.03em;text-transform:uppercase">${esc(r.name)}</h1>
        <p style="margin:0 0 6px;color:#9a927f;font-size:14px">Just applied on the site. They're in the pipeline as a New lead.</p>
      </td></tr>
      <tr><td style="padding:6px 26px 4px"><table width="100%" cellpadding="0" cellspacing="0">${tr}</table></td></tr>
      ${r.experience ? `<tr><td style="padding:10px 26px 0"><div style="color:#9a927f;font-size:13px;margin-bottom:6px">Previous work experience</div><div style="padding:12px 14px;border:1px solid #2e2a22;border-radius:6px;background:#0b0b0a;color:#f2ede1;font-size:14px;line-height:1.5;white-space:pre-wrap">${esc(r.experience)}</div></td></tr>` : ''}
      <tr><td style="padding:18px 26px 22px">${tel}${open}</td></tr>
    </table>
    <p style="color:#5e584b;font-size:12px;margin:14px 0 0">Reply to this email to answer ${esc(r.name.split(' ')[0])} directly.</p>
  </td></tr></table></body></html>`;
}

function text(r: Recruit) {
  return [`New Creed applicant: ${r.name}`, '', ...rows(r).map(([k, v]) => `${k}: ${v}`), ...(r.experience ? ['', 'Previous work experience:', r.experience] : []), '', env('DASHBOARD_URL') ? `Pipeline: ${env('DASHBOARD_URL')}` : ''].join('\n');
}

const db = (path: string, init: RequestInit = {}) =>
  fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
      Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const payload = await req.json().catch(() => null);
  const id: unknown = payload?.record?.id;
  if (payload?.type !== 'INSERT' || payload?.table !== 'recruits' || typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) {
    return json({ ignored: true });
  }

  // Claim the real row: only a fresh, real, not-yet-emailed application qualifies.
  const fresh = new Date(Date.now() - 15 * 60_000).toISOString();
  const claim = await db(
    `recruits?id=eq.${id}&notified_at=is.null&is_sample=eq.false&created_at=gte.${encodeURIComponent(fresh)}&select=*`,
    { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ notified_at: new Date().toISOString() }) },
  );
  if (!claim.ok) {
    console.error(`claim ${claim.status}: ${await claim.text()}`);
    return json({ error: 'claim failed' }, 500);
  }
  const [r] = (await claim.json()) as Recruit[];
  if (!r) return json({ skipped: true });

  const to = env('ALERT_TO').split(',').map((s) => s.trim()).filter(Boolean);
  const industry = r.industry_interest === 'pest' ? ' · Pest control' : r.industry_interest === 'fiber' ? ' · Fiber' : '';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env('ALERT_FROM'),
      to,
      reply_to: r.email ?? undefined,
      subject: `New applicant: ${r.name}${industry}`,
      html: html(r),
      text: text(r),
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error(`Resend ${res.status}: ${detail}`);
    // release the claim so a retry can send it
    await db(`recruits?id=eq.${id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ notified_at: null }) });
    return json({ error: 'email failed', detail }, 502);
  }
  return json({ sent: to.length });
});
