import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/api/queries";
import { PageHeader, Panel } from "@/components/page-shell";

export const Route = createFileRoute("/sector")({
  head: () => ({
    meta: [
      { title: "OverReact — Sector Deep Dive" },
      { name: "description", content: "How overreaction differs across NIFTY 50 sectors." },
    ],
  }),
  component: SectorView,
});

function SectorView() {
  const { data, isLoading, isError } = useQuery(queries.sectors);
  const sectors = data?.sectors ?? [];
  const [selectedName, setSelectedName] = useState<string | null>(null);

  // Pick first sector once loaded
  const activeName = selectedName ?? sectors[0]?.name ?? null;
  const active = sectors.find((s) => s.name === activeName);

  return (
    <div className="mx-auto max-w-[1400px] px-6 md:px-12">
      <PageHeader
        eyebrow="View 02 — Sectors"
        title="Not all drops"
        italic="recover the same."
      />

      {isLoading && (
        <div className="mt-14 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-foreground/10" />
            ))}
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-12">
            {[4, 4, 4].map((span, i) => (
              <div key={i} className={`md:col-span-${span} h-40 animate-pulse rounded-2xl bg-foreground/5`} />
            ))}
          </div>
        </div>
      )}

      {isError && (
        <div className="mt-14 rounded-2xl border hairline bg-[var(--blush)]/10 px-6 py-5 text-sm text-muted-foreground">
          Could not load sector data — make sure the backend is running on port 8000.
        </div>
      )}

      {!isLoading && !isError && sectors.length > 0 && (
        <>
          {/* Sector selector — built from real API data */}
          <div className="relative z-10 mt-14 flex flex-wrap gap-2">
            {sectors.map((s) => {
              const isActive = s.name === activeName;
              return (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setSelectedName(s.name)}
                  style={{
                    background: isActive ? "var(--foreground)" : "transparent",
                    color: isActive ? "var(--background)" : "inherit",
                  }}
                  className="rounded-full border hairline px-5 py-2 text-xs uppercase tracking-[0.22em] transition-colors hover:opacity-80 cursor-pointer"
                >
                  {s.name}
                </button>
              );
            })}
          </div>

          {active && (
            <div className="mt-10 grid gap-6 md:grid-cols-12">
              {/* Stat cards */}
              <Panel label="Mean 5-day return" className="md:col-span-4">
                <div
                  className="number text-7xl"
                  style={{ color: active.mean_return >= 0 ? "var(--sage)" : "var(--blush)" }}
                >
                  {active.mean_return > 0 ? "+" : ""}
                  {(active.mean_return * 100).toFixed(2)}
                  <span className="text-3xl text-muted-foreground">%</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Across {active.event_count} events in this sector.
                </p>
              </Panel>

              <Panel label="Recovery rate" className="md:col-span-4">
                <div className="number text-7xl">
                  {active.recovery_rate.toFixed(1)}
                  <span className="text-3xl text-muted-foreground">%</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Events that recovered within 5 days.
                </p>
              </Panel>

              <Panel label="Event count" className="md:col-span-4">
                <div className="number text-7xl">{active.event_count}</div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Sharp drop events detected (2021–2023).
                </p>
              </Panel>

              {/* Sector comparison mini-chart */}
              <Panel label="All sectors — mean 5-day return" className="md:col-span-12">
                <div className="mt-2 space-y-2">
                  {[...sectors]
                    .sort((a, b) => b.mean_return - a.mean_return)
                    .map((s) => {
                      const maxAbs = Math.max(...sectors.map((x) => Math.abs(x.mean_return)));
                      const pct = maxAbs > 0 ? (Math.abs(s.mean_return) / maxAbs) * 100 : 0;
                      const isPos = s.mean_return >= 0;
                      const isSelected = s.name === activeName;
                      return (
                        <button
                          key={s.name}
                          type="button"
                          onClick={() => setSelectedName(s.name)}
                          className="w-full grid grid-cols-12 items-center gap-4 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-foreground/5 cursor-pointer"
                        >
                          <span
                            className={`col-span-3 font-mono text-xs uppercase tracking-[0.18em] ${isSelected ? "text-foreground" : "text-muted-foreground"}`}
                          >
                            {s.name}
                          </span>
                          <div className="col-span-7 h-2 overflow-hidden rounded-full bg-foreground/10">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                background: isPos ? "var(--sage)" : "var(--blush)",
                                opacity: isSelected ? 1 : 0.6,
                              }}
                            />
                          </div>
                          <span
                            className="col-span-2 text-right font-mono text-xs"
                            style={{ color: isPos ? "var(--sage)" : "var(--blush)" }}
                          >
                            {isPos ? "+" : ""}
                            {(active.mean_return * 100).toFixed(2) === (s.mean_return * 100).toFixed(2)
                              ? (s.mean_return * 100).toFixed(2)
                              : (s.mean_return * 100).toFixed(2)}
                            %
                          </span>
                        </button>
                      );
                    })}
                </div>
              </Panel>

              {/* Top recoveries */}
              <Panel label="Five biggest overreactions" className="md:col-span-6">
                <ul className="divide-y hairline">
                  {active.top_recoveries.map((row) => (
                    <li key={row.ticker + row.date} className="flex items-center justify-between py-4">
                      <div>
                        <div className="font-mono text-xs uppercase tracking-[0.2em]">{row.ticker}</div>
                        <div className="text-xs text-muted-foreground">{row.date}</div>
                      </div>
                      <div className="number text-2xl text-[var(--sage)]">
                        {row.return > 0 ? "+" : ""}
                        {row.return.toFixed(2)}%
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>

              {/* Worst false signals */}
              <Panel label="Five worst false signals" className="md:col-span-6">
                <ul className="divide-y hairline">
                  {active.worst_signals.map((row) => (
                    <li key={row.ticker + row.date} className="flex items-center justify-between py-4">
                      <div>
                        <div className="font-mono text-xs uppercase tracking-[0.2em]">{row.ticker}</div>
                        <div className="text-xs text-muted-foreground">{row.date}</div>
                      </div>
                      <div className="number text-2xl text-[var(--blush)]">
                        {row.return > 0 ? "+" : ""}
                        {row.return.toFixed(2)}%
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
}