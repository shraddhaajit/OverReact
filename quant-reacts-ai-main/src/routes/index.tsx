import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/api/queries";
import type { SummaryStats } from "@/lib/api/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OverReact — Research Summary" },
      { name: "description", content: "When Indian stocks fall sharply, do they bounce? An empirical study." },
      { property: "og:title", content: "OverReact — Research Summary" },
      { property: "og:description", content: "When Indian stocks fall sharply, do they bounce?" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: summary, isLoading, isError } = useQuery(queries.summary);

  return (
    <div className="mx-auto max-w-[1400px] px-6 md:px-12">
      {/* Hero */}
      <section className="relative pt-16 md:pt-28">
        <div className="rise-stagger">
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            <span className="h-px w-10 bg-foreground/40" />
            <span>Issue 01 · Behavioral Finance</span>
          </div>
          <h1 className="display mt-6 text-[12vw] leading-[0.85] md:text-[9rem]">
            Measuring<br />
            <span className="italic text-[var(--ink)]/80">the market&rsquo;s</span><br />
            memory<span className="text-[var(--blush)]">.</span>
          </h1>
          <div className="mt-10 grid gap-8 md:grid-cols-12 md:gap-12">
            <p className="md:col-span-5 text-lg leading-relaxed text-foreground/80">
              When a NIFTY 50 stock falls sharply in a single session, does it
              recover within the week?
            </p>
            {/* Live stats */}
            <div className="md:col-span-4 md:col-start-8 grid grid-cols-3 gap-6">
              {isLoading ? (
                <>
                  <StatSkeleton />
                  <StatSkeleton />
                  <StatSkeleton />
                </>
              ) : isError ? null : summary ? (
                <>
                  <Stat value={summary.total_events.toLocaleString()} label="Events" />
                  <Stat
                    value={`${summary.recovery_rate.toFixed(0)}%`}
                    label="Recovered"
                  />
                  <Stat
                    value={summary.significant ? "Yes" : "No"}
                    label="Significant"
                    tone={summary.significant ? "sage" : "blush"}
                  />
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Ticker marquee */}
      <section className="relative mt-20 overflow-hidden border-y hairline py-4">
        <div className="marquee-track flex whitespace-nowrap font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex shrink-0 gap-10 pr-10">
              {["TCS −3.21%", "RELIANCE −2.67%", "HDFCBANK −4.02%", "INFY −2.88%", "AXISBANK −3.41%", "ITC −2.55%", "WIPRO −3.74%", "SBIN −2.91%", "ADANIPORTS −5.10%", "MARUTI −2.62%"].map((t) => (
                <span key={t} className="inline-flex items-center gap-3">
                  <span className="h-1 w-1 rounded-full bg-[var(--blush)]" />
                  {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Hypothesis cards */}
      <section className="mt-24 grid gap-6 md:grid-cols-12">
        <div className="md:col-span-5">
          <Eyebrow>01 — Hypothesis</Eyebrow>
          <h2 className="display mt-4 text-5xl md:text-6xl">
            Do markets <span className="italic">panic</span>, then think?
          </h2>
        </div>
        <div className="md:col-span-7 grid gap-4 sm:grid-cols-2">
          <Card tone="blush" label="H₀">
            <p className="text-base leading-relaxed">
              Sharp drops show <span className="italic">no</span> statistically
              significant mean reversion over the next 5 sessions.
            </p>
          </Card>
          <Card tone="sage" label="H₁">
            <p className="text-base leading-relaxed">
              A subset — stock-specific shocks on low-vol names — show significant
              positive 5-day returns.
            </p>
          </Card>
          <Card tone="butter" label="Test">
            <p className="text-sm leading-relaxed text-foreground/75">
              One-sample t-test, plus sector and shock-type sub-cuts.
            </p>
          </Card>
          <Card tone="sky" label="Stance">
            <p className="text-sm leading-relaxed text-foreground/75">
              If the null holds, the null is the finding.
            </p>
          </Card>
        </div>
      </section>

      {/* Findings — live from API */}
      <section className="mt-28">
        <div className="flex items-end justify-between gap-4">
          <div>
            <Eyebrow>02 — Findings</Eyebrow>
            <h2 className="display mt-3 text-5xl">Three readings.</h2>
          </div>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground md:inline">
            fig. 1—3
          </span>
        </div>

        {isLoading ? (
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <ChartSkeleton n="01" />
            <ChartSkeleton n="02" />
            <ChartSkeleton n="03" />
          </div>
        ) : isError ? (
          <ErrorBanner />
        ) : summary ? (
          <FindingsGrid summary={summary} />
        ) : null}
      </section>

      {/* t-test result callout */}
      {summary && (
        <section className="mt-12">
          <div className="glass-strong rounded-2xl px-8 py-6 md:grid md:grid-cols-12 md:gap-6 md:items-center">
            <div className="md:col-span-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                T-statistic
              </div>
              <div className="number mt-1 text-5xl">{summary.t_statistic.toFixed(3)}</div>
            </div>
            <div className="md:col-span-3 mt-4 md:mt-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                p-value
              </div>
              <div className="number mt-1 text-5xl">{summary.p_value.toFixed(4)}</div>
            </div>
            <div className="md:col-span-6 mt-6 md:mt-0">
              <p className="text-lg leading-relaxed text-foreground/80">
                {summary.significant
                  ? `With p = ${summary.p_value.toFixed(4)}, mean reversion is statistically significant. The null hypothesis is rejected.`
                  : `With p = ${summary.p_value.toFixed(4)}, we cannot reject the null hypothesis. Sharp drops do not show reliable mean reversion.`}
              </p>
              <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Mean 5-day return:{" "}
                <span className={summary.mean_5d_return > 0 ? "text-[var(--sage)]" : "text-[var(--blush)]"}>
                  {summary.mean_5d_return > 0 ? "+" : ""}
                  {summary.mean_5d_return.toFixed(3)}%
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Shock type comparison */}
      {summary && (
        <section className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="glass rounded-2xl px-8 py-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Market-wide shock
            </div>
            <div className="number mt-2 text-4xl">
              {summary.market_shock.mean_return > 0 ? "+" : ""}
              {summary.market_shock.mean_return.toFixed(3)}%
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Mean 5d return · {summary.market_shock.count} events
            </div>
          </div>
          <div className="glass rounded-2xl px-8 py-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Stock-specific shock
            </div>
            <div className="number mt-2 text-4xl text-[var(--sage)]">
              {summary.specific_shock.mean_return > 0 ? "+" : ""}
              {summary.specific_shock.mean_return.toFixed(3)}%
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Mean 5d return · {summary.specific_shock.count} events
            </div>
          </div>
        </section>
      )}

      {/* Method */}
      <section className="mt-28 grid gap-10 md:grid-cols-12">
        <div className="md:col-span-4">
          <Eyebrow>03 — Method</Eyebrow>
          <h2 className="display mt-3 text-5xl">Method.</h2>
        </div>
        <div className="md:col-span-8 grid gap-px overflow-hidden rounded-lg border hairline bg-foreground/10">
          {[
            ["Universe", "All NIFTY 50 constituents"],
            ["Event rule", "Single-day close-to-close return below −2.5%"],
            ["Threshold", "~5th percentile of daily returns"],
            ["Label", "Forward 5-day return"],
            ["Split", "Chronological"],
            ["Models", "Logistic Regression · Random Forest"],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 gap-6 bg-background/70 px-6 py-5 backdrop-blur">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{k}</div>
              <div className="col-span-2 text-sm text-foreground/85">{v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-28">
        <div className="glass-strong relative overflow-hidden rounded-3xl px-10 py-16 md:px-16 md:py-24">
          <div className="relative grid gap-10 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <Eyebrow>04 — Try it</Eyebrow>
              <h2 className="display mt-4 text-5xl md:text-7xl">
                Submit a drop.<br />
                <span className="italic">See what the model thinks.</span>
              </h2>
            </div>
            <div className="md:col-span-5 md:text-right">
              <Link
                to="/predict"
                className="mt-8 inline-flex items-center gap-3 rounded-full bg-foreground px-7 py-3 text-xs uppercase tracking-[0.28em] text-background transition-transform hover:-translate-y-0.5"
              >
                Open predictor
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[var(--blush)] opacity-50 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[var(--sky)] opacity-50 blur-3xl" />
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FindingsGrid({ summary }: { summary: SummaryStats }) {
  const { forward_returns, recovery_by_day, shock_comparison } = summary.eda;

  // forward returns mini bar chart
  const maxY = Math.max(...forward_returns.map((d) => d.y));
  const barW = 100 / forward_returns.length;

  // recovery by day line
  const maxRate = Math.max(...recovery_by_day.map((d) => d.rate));
  const minRate = Math.min(...recovery_by_day.map((d) => d.rate));
  const normalize = (v: number) =>
    ((v - minRate) / (maxRate - minRate || 1)) * 80 + 10;
  const points = recovery_by_day
    .map((d, i) => `${(i / (recovery_by_day.length - 1)) * 280 + 10},${100 - normalize(d.rate)}`)
    .join(" ");

  return (
    <div className="mt-10 grid gap-6 md:grid-cols-3">
      {/* Fig 1: Forward return distribution */}
      <figure className="glass group relative overflow-hidden rounded-2xl p-6 transition-all hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">fig. 01</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--blush)]" />
        </div>
        <div className="relative mt-6 h-56 overflow-hidden rounded-lg border hairline bg-background/30 p-3">
          <svg viewBox="0 0 300 160" preserveAspectRatio="none" className="h-full w-full">
            {forward_returns.map((d, i) => {
              const h = (d.y / maxY) * 140;
              const x = i * barW * 3;
              const color = d.x >= 0 ? "var(--sage)" : "var(--blush)";
              return (
                <rect
                  key={i}
                  x={x}
                  y={160 - h}
                  width={Math.max(barW * 2.8, 1)}
                  height={h}
                  fill={color}
                  opacity={0.7}
                />
              );
            })}
            <line x1="150" y1="0" x2="150" y2="160" stroke="var(--muted)" strokeWidth="0.5" strokeDasharray="3,3" />
          </svg>
        </div>
        <figcaption className="mt-5">
          <h3 className="display text-2xl">Forward 5-day return</h3>
          <p className="mt-1 text-sm text-muted-foreground">Distribution with t-test overlay.</p>
        </figcaption>
      </figure>

      {/* Fig 2: Shock comparison bars */}
      <figure className="glass group relative overflow-hidden rounded-2xl p-6 transition-all hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">fig. 02</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--sage)]" />
        </div>
        <div className="relative mt-6 h-56 overflow-hidden rounded-lg border hairline bg-background/30 p-6 flex items-end gap-8 justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="font-mono text-xs text-[var(--blush)]">
              {shock_comparison.market > 0 ? "+" : ""}{shock_comparison.market.toFixed(2)}%
            </div>
            <div
              className="w-16 rounded-t bg-[var(--blush)] opacity-80"
              style={{ height: `${Math.abs(shock_comparison.market) * 20 + 20}px` }}
            />
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Market</div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="font-mono text-xs text-[var(--sage)]">
              {shock_comparison.specific > 0 ? "+" : ""}{shock_comparison.specific.toFixed(2)}%
            </div>
            <div
              className="w-16 rounded-t bg-[var(--sage)] opacity-80"
              style={{ height: `${Math.abs(shock_comparison.specific) * 20 + 20}px` }}
            />
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Specific</div>
          </div>
        </div>
        <figcaption className="mt-5">
          <h3 className="display text-2xl">Market vs stock-specific</h3>
          <p className="mt-1 text-sm text-muted-foreground">Recovery by shock type.</p>
        </figcaption>
      </figure>

      {/* Fig 3: Recovery rate by day */}
      <figure className="glass group relative overflow-hidden rounded-2xl p-6 transition-all hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">fig. 03</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--sky)]" />
        </div>
        <div className="relative mt-6 h-56 overflow-hidden rounded-lg border hairline bg-background/30 p-3">
          <svg viewBox="0 0 300 120" className="h-full w-full">
            <line x1="10" y1="60" x2="290" y2="60" stroke="var(--muted)" strokeWidth="0.5" strokeDasharray="3,3" />
            <polyline
              points={points}
              fill="none"
              stroke="var(--sky)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {recovery_by_day.map((d, i) => {
              const cx = (i / (recovery_by_day.length - 1)) * 280 + 10;
              const cy = 100 - normalize(d.rate);
              return (
                <circle key={i} cx={cx} cy={cy} r="3.5" fill="var(--sky)" />
              );
            })}
          </svg>
          <div className="absolute bottom-2 left-0 right-0 flex justify-between px-3 font-mono text-[9px] text-muted-foreground">
            {recovery_by_day.map((d) => <span key={d.day}>D{d.day}</span>)}
          </div>
        </div>
        <figcaption className="mt-5">
          <h3 className="display text-2xl">Recovery rate by day</h3>
          <p className="mt-1 text-sm text-muted-foreground">Cumulative recovery, day 1 to 5.</p>
        </figcaption>
      </figure>
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone?: "sage" | "blush" }) {
  const color = tone === "sage" ? "var(--sage)" : tone === "blush" ? "var(--blush)" : "inherit";
  return (
    <div>
      <div className="number text-3xl" style={{ color }}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div>
      <div className="h-8 w-20 animate-pulse rounded bg-foreground/10" />
      <div className="mt-2 h-3 w-12 animate-pulse rounded bg-foreground/10" />
    </div>
  );
}

