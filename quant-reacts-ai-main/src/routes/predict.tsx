import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { PageHeader, Panel } from "@/components/page-shell";
import type { PredictResponse } from "@/lib/api/types";

export const Route = createFileRoute("/predict")({
  head: () => ({
    meta: [
      { title: "OverReact — Predict an event" },
      { name: "description", content: "Submit a ticker and a date. See what the model thinks." },
    ],
  }),
  component: PredictView,
});

type Status = "idle" | "loading" | "success" | "error";

function PredictView() {
  const [ticker, setTicker]   = useState("TCS.NS");
  const [date, setDate]       = useState("");
  const [status, setStatus]   = useState<Status>("idle");
  const [result, setResult]   = useState<PredictResponse | null>(null);
  const [errorMsg, setError]  = useState("");
  const queryClient           = useQueryClient();

  const onRunPrediction = async () => {
    if (!ticker.trim() || !date) {
      setError("Please enter both a ticker and a date.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");
    setResult(null);

    try {
      const data = await api.post<PredictResponse>("/predict", {
        ticker: ticker.trim().toUpperCase(),
        date,
      });
      setResult(data);
      setStatus("success");
      // Invalidate events cache so /events reflects fresh predictions
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (e) {
      let msg = e instanceof Error ? e.message : "Unknown error";
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.detail) msg = parsed.detail;
      } catch {}
      setError(msg);
      setStatus("error");
    }
  };

  const prob     = result?.probability ?? 0;
  const isRecover = prob >= 50;

  return (
    <div className="mx-auto max-w-[1400px] px-6 md:px-12">
      <PageHeader
        eyebrow="View 05 — Predictor"
        title="Submit a drop."
        italic="See what we think."
      />

      <div className="mt-14 grid gap-6 md:grid-cols-12">
        {/* Input panel */}
        <Panel className="md:col-span-5" label="Inputs">
          <div className="space-y-6">
            <Field label="Ticker" hint="e.g. TCS.NS · RELIANCE.NS">
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="TCS.NS"
                className="w-full border-b hairline bg-transparent py-3 font-mono text-2xl uppercase tracking-wider focus:outline-none"
              />
            </Field>
            <Field label="Date" hint="of the sharp drop">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full border-b hairline bg-transparent py-3 font-mono text-2xl focus:outline-none"
              />
            </Field>
            <button
              type="button"
              onClick={onRunPrediction}
              disabled={status === "loading"}
              className="mt-4 inline-flex w-full items-center justify-center gap-3 rounded-full bg-foreground px-7 py-4 text-xs uppercase tracking-[0.28em] text-background transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {status === "loading" ? (
                <>
                  <Spinner />
                  Fetching data…
                </>
              ) : (
                <>
                  Run prediction
                  <span aria-hidden>→</span>
                </>
              )}
            </button>

            {status === "error" && (
              <div className="rounded-2xl border hairline bg-[var(--blush)]/10 px-4 py-3 text-sm text-muted-foreground">
                {errorMsg}
              </div>
            )}
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 border-t hairline pt-6">
            {[
              ["~5s",  "Data fetch"],
              ["7",    "Features"],
              ["1",    "Explanation"],
            ].map(([k, l]) => (
              <div key={l}>
                <div className="number text-3xl">{k}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>

          {/* Context breakdown (shown once we have a result) */}
          {result && (
            <div className="mt-6 border-t hairline pt-6 space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-3">
                Raw signals
              </div>
              {[
                ["Drop magnitude",   `${result.drop_magnitude.toFixed(2)}%`],
                ["Shock type",       result.context.market_also_dropped ? "Market-wide" : "Stock-specific"],
                ["Volume ratio",     `${result.context.volume_ratio.toFixed(2)}×`],
                ["Prior volatility", `${result.context.prior_volatility.toFixed(2)}%`],
                ["52w low dist.",    `${result.context.dist_from_52w_low.toFixed(1)}% above`],
                ["Sector",           result.context.sector],
                ["Cause",            result.cause_label.replace(/_/g, " ")],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-mono">{v}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Output panels */}
        <div className="md:col-span-7 grid gap-6 content-start">
          {/* Prediction */}
          <Panel label="Prediction">
            {status === "idle" && (
              <p className="text-sm text-muted-foreground">
                Enter a ticker and a date above, then run the prediction.
              </p>
            )}
            {status === "loading" && (
              <div className="space-y-4">
                <div className="h-20 animate-pulse rounded-lg bg-foreground/5" />
                <div className="h-4 animate-pulse rounded bg-foreground/5" />
              </div>
            )}
            {status === "success" && result && (
              <>
                <div className="flex items-end justify-between gap-6">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                      {result.ticker} · {result.date} · Probability of 5-day recovery
                    </div>
                    <div
                      className="number mt-3 text-8xl"
                      style={{ color: isRecover ? "var(--sage)" : "var(--blush)" }}
                    >
                      {prob.toFixed(0)}
                      <span className="text-3xl text-muted-foreground">%</span>
                    </div>
                  </div>
                  <span
                    className="rounded-full px-4 py-1.5 text-[10px] uppercase tracking-[0.25em]"
                    style={{
                      background: isRecover ? "var(--sage)" : "var(--blush)",
                      opacity: 0.7,
                    }}
                  >
                    {result.label === "recover" ? "Leans recover" : "Leans continue"}
                  </span>
                </div>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${prob}%`,
                      background: isRecover ? "var(--sage)" : "var(--blush)",
                    }}
                  />
                </div>
                {result.cached && (
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Cached result
                  </p>
                )}
              </>
            )}
          </Panel>

          {/* Feature contributions */}
          <Panel label="Feature contributions">
            {status === "loading" && (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-6 animate-pulse rounded bg-foreground/5" />
                ))}
              </div>
            )}
            {status === "success" && result && (
              <ul className="space-y-3">
                {result.features.map((f) => {
                  const maxVal = result.features[0]?.value ?? 1;
                  const pct = maxVal > 0 ? (f.value / maxVal) * 100 : 0;
                  return (
                    <li key={f.name} className="grid grid-cols-12 items-center gap-4">
                      <span className="col-span-4 text-sm truncate" title={f.name}>{f.name}</span>
                      <div className="col-span-6 h-2 overflow-hidden rounded-full bg-foreground/10">
                        <div className="h-full bg-foreground/70" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="col-span-2 text-right font-mono text-xs text-muted-foreground">
                        {f.raw}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {status === "idle" && (
              <p className="text-sm text-muted-foreground">Feature importances appear after prediction.</p>
            )}
          </Panel>

          {/* Plain English explanation */}
          <Panel label="In plain English">
            {status === "loading" && (
              <div className="space-y-3">
                <div className="h-6 w-full animate-pulse rounded bg-foreground/5" />
                <div className="h-6 w-4/5 animate-pulse rounded bg-foreground/5" />
                <div className="h-6 w-3/4 animate-pulse rounded bg-foreground/5" />
              </div>
            )}
            {status === "success" && result && (
              <>
                <p className="text-lg leading-relaxed text-foreground/85">
                  {result.explanation}
                </p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Generated · cause: {result.cause_label.replace(/_/g, " ")}
                  {result.cause_reason ? ` — ${result.cause_reason}` : ""}
                </p>
              </>
            )}
            {status === "idle" && (
              <p className="text-lg leading-relaxed text-muted-foreground">
                The model's reasoning will appear here after you run a prediction.
              </p>
            )}
            {status === "error" && (
              <p className="text-sm text-muted-foreground">
                {errorMsg.toLowerCase().includes("past") || errorMsg.toLowerCase().includes("future")
                  ? "Please enter a historical date — the model predicts recovery from past drops, not future ones."
                  : "Prediction failed. Check the error above and make sure the backend is running."}
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, hint, children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}