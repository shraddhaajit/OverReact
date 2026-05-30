export interface SummaryStats {
  total_events: number;
  mean_5d_return: number;
  t_statistic: number;
  p_value: number;
  significant: boolean;
  recovery_rate: number;
  market_shock: { count: number; mean_return: number };
  specific_shock: { count: number; mean_return: number };
  eda: {
    forward_returns: { x: number; y: number }[];
    shock_comparison: { market: number; specific: number };
    recovery_by_day: { day: number; rate: number }[];
  };
}

export interface ModelMetrics {
  best_model: string;
  auc_lr: number;
  auc_rf: number;
  lr: ModelDetail;
  rf: ModelDetail;
  feature_importance: { name: string; importance: number }[];
  confusion_matrix: { tn: number; fp: number; fn: number; tp: number };
}

export interface ModelDetail {
  auc: number;
  precision: number;
  recall: number;
  f1: number;
  confusion_matrix: { tn: number; fp: number; fn: number; tp: number };
  roc_curve: { fpr: number[]; tpr: number[] };
}

export interface SectorData {
  sectors: {
    name: string;
    mean_return: number;
    event_count: number;
    recovery_rate: number;
    top_recoveries: { ticker: string; date: string; return: number }[];
    worst_signals: { ticker: string; date: string; return: number }[];
  }[];
}

export interface EventsResponse {
  events: Event[];
  total: number;
  page: number;
  per_page: number;
}

export interface Event {
  ticker: string;
  name: string;
  date: string;
  drop_magnitude: number;
  sector: string;
  cause_label: string;
  cause_reason: string;
  volume_ratio: number;
  market_also_dropped: boolean;
  forward_return_5d: number;
  recovered: boolean;
  predicted_probability: number;
}

export interface PredictResponse {
  ticker: string;
  date: string;
  drop_magnitude: number;
  probability: number;
  label: "recover" | "continue";
  features: { name: string; value: number; raw: string }[];
  explanation: string;
  cause_label: string;
  cause_reason: string;
  cached: boolean;
  context: {
    market_also_dropped: boolean;
    volume_ratio: number;
    prior_volatility: number;
    dist_from_52w_low: number;
    sector: string;
  };
}