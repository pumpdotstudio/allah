/* ================================================================== */
/*  allah — API client                                                */
/* ================================================================== */

import type {
  DataPoint,
  MarketToken,
  SubmissionPayload,
  SubmitResult,
} from "./types.js";

const API_BASE = process.env.PUMP_API_BASE || "https://api.pump.studio";

export class PumpStudioClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, baseUrl = API_BASE) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private headers(json = false): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const opts: RequestInit = { method, headers: this.headers(!!body) };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const text = await res.text();

    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      throw new Error(`${method} ${path} returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
    }

    if (!res.ok) {
      const errMsg = (data as any)?.error ?? `HTTP ${res.status}`;
      throw new Error(`${method} ${path}: ${errMsg}`);
    }

    return data;
  }

  async getMarket(tab: "all" | "live" | "new" | "graduated" = "all", limit = 10): Promise<MarketToken[]> {
    const res = await this.request<{ ok: boolean; data?: MarketToken[] }>(
      "GET",
      `/api/v1/market?tab=${tab}&limit=${limit}&format=json`,
    );
    return res.data ?? [];
  }

  async getDataPoint(mint: string): Promise<DataPoint> {
    const res = await this.request<{ ok: boolean; data?: DataPoint }>(
      "GET",
      `/api/v1/datapoint?mint=${mint}`,
    );
    if (!res.data) throw new Error(`No DataPoint returned for ${mint}`);
    return res.data;
  }

  async submitAnalysis(payload: SubmissionPayload): Promise<SubmitResult> {
    return this.request<SubmitResult>("POST", "/api/v1/analysis/submit", payload);
  }
}
