"""
Script 1 of 4 — Run this first.
Fetches 3 years of daily OHLCV data for all NIFTY50 stocks,
detects sharp drop events (< -2.5% single-day return),
computes all features, and saves events.csv.

Runtime: 15–40 minutes depending on yfinance throttling.
Output: backend/data/events.csv
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import time
import warnings
warnings.filterwarnings("ignore")

import pandas as pd
import numpy as np
import yfinance as yf
from data.nifty50_tickers import NIFTY50, NIFTY_INDEX_TICKER

# ── Config ────────────────────────────────────────────────────────────────────
START_DATE        = "2021-01-01"
END_DATE          = "2023-12-31"
DROP_THRESHOLD    = -2.5          # percent — events below this are flagged
SLEEP_BETWEEN     = 1.5           # seconds between yfinance calls
OUTPUT_PATH       = os.path.join(os.path.dirname(__file__), "..", "data", "events.csv")

# ── Step 1: Fetch NIFTY index to classify market-wide drops ──────────────────
print("Fetching NIFTY50 index...")
nifty_df = yf.download(NIFTY_INDEX_TICKER, start=START_DATE, end=END_DATE,
                        progress=False, auto_adjust=True)
nifty_df = nifty_df[["Close"]].copy()
nifty_df.index = pd.to_datetime(nifty_df.index)
# Flatten MultiIndex columns if present
if isinstance(nifty_df.columns, pd.MultiIndex):
    nifty_df.columns = nifty_df.columns.get_level_values(0)
nifty_df["nifty_return"] = nifty_df["Close"].pct_change() * 100
nifty_returns = nifty_df["nifty_return"].to_dict()
print(f"  Got {len(nifty_df)} NIFTY index rows.")

# ── Step 2: Fetch each stock and detect events ────────────────────────────────
all_events = []

for i, stock in enumerate(NIFTY50):
    ticker  = stock["ticker"]
    name    = stock["name"]
    sector  = stock["sector"]

    print(f"[{i+1}/{len(NIFTY50)}] {ticker}...", end=" ", flush=True)

    try:
        df = yf.download(ticker, start=START_DATE, end=END_DATE,
                         progress=False, auto_adjust=True)

        if df.empty or len(df) < 60:
            print("SKIP (insufficient data)")
            time.sleep(SLEEP_BETWEEN)
            continue

        # Flatten MultiIndex columns
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
        df.index = pd.to_datetime(df.index)
        df = df.sort_index()

        # Daily return
        df["return_1d"] = df["Close"].pct_change() * 100

        # 20-day rolling volatility (std of returns)
        df["vol_20d"] = df["return_1d"].rolling(20).std()

        # 20-day average volume for volume ratio
        df["vol_avg_20d"] = df["Volume"].rolling(20).mean()

        # Rolling 52-week high and low
        df["high_52w"] = df["Close"].rolling(252).max()
        df["low_52w"]  = df["Close"].rolling(252).min()

        # Distance from 52-week low (%)
        df["dist_from_52w_low"] = (df["Close"] - df["low_52w"]) / df["low_52w"] * 100

        # Drop events only
        event_rows = df[df["return_1d"] < DROP_THRESHOLD].copy()

        if event_rows.empty:
            print(f"0 events")
            time.sleep(SLEEP_BETWEEN)
            continue

        for event_date, row in event_rows.iterrows():
            # Forward 5-day return: close 5 trading days after event
            future_idx = df.index.get_loc(event_date)
            if future_idx + 5 >= len(df):
                continue  # not enough future data

            future_close   = df.iloc[future_idx + 5]["Close"]
            event_close    = row["Close"]
            forward_return = (future_close - event_close) / event_close * 100

            # Was this a market-wide drop?
            nifty_ret = nifty_returns.get(event_date, np.nan)
            market_also_dropped = bool(
                not np.isnan(nifty_ret) and nifty_ret < -1.0
            )

            # Volume ratio — avoid div by zero
            vol_avg = row["vol_avg_20d"]
            volume_ratio = (
                float(row["Volume"]) / float(vol_avg)
                if vol_avg and vol_avg > 0
                else 1.0
            )

            all_events.append({
                "ticker":               ticker,
                "name":                 name,
                "sector":               sector,
                "date":                 event_date.strftime("%Y-%m-%d"),
                "drop_magnitude":       round(float(row["return_1d"]), 4),
                "close_price":          round(float(event_close), 2),
                "volume_ratio":         round(volume_ratio, 4),
                "prior_volatility_20d": round(float(row["vol_20d"]), 4)
                                        if not np.isnan(row["vol_20d"]) else None,
                "dist_from_52w_low":    round(float(row["dist_from_52w_low"]), 4)
                                        if not np.isnan(row["dist_from_52w_low"]) else None,
                "market_also_dropped":  market_also_dropped,
                "forward_return_5d":    round(forward_return, 4),
            })

        print(f"{len(event_rows)} events")

    except Exception as e:
        print(f"ERROR: {e}")

    time.sleep(SLEEP_BETWEEN)

# ── Step 3: Save ──────────────────────────────────────────────────────────────
events_df = pd.DataFrame(all_events)
events_df = events_df.dropna(subset=["prior_volatility_20d", "dist_from_52w_low"])
events_df = events_df.sort_values("date").reset_index(drop=True)

events_df.to_csv(OUTPUT_PATH, index=False)

print(f"\nDone. {len(events_df)} events saved to {OUTPUT_PATH}")
print(events_df[["ticker", "date", "drop_magnitude", "forward_return_5d"]].head(10))