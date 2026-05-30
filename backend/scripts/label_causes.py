import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import time
import json
import pandas as pd
from groq import Groq
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

EVENTS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "events.csv")
CACHE_PATH  = os.path.join(os.path.dirname(__file__), "..", "data", "cause_labels.json")
SLEEP_SECS  = 1.5
VALID_CAUSES = [
    "earnings_miss", "macro_shock", "regulatory",
    "promoter_action", "sector_rotation", "unknown"
]

client = Groq(api_key=os.environ["GROQ_API_KEY"])

df = pd.read_csv(EVENTS_PATH)
cache: dict = {}
if os.path.exists(CACHE_PATH):
    with open(CACHE_PATH) as f:
        cache = json.load(f)

print(f"Total events: {len(df)} | Already labeled: {len(cache)}")

def make_key(ticker: str, date: str) -> str:
    return f"{ticker}_{date}"

def label_event(name: str, ticker: str, date: str, drop: float) -> dict:
    prompt = f"""You are a financial analyst with knowledge of Indian equity markets.

Stock: {name} ({ticker})
Date: {date}
Drop: {drop:.2f}% single-day decline

What was the most likely cause of this decline?
Respond ONLY with a valid JSON object, no markdown, no explanation:
{{"cause_category": "<one of: earnings_miss, macro_shock, regulatory, promoter_action, sector_rotation, unknown>",
  "confidence": "<high or low>",
  "brief_reason": "<one sentence, max 15 words>"}}"""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
        )
        text = response.choices[0].message.content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text.strip())
        if result.get("cause_category") not in VALID_CAUSES:
            result["cause_category"] = "unknown"
        return result
    except Exception as e:
        return {
            "cause_category": "unknown",
            "confidence": "low",
            "brief_reason": f"Could not determine. ({str(e)[:40]})"
        }

new_labels = 0
for _, row in df.iterrows():
    key = make_key(row["ticker"], row["date"])
    if key in cache:
        continue

    result = label_event(row["name"], row["ticker"], row["date"], row["drop_magnitude"])
    cache[key] = result
    new_labels += 1

    if new_labels % 10 == 0:
        with open(CACHE_PATH, "w") as f:
            json.dump(cache, f, indent=2)
        print(f"  Checkpoint — {new_labels} new labels")

    print(f"  {row['ticker']} {row['date']} → {result['cause_category']} ({result['confidence']})")
    time.sleep(SLEEP_SECS)

with open(CACHE_PATH, "w") as f:
    json.dump(cache, f, indent=2)

print(f"\nDone. {new_labels} new labels. Total: {len(cache)}")