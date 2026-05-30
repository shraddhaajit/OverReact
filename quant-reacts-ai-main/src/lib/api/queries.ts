import { api } from "./client";
import type {
  SummaryStats, ModelMetrics, SectorData,
  EventsResponse, PredictResponse,
} from "./types";

export const queries = {
  summary: {
    queryKey: ["summary"],
    queryFn: () => api.get<SummaryStats>("/summary"),
  },

  edaCharts: {
    queryKey: ["eda-charts"],
    queryFn: () => api.get<SummaryStats["eda"]>("/eda/charts"),
  },

  model: {
    queryKey: ["model"],
    queryFn: () => api.get<ModelMetrics>("/model"),
  },

  sectors: {
    queryKey: ["sectors"],
    queryFn: () => api.get<SectorData>("/sectors"),
  },

  events: (params?: {
    sector?: string;
    cause?: string;
    min_drop?: number;
    max_drop?: number;
    page?: number;
  }) => ({
    queryKey: ["events", params],
    queryFn: () =>
      api.get<EventsResponse>("/events", {
        sector:   params?.sector,
        cause:    params?.cause,
        min_drop: params?.min_drop,
        max_drop: params?.max_drop,
        page:     params?.page ?? 1,
      }),
  }),

  predict: (ticker: string, date: string) => ({
    queryKey: ["predict", ticker, date],
    queryFn: () =>
      api.post<PredictResponse>("/predict", { ticker, date }),
  }),
};