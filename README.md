# OverReact

### Indian Stock Overreaction Analyzer

An end-to-end data science project testing the behavioral finance hypothesis of **market overreaction** in Indian equities. Built on **1,077 real sharp-drop events** across all NIFTY 50 stocks from 2021–2023.

> **Key finding:** AUC ~0.49 — short-term recovery is not reliably predictable from price-based features alone.

---

## Features

| Feature | Description |
|----------|-------------|
| Event Study | Detected 1,077 sharp-drop events (< -2.5%) across NIFTY 50 stocks |
| Statistical Analysis | Performed t-tests, sector-level analysis, and market vs stock-specific shock comparisons |
| ML Forecasting | Trained Logistic Regression and Random Forest models using chronological train/test splits |
| LLM Cause Labeling | Used LLaMA 3.1 via Groq to classify probable causes of stock declines |
| Live Inference Pipeline | Real-time feature generation, prediction, and explanation for user-submitted events |
| Interactive Dashboard | Multi-view React application for research findings, model evaluation, exploration, and prediction |

---

## Tech Stack

| Layer | Technology |
|---------|------------|
| Data | Python, pandas, yfinance |
| Machine Learning | scikit-learn, Logistic Regression, Random Forest |
| LLM | Groq API, LLaMA 3.1 8B |
| Backend | FastAPI, uvicorn |
| Frontend | React, TanStack Router, TanStack Query |
| Visualization | Recharts |
| Styling | Tailwind CSS |

---

## Research Findings

- Model AUC: **~0.49**
- Recovery was not reliably predictable using price-derived features alone.
- Most informative features:
  - Drop magnitude
  - Distance from 52-week low
  - Prior volatility
- LLM-generated cause labels provided limited additional predictive signal.

---

## Local Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd quant-reacts-ai-main
npm install
npm run dev
```

---

## Rebuilding the Dataset

```bash
python scripts/build_dataset.py
python scripts/label_causes.py
python scripts/run_eda.py
python scripts/train_model.py
```

---

## Disclaimer

This project is a research instrument for studying behavioral finance patterns in Indian equities. It is not a trading strategy or investment recommendation.
