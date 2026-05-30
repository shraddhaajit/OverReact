"""
FastAPI backend for OverReact.
Run with: uvicorn main:app --reload --port 8000
"""

import os
import sys
import json
import time
import warnings
warnings.filterwarnings("ignore")

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import numpy as np
import yfinance as yf
import joblib
from groq import Groq
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])

# ── Paths ─────────────────────────────────────────────────────────────────────
DATA_DIR     = os.path.join(os.path.dirname(__file__), "data")
EVENTS_PATH  = os.path.join(DATA_DIR, "events.csv")
CACHE_PATH   = os.path.join(DATA_DIR, "cause_labels.json")
STATS_PATH   = os.path.join(DATA_DIR, "summary_stats.json")
METRICS_PATH = os.path.join(DATA_DIR, "model_metrics.json")
MODEL_PATH   = os.path.join(DATA_DIR, "model.pkl")

# ── Load everything at startup ────────────────────────────────────────────────
print("Loading data...")
events_df = pd.read_csv(EVENTS_PATH)
with open(CACHE_PATH)   as f: cause_cache   = json.load(f)
with open(STATS_PATH)   as f: summary_stats = json.load(f)
with open(METRICS_PATH) as f: model_metrics = json.load(f)
artifact = joblib.load(MODEL_PATH)

model         = artifact["model"]
feature_names = artifact["feature_names"]
causes_list   = artifact["cause_categories"]
sectors_list  = artifact["sectors"]

events_df["cause_label"] = events_df.apply(
    lambda r: cause_cache.get(f"{r['ticker']}_{r['date']}", {}).get("cause_category", "unknown"),
    axis=1
)
events_df["cause_reason"] = events_df.apply(
    lambda r: cause_cache.get(f"{r['ticker']}_{r['date']}", {}).get("brief_reason", ""),
    axis=1
)
events_df["recovered"] = events_df["forward_return_5d"] > 0

explanation_cache: dict = {}

print(f"Ready. {len(events_df)} events loaded.")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="OverReact API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:4000",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://*.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Feature engineering ───────────────────────────────────────────────────────
def engineer_features_single(
    drop_magnitude: float,
    market_also_dropped: bool,
    volume_ratio: float,
    prior_volatility_20d: float,
    dist_from_52w_low: float,
    cause_label: str,
    sector: str,
) -> pd.DataFrame:
    row = {}
    row["drop_magnitude"]       = abs(drop_magnitude)
    row["market_also_dropped"]  = int(market_also_dropped)
    row["volume_ratio"]         = min(volume_ratio, 10)
    row["prior_volatility_20d"] = prior_volatility_20d
    row["dist_from_52w_low"]    = dist_from_52w_low

    for cause in causes_list:
        row[f"cause_{cause}"] = int(cause_label == cause)

    for sector_name in sectors_list:
        row[f"sector_{sector_name}"] = int(sector == sector_name)

    X = pd.DataFrame([row])[feature_names]
    return X

# ── Groq explanation ──────────────────────────────────────────────────────────
def get_explanation(
    ticker: str, date: str, drop: float, probability: float,
    market_dropped: bool, volume_ratio: float,
    prior_vol: float, dist_52w: float,
    cause_label: str, cause_reason: str,
) -> tuple[str, bool]:
    cache_key = f"{ticker}_{date}"
    if cache_key in explanation_cache:
        return explanation_cache[cache_key], True

    prompt = f"""You are explaining a machine learning model's prediction to a retail investor in India.

Event: {ticker} dropped {drop:.2f}% on {date}
Model prediction: {probability:.0f}% probability of recovery within 5 trading days

Key signals the model used:
- This was a {"market-wide shock (NIFTY also fell >1%)" if market_dropped else "stock-specific drop (NIFTY was flat or up)"}
- Volume on drop day was {volume_ratio:.1f}x the 20-day average
- Prior 20-day volatility was {prior_vol:.2f}% (NIFTY average is ~0.9%)
- Stock was {dist_52w:.1f}% above its 52-week low
- Likely cause: {cause_label.replace("_", " ")} — {cause_reason}

Write exactly 3 sentences. Plain English. No jargon. No investment advice disclaimer.
Sentence 1: what the signals suggest about why the stock dropped.
Sentence 2: what the model is picking up that makes it lean toward recovery or continuation.
Sentence 3: one honest caveat about the limits of this prediction."""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        text = response.choices[0].message.content.strip()
        explanation_cache[cache_key] = text
        return text, False
    except Exception as e:
        return f"Explanation unavailable: {str(e)}", False

# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {"status": "ok", "events_loaded": len(events_df)}


@app.get("/summary")
def get_summary():
    return summary_stats


@app.get("/eda/charts")
def get_eda_charts():
    return summary_stats.get("eda", {})


@app.get("/model")
def get_model_metrics():
    lr = model_metrics["logistic_regression"]
    rf = model_metrics["random_forest"]
    return {
        "best_model":         model_metrics["best_model"],
        "auc_lr":             lr["auc"],
        "auc_rf":             rf["auc"],
        "lr":                 lr,
        "rf":                 rf,
        "feature_importance": model_metrics["feature_importance"],
        "confusion_matrix":   rf["confusion_matrix"],
    }


@app.get("/sectors")
def get_sectors():
    sector_groups = events_df.groupby("sector")
    result = []
    for sector_name, group in sector_groups:
        top = group.nlargest(5, "forward_return_5d")[
            ["ticker", "date", "forward_return_5d"]
        ].rename(columns={"forward_return_5d": "return"}).to_dict("records")

        worst = group.nsmallest(5, "forward_return_5d")[
            ["ticker", "date", "forward_return_5d"]
        ].rename(columns={"forward_return_5d": "return"}).to_dict("records")

        result.append({
            "name":           sector_name,
            "mean_return":    round(float(group["forward_return_5d"].mean()), 4),
            "event_count":    int(len(group)),
            "recovery_rate":  round(float(group["recovered"].mean() * 100), 2),
            "top_recoveries": top,
            "worst_signals":  worst,
        })

    return {"sectors": sorted(result, key=lambda x: x["mean_return"], reverse=True)}


@app.get("/events")
def get_events(
    sector:   Optional[str]   = Query(None),
    cause:    Optional[str]   = Query(None),
    min_drop: Optional[float] = Query(None),
    max_drop: Optional[float] = Query(None),
    page:     int             = Query(1, ge=1),
    per_page: int             = Query(50, ge=1, le=200),
):
    df = events_df.copy()

    if sector:   df = df[df["sector"] == sector]
    if cause:    df = df[df["cause_label"] == cause]
    if min_drop is not None: df = df[df["drop_magnitude"] >= min_drop]
    if max_drop is not None: df = df[df["drop_magnitude"] <= max_drop]

    total   = len(df)
    start   = (page - 1) * per_page
    end     = start + per_page
    page_df = df.iloc[start:end]

    rows = []
    for _, row in page_df.iterrows():
        try:
            X = engineer_features_single(
                drop_magnitude=row["drop_magnitude"],
                market_also_dropped=bool(row["market_also_dropped"]),
                volume_ratio=row["volume_ratio"],
                prior_volatility_20d=row["prior_volatility_20d"],
                dist_from_52w_low=row["dist_from_52w_low"],
                cause_label=row["cause_label"],
                sector=row["sector"],
            )
            prob = float(model.predict_proba(X)[0][1]) * 100
        except Exception:
            prob = 50.0

        rows.append({
            "ticker":                row["ticker"],
            "name":                  row["name"],
            "date":                  row["date"],
            "drop_magnitude":        round(float(row["drop_magnitude"]), 4),
            "sector":                row["sector"],
            "cause_label":           row["cause_label"],
            "cause_reason":          row["cause_reason"],
            "volume_ratio":          round(float(row["volume_ratio"]), 4),
            "market_also_dropped":   bool(row["market_also_dropped"]),
            "forward_return_5d":     round(float(row["forward_return_5d"]), 4),
            "recovered":             bool(row["recovered"]),
            "predicted_probability": round(prob, 1),
        })

    return {"events": rows, "total": total, "page": page, "per_page": per_page}


