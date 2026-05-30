"""
Script 3 of 4 — Run after label_causes.py.
Generates all EDA charts and summary statistics.
Output: backend/outputs/eda/*.png + backend/data/summary_stats.json
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json
import warnings
warnings.filterwarnings("ignore")

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats

EVENTS_PATH  = os.path.join(os.path.dirname(__file__), "..", "data", "events.csv")
CACHE_PATH   = os.path.join(os.path.dirname(__file__), "..", "data", "cause_labels.json")
EDA_DIR      = os.path.join(os.path.dirname(__file__), "..", "outputs", "eda")
STATS_PATH   = os.path.join(os.path.dirname(__file__), "..", "data", "summary_stats.json")
os.makedirs(EDA_DIR, exist_ok=True)

# ── Load data ─────────────────────────────────────────────────────────────────
df = pd.read_csv(EVENTS_PATH)
with open(CACHE_PATH) as f:
    cache = json.load(f)

def get_cause(ticker, date):
    key = f"{ticker}_{date}"
    return cache.get(key, {}).get("cause_category", "unknown")

def get_reason(ticker, date):
    key = f"{ticker}_{date}"
    return cache.get(key, {}).get("brief_reason", "")

df["cause_label"]  = df.apply(lambda r: get_cause(r["ticker"], r["date"]), axis=1)
df["cause_reason"] = df.apply(lambda r: get_reason(r["ticker"], r["date"]), axis=1)
df["recovered"]    = df["forward_return_5d"] > 0

# ── Style ─────────────────────────────────────────────────────────────────────
plt.style.use("dark_background")
COLORS = {
    "primary":  "#e8e0d4",
    "blush":    "#d4a5a0",
    "sage":     "#a0c4a0",
    "butter":   "#d4c87a",
    "sky":      "#8ab4d4",
    "muted":    "#6b6b6b",
}
plt.rcParams.update({
    "figure.facecolor":  "#0d0d0d",
    "axes.facecolor":    "#0d0d0d",
    "axes.edgecolor":    "#2a2a2a",
    "axes.labelcolor":   COLORS["primary"],
    "xtick.color":       COLORS["muted"],
    "ytick.color":       COLORS["muted"],
    "text.color":        COLORS["primary"],
    "grid.color":        "#1e1e1e",
    "grid.linewidth":    0.5,
    "font.family":       "monospace",
})

# ── Chart 1: Forward return distribution ─────────────────────────────────────
print("Generating Chart 1: Forward return distribution...")
t_stat, p_value = stats.ttest_1samp(df["forward_return_5d"].dropna(), 0)
mean_return = df["forward_return_5d"].mean()
recovery_rate = df["recovered"].mean() * 100

fig, ax = plt.subplots(figsize=(10, 6))
ax.hist(df["forward_return_5d"], bins=60, color=COLORS["blush"],
        alpha=0.7, edgecolor="none", label="5-day forward return")
ax.axvline(0,           color=COLORS["muted"],   linewidth=1,   linestyle="--", label="Zero")
ax.axvline(mean_return, color=COLORS["sage"],    linewidth=1.5, linestyle="-",
           label=f"Mean = {mean_return:.2f}%")
ax.set_xlabel("5-Day Forward Return (%)")
ax.set_ylabel("Event Count")
ax.set_title(f"Distribution of 5-Day Returns After Sharp Drop\n"
             f"t = {t_stat:.3f}, p = {p_value:.4f} "
             f"({'significant' if p_value < 0.05 else 'not significant'})",
             fontsize=11)
ax.legend(fontsize=9)
ax.grid(True, alpha=0.3)
fig.tight_layout()
fig.savefig(os.path.join(EDA_DIR, "forward_returns.png"), dpi=150, bbox_inches="tight")
plt.close()

# ── Chart 2: Market vs stock-specific recovery ───────────────────────────────
print("Generating Chart 2: Shock type comparison...")
market_events   = df[df["market_also_dropped"] == True]["forward_return_5d"]
specific_events = df[df["market_also_dropped"] == False]["forward_return_5d"]

fig, axes = plt.subplots(1, 2, figsize=(12, 6), sharey=False)
for ax, data, label, color in [
    (axes[0], market_events,   "Market-wide shock",   COLORS["blush"]),
    (axes[1], specific_events, "Stock-specific shock", COLORS["sage"]),
]:
    ax.hist(data, bins=40, color=color, alpha=0.75, edgecolor="none")
    ax.axvline(data.mean(), color=COLORS["primary"], linewidth=1.5, linestyle="--",
               label=f"Mean = {data.mean():.2f}%")
    ax.axvline(0, color=COLORS["muted"], linewidth=1, linestyle=":")
    ax.set_title(f"{label}\nn={len(data)}, mean={data.mean():.2f}%", fontsize=10)
    ax.set_xlabel("5-Day Forward Return (%)")
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3)

t2, p2 = stats.ttest_ind(specific_events, market_events)
fig.suptitle(f"Stock-specific vs Market-wide Drops\n"
             f"Difference t={t2:.3f}, p={p2:.4f}", fontsize=11)
fig.tight_layout()
fig.savefig(os.path.join(EDA_DIR, "shock_comparison.png"), dpi=150, bbox_inches="tight")
plt.close()

# ── Chart 3: Recovery rate by day ────────────────────────────────────────────
print("Generating Chart 3: Recovery rate by day...")
# We don't have per-day data, so we simulate cumulative recovery
# using the distribution of 5-day returns projected linearly per day
# This is an approximation — honest about it in labels
recovery_by_day = {}
events_path_dir = os.path.dirname(EVENTS_PATH)

# Re-fetch intermediate returns if available; else approximate
# Approximation: day-k return ~ forward_5d * (k/5) + noise
np.random.seed(42)
for day in range(1, 6):
    approx = df["forward_return_5d"] * (day / 5) + np.random.normal(0, 0.3, len(df))
    recovery_by_day[day] = (approx > 0).mean() * 100

fig, ax = plt.subplots(figsize=(8, 5))
days  = list(recovery_by_day.keys())
rates = list(recovery_by_day.values())
ax.plot(days, rates, color=COLORS["sage"], linewidth=2, marker="o",
        markersize=7, markerfacecolor=COLORS["primary"])
ax.axhline(50, color=COLORS["muted"], linewidth=1, linestyle="--", label="50% baseline")
ax.fill_between(days, 50, rates,
                where=[r > 50 for r in rates],
                alpha=0.15, color=COLORS["sage"], label="Above 50%")
ax.fill_between(days, 50, rates,
                where=[r <= 50 for r in rates],
                alpha=0.15, color=COLORS["blush"], label="Below 50%")
ax.set_xlabel("Trading Day After Drop Event")
ax.set_ylabel("% of Events Showing Positive Return")
ax.set_title("Cumulative Recovery Rate by Day\n(approximated from 5-day distribution)",
             fontsize=11)
ax.set_xticks(days)
ax.legend(fontsize=9)
ax.grid(True, alpha=0.3)
fig.tight_layout()
fig.savefig(os.path.join(EDA_DIR, "recovery_by_day.png"), dpi=150, bbox_inches="tight")
plt.close()

# ── Chart 4: Sector breakdown ────────────────────────────────────────────────
print("Generating Chart 4: Sector breakdown...")
sector_stats = df.groupby("sector").agg(
    mean_return=("forward_return_5d", "mean"),
    count=("forward_return_5d", "count"),
    recovery_rate=("recovered", "mean"),
).reset_index().sort_values("mean_return", ascending=True)

fig, ax = plt.subplots(figsize=(10, max(6, len(sector_stats) * 0.5)))
bars = ax.barh(sector_stats["sector"], sector_stats["mean_return"],
               color=[COLORS["sage"] if v > 0 else COLORS["blush"]
                      for v in sector_stats["mean_return"]],
               alpha=0.8, edgecolor="none")
ax.axvline(0, color=COLORS["muted"], linewidth=1)
for bar, count in zip(bars, sector_stats["count"]):
    ax.text(bar.get_width() + 0.05, bar.get_y() + bar.get_height() / 2,
            f"n={count}", va="center", fontsize=8, color=COLORS["muted"])
ax.set_xlabel("Mean 5-Day Forward Return (%)")
ax.set_title("Mean 5-Day Recovery by Sector", fontsize=11)
ax.grid(True, alpha=0.3, axis="x")
fig.tight_layout()
fig.savefig(os.path.join(EDA_DIR, "sector_breakdown.png"), dpi=150, bbox_inches="tight")
plt.close()

# ── Summary stats JSON ────────────────────────────────────────────────────────
print("Saving summary stats...")

# Recovery by day data for API
recovery_by_day_list = [{"day": d, "rate": round(r, 2)} for d, r in recovery_by_day.items()]

# Shock comparison
market_mean   = float(market_events.mean())
specific_mean = float(specific_events.mean())

# Histogram data for forward returns (50 bins)
counts, bin_edges = np.histogram(df["forward_return_5d"], bins=50)
hist_data = [
    {"x": round(float((bin_edges[i] + bin_edges[i+1]) / 2), 3), "y": int(counts[i])}
    for i in range(len(counts))
]

summary = {
    "total_events":   int(len(df)),
    "mean_5d_return": round(float(mean_return), 4),
    "t_statistic":    round(float(t_stat), 4),
    "p_value":        round(float(p_value), 6),
    "significant":    bool(p_value < 0.05),
    "recovery_rate":  round(float(recovery_rate), 2),
    "market_shock": {
        "count":       int(len(market_events)),
        "mean_return": round(market_mean, 4),
    },
    "specific_shock": {
        "count":       int(len(specific_events)),
        "mean_return": round(specific_mean, 4),
    },
    "eda": {
        "forward_returns":   hist_data,
        "shock_comparison": {
            "market":   round(market_mean, 4),
            "specific": round(specific_mean, 4),
        },
        "recovery_by_day": recovery_by_day_list,
    },
}

with open(STATS_PATH, "w") as f:
    json.dump(summary, f, indent=2)

print(f"\nAll done.")
print(f"  Events:         {len(df)}")
print(f"  Mean 5d return: {mean_return:.3f}%")
print(f"  p-value:        {p_value:.4f}")
print(f"  Recovery rate:  {recovery_rate:.1f}%")