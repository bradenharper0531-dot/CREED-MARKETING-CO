import Link from "next/link";
import { Nav, Wordmark } from "@/components/site/Nav";
import { Reveal, CountUp } from "@/components/site/Reveal";
import { MarketsGrid } from "@/components/site/MarketsGrid";
import { ApplyForm } from "@/components/site/ApplyForm";
import PayCalculator from "@/components/PayCalculator";
import { getViewer } from "@/lib/auth";
import { getMarkets, getCalcMarkets } from "@/lib/markets";
import { site, isFillIn, stripFillIn } from "@/lib/content";

export const dynamic = "force-dynamic";

const MARQUEE = ["PHYSICAL", "SPIRITUAL", "MENTAL", "FINANCIAL", "UTAH", "LAIE / HONOLULU", "ARIZONA", "INDIANA", "MISSOURI", "MINNESOTA", "WYOMING", "STARLINK"];

export default async function Home() {
  const [viewer, markets, calcMarkets] = await Promise.all([getViewer(), getMarkets(), getCalcMarkets(false)]);
  const openMarkets = markets.filter((m) => m.public_rate_label).length;
  const reps = site.repsInGroup;

  return (
    <>
      <Nav viewer={viewer} />
      <main>
        {/* HERO */}
        <section className="hero">
          <div className="container">
            <Reveal><span className="tag">Creed Marketing · Self-development through sales</span></Reveal>
            <Reveal delay={80}>
              <h1 style={{ marginTop: 24 }}>
                {site.heroTitle[0]}<br />{site.heroTitle[1]}<br /><em>{site.heroTitle[2]}</em>
              </h1>
            </Reveal>
            <Reveal delay={160}><p className="sub">{site.heroSub}</p></Reveal>
            <Reveal delay={240}>
              <div className="cta">
                <a href="#join" className="btn btn-primary">Apply to Creed</a>
                <a href="#pillars" className="btn">See the path</a>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <div className="statstrip">
                <div><span className="label">Markets open</span><span className="v"><CountUp to={openMarkets} /></span></div>
                <div><span className="label">Reps in the group</span><span className="v">{typeof reps === "number" ? <CountUp to={reps} suffix="+" /> : <span className="fillin">[fill in]</span>}</span></div>
                <div><span className="label">Top connect rate</span><span className="v"><CountUp to={90} suffix="%" /></span></div>
                <div><span className="label">Up to, per contract</span><span className="v"><CountUp to={400} prefix="$" /></span></div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* MARQUEE */}
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[0, 1].map((k) => (
              <span key={k}>{MARQUEE.map((w, i) => <span key={w}>{i > 0 && <i>◆</i>}{" "}{w}</span>)}<i>◆</i></span>
            ))}
          </div>
        </div>

        {/* WHO WE ARE */}
        <section className="section" id="who">
          <div className="container two">
            <Reveal>
              <span className="tag">Who we are</span>
              <p className="manifesto" style={{ marginTop: 20 }}>
                {site.manifesto.split(" — ")[0]} — <em>{site.manifesto.split(" — ")[1] ?? ""}</em>
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="label" style={{ marginBottom: 12 }}>What we expect from each other</div>
              <ul className="expect">
                {site.expectations.map(([n, t]) => <li key={n}><span className="n">{n}</span><span>{t}</span></li>)}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* FOUR PILLARS */}
        <section className="section" id="pillars">
          <div className="container">
            <Reveal className="section-head">
              <span className="tag">The four pillars</span>
              <h2>Better in every way that matters.</h2>
              <p>Sales is the vehicle. These four are the destination. Every rep at Creed is building all of them at once.</p>
            </Reveal>
            <div className="pillars">
              {site.pillars.map((p, i) => (
                <Reveal key={p.key} delay={i * 90} className="pillar">
                  <span className="num">0{i + 1}</span>
                  <h3>{p.name}</h3>
                  <p className="principle">{p.principle}</p>
                  <ul>
                    {p.practices.map((x) => isFillIn(x)
                      ? <li key={x}><span className="fillin">[fill in] {stripFillIn(x)}</span></li>
                      : <li key={x}>{x}</li>)}
                  </ul>
                  <div className="photo-slot">Team photo — {p.name}</div>
                </Reveal>
              ))}
            </div>

            <Reveal>
              <div className="label" style={{ marginTop: 72 }}>A day in the life</div>
              <div className="timeline" style={{ marginTop: 14 }}>
                {site.day.map(([t, h, d]) => <div key={h}><span className="t">{t}</span><h4>{h}</h4><p>{d}</p></div>)}
              </div>
            </Reveal>
            <Reveal>
              <div className="label" style={{ marginTop: 48 }}>A season in the life</div>
              <div className="timeline" style={{ marginTop: 14 }}>
                {site.season.map(([h, d]) => <div key={h}><h4>{h}</h4><p>{d}</p></div>)}
              </div>
            </Reveal>
          </div>
        </section>

        {/* THE MONEY */}
        <section className="section" id="money">
          <div className="container">
            <Reveal className="section-head">
              <span className="tag">The money</span>
              <h2>The result of the other three.</h2>
              <p>You&apos;re paid per contract. Sell more in a month and your rate climbs — and the raise applies to every account that month, not just the ones after it. Rates reset on the 1st.</p>
            </Reveal>
            <div className="money-grid">
              <Reveal className="card">
                <div className="card-head"><span className="tag">Stacks</span><h3>How your rate climbs</h3></div>
                <div className="card-body">
                  {site.payStacks.length ? (
                    <table className="otbl"><thead><tr><th>Monthly volume</th><th className="num">Rate per account</th></tr></thead>
                      <tbody>{site.payStacks.map((r) => <tr key={r.volume}><td>{r.volume}</td><td className="num big">{r.rate}</td></tr>)}</tbody></table>
                  ) : (
                    <p><span className="fillin">[fill in]</span> <span className="muted">Payout stacks by monthly volume go here (edit <code>payStacks</code> in lib/content.ts). Until then, the calculator below shows exactly how the rate climbs in each market.</span></p>
                  )}
                </div>
              </Reveal>
              <Reveal className="card" delay={100}>
                <div className="card-head"><span className="tag">The customer</span><h3>What they pay</h3></div>
                <div className="card-body">
                  <div className="well bill">
                    <span>Utopia infrastructure</span><span className="mono glow">{site.customerBill.utopia}</span>
                    <span>Internet provider (ISP)</span><span className="mono glow">{site.customerBill.isp}</span>
                    <span className="tot">Total, in two parts</span><span className="tot mono glow">{site.customerBill.total}</span>
                  </div>
                  <p className="muted" style={{ fontSize: 14 }}>{site.customerBill.freeMonths}. Modem and router compatibility problems almost never happen — only now and then on a very old home.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* MARKETS */}
        <section className="section" id="markets">
          <div className="container">
            <Reveal className="section-head">
              <span className="tag">Markets</span>
              <h2>Pick your market.</h2>
              <p>Where we work, what the leads look like, and what each contract pays.</p>
            </Reveal>
            <MarketsGrid markets={markets} />
          </div>
        </section>

        {/* CALCULATOR */}
        <section className="section" id="calculator">
          <div className="container">
            <Reveal className="section-head">
              <span className="tag">Growth plan</span>
              <h2>Run your numbers.</h2>
              <p>Pick a market, set your pace and schedule, and see what a day, a month, a season and a year look like.
                {viewer ? <> Your saved plan lives in <Link href={viewer.role === "owner" ? "/dashboard/plan" : "/plan"} className="gold">{viewer.role === "owner" ? "the owner margin plan" : "My Plan"}</Link>.</>
                  : <> <Link href="/login?mode=signup" className="gold">Create an account</Link> to save yours.</>}
              </p>
            </Reveal>
            <PayCalculator markets={calcMarkets} mode="rep" />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section">
          <div className="container">
            <Reveal className="section-head"><span className="tag">How it works</span><h2>Three steps.</h2></Reveal>
            <div className="steps">
              {site.steps.map(([n, h, d], i) => (
                <Reveal key={n} delay={i * 100} className="step"><span className="tag">{n}</span><h3>{h}</h3><p>{d}</p></Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* JOIN */}
        <section className="section final" id="join">
          <div className="container">
            <Reveal><span className="tag">Join</span><h2 style={{ marginTop: 20 }}>Become more<br /><span className="gold">with Creed.</span></h2></Reveal>
            <ApplyForm markets={markets.map((m) => m.name)} />
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-in">
          <div style={{ display: "grid", gap: 14 }}>
            <Wordmark />
            <span className="pillars-line">PHYSICAL · SPIRITUAL · MENTAL · FINANCIAL</span>
          </div>
          <nav style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <a href="#who">Who We Are</a><a href="#pillars">Pillars</a><a href="#markets">Markets</a><a href="#join">Apply</a>
            <Link href="/login">Log in</Link>
          </nav>
          <span>© 2026 Creed Marketing</span>
        </div>
      </footer>
    </>
  );
}
