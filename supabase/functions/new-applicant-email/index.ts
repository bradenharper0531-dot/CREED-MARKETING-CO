// Supabase Edge Function — emails the owners when someone applies.
//
// Fired by a Database Webhook on INSERT into `recruits` (see README). Sends one
// email to everyone in ALERT_TO through Resend (free: 3,000/month, 100/day),
// then stamps `notified_at` on the recruit so a lead is never emailed twice.
// Hitting "Reply" in the email replies straight to the applicant.
//
// Secrets (supabase secrets set …):
//   RESEND_API_KEY   from resend.com → API Keys
//   ALERT_FROM       e.g. "Creed Applications <apply@yourdomain.com>"
//                    (must be on a domain you verified in Resend; see README)
//   ALERT_TO         comma-separated, e.g. braden@gmail.com,peter@gmail.com
//   WEBHOOK_SECRET   any long random string; the webhook sends it as x-webhook-secret
//   DASHBOARD_URL    optional — link to the pipeline, e.g. https://app.yourdomain.com/dashboard/pipeline
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
  return [
    ['Phone', r.phone ?? '—'],
    ['Email', r.email ?? '—'],
    ['Instagram', r.instagram ?? '—'],
    ['Industry', interest],
    ['Market', r.preferred_market ?? 'Not sure yet'],
    ['Can start', longDate(r.start_date)],
    ['Car', yn(r.has_car)],
    ["Driver's license", yn(r.has_license)],
    ['Pillar to grow', cap(r.pillar)],
    ['Heard about us', r.source ?? '—'],
  ];
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
      <tr><td style="padding:18px 26px 22px">${tel}${open}</td></tr>
    </table>
    <p style="color:#5e584b;font-size:12px;margin:14px 0 0">Reply to this email to answer ${esc(r.name.split(' ')[0])} directly.</p>
  </td></tr></table></body></html>`;
}

function text(r: Recruit) {
  return [`New Creed applicant: ${r.name}`, '', ...rows(r).map(([k, v]) => `${k}: ${v}`), '', env('DASHBOARD_URL') ? `Pipeline: ${env('DASHBOARD_URL')}` : ''].join('\n');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!env('WEBHOOK_SECRET') || req.headers.get('x-webhook-secret') !== env('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const r: Recruit | undefined = payload?.record;
  if (payload?.type !== 'INSERT' || payload?.table !== 'recruits' || !r) return new Response('Ignored', { status: 200 });
  if (r.is_sample || r.notified_at) return new Response('Skipped', { status: 200 });

  const to = env('ALERT_TO').split(',').map((s) => s.trim()).filter(Boolean);
  const market = r.preferred_market ? ` · ${r.preferred_market}` : '';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env('ALERT_FROM'),
      to,
      reply_to: r.email ?? undefined,
      subject: `New applicant: ${r.name}${market}`,
      html: html(r),
      text: text(r),
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error(`Resend ${res.status}: ${detail}`);
    return new Response(detail, { status: 502 });
  }

  await fetch(`${env('SUPABASE_URL')}/rest/v1/recruits?id=eq.${encodeURIComponent(r.id)}`, {
    method: 'PATCH',
    headers: {
      apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
      Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ notified_at: new Date().toISOString() }),
  });

  return new Response(JSON.stringify({ sent: to.length }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
