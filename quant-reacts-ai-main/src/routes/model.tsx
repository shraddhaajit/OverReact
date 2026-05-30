import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/api/queries";
import { PageHeader, Panel } from "@/components/page-shell";
import type { ModelMetrics } from "@/lib/api/types";

export const Route = createFileRoute("/model")({
  head: () => ({
    meta: [
      { title: "OverReact — Model Performance" },
      { name: "description", content: "Evaluation of two classifiers." },
    ],
  }),
  component: ModelView,
});

type ModelKey = "lr" | "rf";

function ModelView() {
  const { data, isLoading, isError } = useQuery(queries.model);
  const [selected, setSelected] = useState<ModelKey>("rf");

  return (
    <div className="mx-auto max-w-[1400px] px-6 md:px-12">
      <PageHeader
        eyebrow="View 03 — Evaluation"
        title="What the model"
        italic="can, and cannot, do."
      />

      {/* Model toggle */}
      <div className="mt-14 inline-flex rounded-full border hairline p-1">
        {(["rf", "lr"] as ModelKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelected(key)}
            aria-pressed={selected === key}
            className={`rounded-full px-5 py-2 text-xs uppercase tracking-[0.22em] transition-colors cursor-pointer ${
              selected === key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {key === "rf" ? "Random Forest" : "Logistic Regression"}
          </button>
        ))}
      </div>

      {isLoading && <LoadingSkeleton />}

      {isError && (
        <div className="mt-6 rounded-2xl border hairline bg-[var(--blush)]/10 px-6 py-5 text-sm text-muted-foreground">
          Could not load model metrics — make sure the backend is running on port 8000.
        </div>
      )}

      {data && <MetricsGrid data={data} selected={selected} />}
    </div>
  );
}

function MetricsGrid({ data, selected }: { data: ModelMetrics; selected: ModelKey }) {
  const m = selected === "rf" ? data.rf : data.lr;
  const cm = m.confusion_matrix;
  const roc = m.roc_curve;

  // Build ROC path from fpr/tpr arrays — must use SVG path syntax, not polyline points
  const rocPoints = roc.fpr.map((x, i) => ({
    x: x * 280 + 10,
    y: 100 - roc.tpr[i] * 90 - 5,
  }));
  const rocPath =
    rocPoints.length > 0
      ? `M ${rocPoints[0].x},${rocPoints[0].y} ` +
        rocPoints.slice(1).map((p) => `L ${p.x},${p.y}`).join(" ")
      : "";

  // Total events in confusion matrix
  const total = cm.tn + cm.fp + cm.fn + cm.tp;

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-12">
      {/* AUC-ROC chart */}
      <Panel label="AUC — ROC curve" className="md:col-span-8">
        <div className="relative mt-2 h-80 overflow-hidden rounded-lg border hairline bg-background/30 p-4">
          <svg viewBox="0 0 300 110" className="h-full w-full">
            {/* Diagonal reference */}
            <line x1="10" y1="95" x2="290" y2="5" stroke="var(--muted)" strokeWidth="0.5" strokeDasharray="4,4" />
            {/* Fill under curve */}
            {rocPath && (
              <path
                d={`${rocPath} L 290,95 L 10,95 Z`}
                fill="var(--sage)"
                opacity="0.08"
              />
            )}
            {/* ROC curve */}
            {rocPath && (
              <path
                d={rocPath}
                fill="none"
                stroke="var(--sage)"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            )}
            {/* Axis labels */}
            <text x="150" y="108" textAnchor="middle" fontSize="5" fill="var(--muted)">False Positive Rate</text>
            <text x="4" y="50" textAnchor="middle" fontSize="5" fill="var(--muted)" transform="rotate(-90,4,50)">True Positive Rate</text>
          </svg>
          <div className="absolute bottom-3 right-4 font-mono text-[10px] text-muted-foreground">
            AUC = {(selected === "rf" ? data.auc_rf : data.auc_lr).toFixed(3)}
          </div>
        </div>
      </Panel>

      {/* Key numbers */}
      <div className="grid gap-6 md:col-span-4 content-start">
        <Panel label="AUC">
          <div className="number text-6xl">
            {(selected === "rf" ? data.auc_rf : data.auc_lr).toFixed(3)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Holdout · Sep–Dec 2023</p>
        </Panel>
        <Panel label="Precision / Recall / F1">
          <div className="grid grid-cols-3 gap-2 mt-1">
            {[
              { label: "Prec", value: m.precision },
              { label: "Rec", value: m.recall },
              { label: "F1", value: m.f1 },
            ].map((item) => (
              <div key={item.label}>
                <div className="number text-2xl">{item.value.toFixed(2)}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel label="Best model">
          <div className="font-mono text-sm uppercase tracking-[0.18em]">{data.best_model}</div>
          <div className="mt-1 text-xs text-muted-foreground">Chosen by AUC on holdout set.</div>
        </Panel>
      </div>

      {/* Confusion matrix */}
      <Panel label="Confusion matrix" className="md:col-span-5">
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border hairline bg-foreground/10 mt-2">
          <div className="bg-background/70 p-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">&nbsp;</div>
          <div className="bg-background/70 p-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Pred. recover</div>
          <div className="bg-background/70 p-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Pred. continue</div>

          <div className="bg-background/70 p-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Recovered</div>
          <div className="bg-[var(--sage)]/30 p-6 number text-3xl">
            {cm.tp}
            <div className="text-[10px] font-mono text-muted-foreground normal-nums">
              {((cm.tp / total) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="bg-background/70 p-6 number text-3xl text-muted-foreground">
            {cm.fn}
            <div className="text-[10px] font-mono text-muted-foreground normal-nums">
              {((cm.fn / total) * 100).toFixed(0)}%
            </div>
          </div>

          <div className="bg-background/70 p-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Continued</div>
          <div className="bg-background/70 p-6 number text-3xl text-muted-foreground">
            {cm.fp}
            <div className="text-[10px] font-mono text-muted-foreground normal-nums">
              {((cm.fp / total) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="bg-[var(--blush)]/30 p-6 number text-3xl">
            {cm.tn}
            <div className="text-[10px] font-mono text-muted-foreground normal-nums">
              {((cm.tn / total) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </Panel>

      {/* Feature importance */}
      <Panel label="Feature importance (Random Forest)" className="md:col-span-7">
        <ul className="space-y-3 mt-2">
          {data.feature_importance.map((f) => {
            const maxImp = data.feature_importance[0]?.importance ?? 1;
            const pct = (f.importance / maxImp) * 100;
            return (
              <li key={f.name} className="grid grid-cols-12 items-center gap-4">
                <span className="col-span-4 font-mono text-xs text-foreground/80 truncate" title={f.name}>
                  {f.name}
                </span>
                <div className="col-span-6 h-2 overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="h-full rounded-full bg-foreground/70"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="col-span-2 text-right font-mono text-xs text-muted-foreground">
                  {(f.importance * 100).toFixed(1)}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      {/* Honest disclaimer */}
      <Panel label="Note" className="md:col-span-12">
        <p className="font-serif text-2xl leading-snug md:text-3xl">
          A research instrument, not a trading signal.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Even at {((selected === "rf" ? data.auc_rf : data.auc_lr) * 100).toFixed(0)}% AUC, this model cannot
          be profitably traded. Transaction costs, bid-ask spreads on NSE, and
          execution slippage erode any theoretical edge before a trade is placed.
          The value is in understanding the statistical pattern — which features
          predict recovery and which don't — not in generating signals.
        </p>
      </Panel>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mt-6 grid gap-6 md:grid-cols-12">
      <div className="md:col-span-8 h-96 animate-pulse rounded-2xl bg-foreground/5" />
      <div className="md:col-span-4 grid gap-6">
        <div className="h-44 animate-pulse rounded-2xl bg-foreground/5" />
        <div className="h-44 animate-pulse rounded-2xl bg-foreground/5" />
      </div>
      <div className="md:col-span-12 h-48 animate-pulse rounded-2xl bg-foreground/5" />
    </div>
  );
}