import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/api/queries";
import { PageHeader, Panel } from "@/components/page-shell";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "OverReact — Event Explorer" },
      { name: "description", content: "Every flagged drop event, filterable." },
    ],
  }),
  component: EventsView,
});

const SECTORS = ["All", "IT", "Banking", "Energy", "FMCG", "Auto", "Metals", "Cement", "Finance", "Consumer", "Pharma"];
const CAUSES  = ["All", "earnings_miss", "macro_shock", "regulatory", "promoter_action", "sector_rotation", "unknown"];

function EventsView() {
  const [sector, setSector]     = useState("");
  const [cause, setCause]       = useState("");
  const [minDrop, setMinDrop]   = useState<number | undefined>();
  const [page, setPage]         = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const params = {
    sector:   sector || undefined,
    cause:    cause  || undefined,
    min_drop: minDrop,
    page,
  };

  const { data, isLoading, isError, isFetching } = useQuery({
    ...queries.events(params),
    placeholderData: (prev) => prev,
  });

  const events    = data?.events    ?? [];
  const total     = data?.total     ?? 0;
  const perPage   = data?.per_page  ?? 50;
  const totalPages = Math.ceil(total / perPage);

  const reset = () => {
    setSector(""); setCause(""); setMinDrop(undefined); setPage(1);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-6 md:px-12">
      <PageHeader
        eyebrow="View 04 — Catalog"
        title="One thousand,"
        italic="eight hundred drops."
      />

      {/* Filter bar */}
      <div className="mt-14 grid gap-3 md:grid-cols-12">
        <Panel className="md:col-span-3" label="Sector">
          <FilterSelect
            value={sector}
            onChange={(v) => { setSector(v); setPage(1); }}
            options={SECTORS}
            nullLabel="All sectors"
          />
        </Panel>
        <Panel className="md:col-span-3" label="Cause">
          <FilterSelect
            value={cause}
            onChange={(v) => { setCause(v); setPage(1); }}
            options={CAUSES}
            nullLabel="All causes"
          />
        </Panel>
        <Panel className="md:col-span-3" label="Min drop magnitude (%)">
          <input
            type="number"
            step="0.5"
            min="2.5"
            max="20"
            placeholder="e.g. 3.5"
            value={minDrop ?? ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setMinDrop(isNaN(v) ? undefined : v);
              setPage(1);
            }}
            className="w-full rounded-md border hairline bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/40"
          />
        </Panel>
        <Panel className="md:col-span-3" label="Actions">
          <button
            type="button"
            onClick={reset}
            className="w-full rounded-md border hairline px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            Reset filters
          </button>
        </Panel>
      </div>

      {/* Status bar */}
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {isLoading ? "Loading…" : `${total.toLocaleString()} events`}
          {isFetching && !isLoading && " · Updating…"}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-full border hairline px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 cursor-pointer"
            >
              ← Prev
            </button>
            <span className="font-mono text-[10px] text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-full border hairline px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 cursor-pointer"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {isError && (
        <div className="mt-4 rounded-2xl border hairline bg-[var(--blush)]/10 px-6 py-5 text-sm text-muted-foreground">
          Could not load events — make sure the backend is running on port 8000.
        </div>
      )}

      {/* Table */}
      <Panel className="mt-4" label={`${events.length} of ${total.toLocaleString()} events shown`}>
        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-foreground/5" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {["Ticker", "Date", "Sector", "Drop", "Shock", "Cause", "5d Return", "p(recover)"].map((h) => (
                    <th key={h} className="border-b hairline pb-3 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => {
                  const rowKey = `${evt.ticker}_${evt.date}`;
                  const isExpanded = expanded === rowKey;
                  return (
                    <React.Fragment key={rowKey}>
                      <tr
                        onClick={() => setExpanded(isExpanded ? null : rowKey)}
                        className="border-b hairline transition-colors hover:bg-foreground/[0.03] cursor-pointer"
                      >
                        <td className="py-4 font-mono text-xs">{evt.ticker}</td>
                        <td className="py-4 text-muted-foreground whitespace-nowrap">{evt.date}</td>
                        <td className="py-4">{evt.sector}</td>
                        <td className="py-4 number text-[var(--blush)]">
                          {evt.drop_magnitude.toFixed(2)}%
                        </td>
                        <td className="py-4 text-xs uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
                          {evt.market_also_dropped ? "Market-wide" : "Specific"}
                        </td>
                        <td className="py-4">
                          <span className="rounded-full border hairline px-3 py-1 text-[10px] uppercase tracking-[0.18em] whitespace-nowrap">
                            {evt.cause_label.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td
                          className={`py-4 number whitespace-nowrap ${
                            evt.forward_return_5d >= 0 ? "text-[var(--sage)]" : "text-[var(--blush)]"
                          }`}
                        >
                          {evt.forward_return_5d > 0 ? "+" : ""}
                          {evt.forward_return_5d.toFixed(2)}%
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-foreground/10">
                              <div
                                className="h-full bg-foreground/70"
                                style={{ width: `${evt.predicted_probability}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs text-muted-foreground">
                              {evt.predicted_probability.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b hairline bg-foreground/[0.02]">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="grid gap-4 md:grid-cols-3 text-sm">
                              <div>
                                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">AI Cause</div>
                                <span className="rounded-full border hairline px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                                  {evt.cause_label.replace(/_/g, " ")}
                                </span>
                                {evt.cause_reason && (
                                  <p className="mt-2 text-xs text-muted-foreground">{evt.cause_reason}</p>
                                )}
                              </div>
                              <div>
                                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Model Prediction</div>
                                <div className="number text-2xl">
                                  {evt.predicted_probability.toFixed(1)}%
                                  <span className="ml-2 text-xs font-mono text-muted-foreground">
                                    {evt.predicted_probability >= 50 ? "↑ recover" : "↓ continue"}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Actual Outcome</div>
                                <div className={`number text-2xl ${evt.recovered ? "text-[var(--sage)]" : "text-[var(--blush)]"}`}>
                                  {evt.recovered ? "✓ Recovered" : "✗ Continued"}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  5d return: {evt.forward_return_5d > 0 ? "+" : ""}{evt.forward_return_5d.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {events.length === 0 && !isLoading && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No events match these filters.
              </div>
            )}
          </div>
        )}
      </Panel>

      {/* Pagination footer */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-full border hairline px-5 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 cursor-pointer"
          >
            ← Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border hairline px-5 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 cursor-pointer"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  options, value, onChange, nullLabel,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  nullLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value === nullLabel ? "" : e.target.value)}
      className="w-full rounded-md border hairline bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/40"
    >
      <option value="">{nullLabel}</option>
      {options.filter((o) => o !== "All").map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}