function ChartSkeleton({ n }: { n: string }) {
  return (
    <figure className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">fig. {n}</span>
      </div>
      <div className="mt-6 h-56 animate-pulse rounded-lg bg-foreground/5" />
      <div className="mt-5 h-6 w-36 animate-pulse rounded bg-foreground/10" />
      <div className="mt-2 h-4 w-48 animate-pulse rounded bg-foreground/5" />
    </figure>
  );
}

function ErrorBanner() {
  return (
    <div className="mt-10 rounded-2xl border hairline bg-[var(--blush)]/10 px-6 py-5 text-sm text-muted-foreground">
      Could not load findings — make sure the backend is running on port 8000.
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
      <span className="h-px w-8 bg-foreground/40" />
      {children}
    </div>
  );
}

function Card({
  children, label, tone,
}: {
  children: React.ReactNode;
  label: string;
  tone: "blush" | "sage" | "butter" | "sky";
}) {
  const bg = { blush: "var(--blush)", sage: "var(--sage)", butter: "var(--butter)", sky: "var(--sky)" }[tone];
  return (
    <div className="group relative overflow-hidden rounded-2xl border hairline p-6 transition-transform hover:-translate-y-1">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-60 blur-2xl transition-opacity group-hover:opacity-90" style={{ background: bg }} />
      <div className="glass-strong absolute inset-0 -z-0" />
      <div className="relative">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</span>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}