# ── POST /predict ─────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    ticker: str
    date:   str

@app.post("/predict")
def predict(req: PredictRequest):
    ticker = req.ticker.upper().strip()
    date   = req.date.strip()

    # Validate date is not in the future
    from datetime import datetime, timedelta, date as date_type
    try:
        event_dt = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD.")

    if event_dt.date() >= date_type.today():
        raise HTTPException(400, "Date must be in the past. Please enter a historical drop date.")

    if event_dt.date() < date_type(2000, 1, 1):
        raise HTTPException(400, "Date too far in the past. Please use a date after 2000.")

    # 1. Fetch data around the event date
    try:
        event_dt  = datetime.strptime(date, "%Y-%m-%d")
        start_dt  = (event_dt - timedelta(days=90)).strftime("%Y-%m-%d")
        end_dt    = (event_dt + timedelta(days=10)).strftime("%Y-%m-%d")

        df_stock = yf.download(ticker, start=start_dt, end=end_dt,
                               progress=False, auto_adjust=True)
        if df_stock.empty:
            raise HTTPException(400, f"No data found for {ticker}")

        if isinstance(df_stock.columns, pd.MultiIndex):
            df_stock.columns = df_stock.columns.get_level_values(0)

        df_stock = df_stock[["Close", "Volume"]].copy()
        df_stock.index = pd.to_datetime(df_stock.index)
        df_stock = df_stock.sort_index()

        event_ts = pd.Timestamp(date)
        if event_ts not in df_stock.index:
            before = df_stock.index[df_stock.index <= event_ts]
            if len(before) == 0:
                raise HTTPException(400, f"No trading data found near {date}")
            event_ts = before[-1]

        event_loc = df_stock.index.get_loc(event_ts)
        if event_loc == 0:
            raise HTTPException(400, "Not enough historical data before this date")

        event_close = float(df_stock.iloc[event_loc]["Close"])
        prev_close  = float(df_stock.iloc[event_loc - 1]["Close"])
        drop_magnitude = (event_close - prev_close) / prev_close * 100

        vol_window = df_stock["Volume"].iloc[max(0, event_loc-20):event_loc]
        vol_avg    = float(vol_window.mean()) if len(vol_window) > 0 else 1
        event_vol  = float(df_stock.iloc[event_loc]["Volume"])
        volume_ratio = event_vol / vol_avg if vol_avg > 0 else 1.0

        ret_window = df_stock["Close"].iloc[max(0, event_loc-21):event_loc].pct_change().dropna()
        prior_vol  = float(ret_window.std() * 100) if len(ret_window) > 1 else 1.0

        low_window    = df_stock["Close"].iloc[max(0, event_loc-252):event_loc]
        low_52w       = float(low_window.min()) if len(low_window) > 0 else event_close
        dist_from_low = (event_close - low_52w) / low_52w * 100 if low_52w > 0 else 0.0

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Data fetch error: {str(e)}")

    # 2. Fetch NIFTY to check market-wide drop
    try:
        nifty = yf.download("^NSEI", start=start_dt, end=end_dt,
                            progress=False, auto_adjust=True)
        if isinstance(nifty.columns, pd.MultiIndex):
            nifty.columns = nifty.columns.get_level_values(0)
        nifty.index = pd.to_datetime(nifty.index)
        if event_ts in nifty.index:
            nifty_loc = nifty.index.get_loc(event_ts)
            if nifty_loc > 0:
                n_close = float(nifty.iloc[nifty_loc]["Close"])
                n_prev  = float(nifty.iloc[nifty_loc - 1]["Close"])
                nifty_ret = (n_close - n_prev) / n_prev * 100
                market_also_dropped = nifty_ret < -1.0
            else:
                market_also_dropped = False
        else:
            market_also_dropped = False
    except Exception:
        market_also_dropped = False

    # 3. Determine sector
    from data.nifty50_tickers import NIFTY50
    ticker_map = {s["ticker"]: s for s in NIFTY50}
    stock_info = ticker_map.get(ticker, {})
    sector     = stock_info.get("sector", sectors_list[0] if sectors_list else "IT")
    stock_name = stock_info.get("name", ticker)

    # 4. Get cause label
    cache_key = f"{ticker}_{date}"
    if cache_key in cause_cache:
        cause_label  = cause_cache[cache_key].get("cause_category", "unknown")
        cause_reason = cause_cache[cache_key].get("brief_reason", "")
    else:
        try:
            prompt = f"""Stock: {stock_name} ({ticker})
Date: {date}
Drop: {drop_magnitude:.2f}%
What was the most likely cause? Respond ONLY with JSON:
{{"cause_category": "<earnings_miss|macro_shock|regulatory|promoter_action|sector_rotation|unknown>",
 "confidence": "<high|low>",
 "brief_reason": "<max 15 words>"}}"""
            resp = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
            )
            text = resp.choices[0].message.content.strip()
            text = text.replace("```json", "").replace("```", "").strip()
            parsed       = json.loads(text)
            cause_label  = parsed.get("cause_category", "unknown")
            cause_reason = parsed.get("brief_reason", "")
        except Exception:
            cause_label  = "unknown"
            cause_reason = ""

    # 5. Build features and predict
    X    = engineer_features_single(
        drop_magnitude=drop_magnitude,
        market_also_dropped=market_also_dropped,
        volume_ratio=volume_ratio,
        prior_volatility_20d=prior_vol,
        dist_from_52w_low=dist_from_low,
        cause_label=cause_label,
        sector=sector,
    )
    prob  = float(model.predict_proba(X)[0][1]) * 100
    label = "recover" if prob >= 50 else "continue"

    # 6. Feature contributions
    if hasattr(model, "feature_importances_"):
        raw_imp = model.feature_importances_
    else:
        raw_imp = np.abs(model.named_steps["model"].coef_[0])

    total_imp = raw_imp.sum() if raw_imp.sum() > 0 else 1
    imp_map   = {name: raw_imp[i] / total_imp * 100 for i, name in enumerate(feature_names)}

    feature_display = [
        {
            "name":  "Stock-specific shock" if not market_also_dropped else "Market-wide shock",
            "value": round(imp_map.get("market_also_dropped", 0), 1),
            "raw":   "NIFTY flat/up" if not market_also_dropped else "NIFTY fell >1%",
        },
        {
            "name":  "Volume vs average",
            "value": round(imp_map.get("volume_ratio", 0), 1),
            "raw":   f"{volume_ratio:.1f}×",
        },
        {
            "name":  "Prior volatility",
            "value": round(imp_map.get("prior_volatility_20d", 0), 1),
            "raw":   f"{prior_vol:.2f}%",
        },
        {
            "name":  "Distance from 52w low",
            "value": round(imp_map.get("dist_from_52w_low", 0), 1),
            "raw":   f"{dist_from_low:.1f}% above",
        },
        {
            "name":  f"Cause: {cause_label.replace('_', ' ')}",
            "value": round(imp_map.get(f"cause_{cause_label}", 0), 1),
            "raw":   cause_reason if cause_reason else "—",
        },
    ]
    feature_display.sort(key=lambda x: x["value"], reverse=True)

    # 7. LLM explanation
    explanation, cached = get_explanation(
        ticker=ticker, date=date, drop=drop_magnitude,
        probability=prob, market_dropped=market_also_dropped,
        volume_ratio=volume_ratio, prior_vol=prior_vol,
        dist_52w=dist_from_low, cause_label=cause_label,
        cause_reason=cause_reason,
    )

    return {
        "ticker":         ticker,
        "date":           str(event_ts.date()),
        "drop_magnitude": round(drop_magnitude, 4),
        "probability":    round(prob, 1),
        "label":          label,
        "features":       feature_display,
        "explanation":    explanation,
        "cause_label":    cause_label,
        "cause_reason":   cause_reason,
        "cached":         cached,
        "context": {
            "market_also_dropped": market_also_dropped,
            "volume_ratio":        round(volume_ratio, 3),
            "prior_volatility":    round(prior_vol, 4),
            "dist_from_52w_low":   round(dist_from_low, 4),
            "sector":              sector,
        },
    }