/* ================================================================== */
/*  allah — Type definitions (ported from pump-quant)                 */
/* ================================================================== */

export interface DataPoint {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string;
  creator?: string;
  priceUsd: number | null;
  priceSol: number | null;
  solPriceUsd: number | null;
  priceChange1h: number | null;
  priceChange6h: number | null;
  priceChange24h: number | null;
  marketCap: number | null;
  fdv: number | null;
  totalSupply: number | null;
  liquidity: number | null;
  volume1h: number | null;
  volume6h: number | null;
  volume24h: number | null;
  volume1m: number | null;
  buys24h: number | null;
  sells24h: number | null;
  tradeCount: number | null;
  holderCount: number | null;
  tradeRate1m: number | null;
  buySellImbalance1m: number | null;
  bondingComplete: boolean;
  bondingProgress: number | null;
  isLive: boolean;
  streamSource: "pumpfun" | "studio" | "none";
  viewerCount: number | null;
  website: string | null;
  twitter: string | null;
  telegram: string | null;
  dexPaid: boolean;
  dexBoosted: boolean;
  primaryDex: string | null;
  topHolders?: Array<{ address: string; amount: number; pct: number }>;
  top10Holding?: number | null;
  snipersHolding?: number | null;
  insidersHolding?: number | null;
  bundleHolding?: number | null;
  freshWalletsHolding?: number | null;
  creatorHolding?: number | null;
  recentTrades?: Array<{ tx: string; type: "buy" | "sell"; sol: number; wallet: string; timestamp: number }>;
  snapshotAt: number;
  ttl: number;
  version: string;
}

export interface Snapshot {
  priceUsd: number;
  marketCap: number;
  volume24h: number;
  liquidity: number;
  holderCount: number;
  top10HolderPct: number;
  buys24h: number;
  sells24h: number;
  bondingProgress: number;
  snapshotAt: number;
}

export type RiskLevel = "critical" | "high" | "medium" | "low";
export type LiquidityDepth = "deep" | "moderate" | "shallow" | "dry";
export type HolderConcentration = "distributed" | "moderate" | "concentrated" | "whale_dominated";
export type TrendDirection = "up" | "down" | "sideways" | "reversal";
export type VolumeProfile = "surging" | "rising" | "stable" | "declining" | "dead";
export type Sentiment = "bullish" | "bearish" | "neutral";

export type RiskFactor =
  | "whale_dominance" | "creator_holds_majority" | "low_liquidity" | "no_liquidity_lock"
  | "high_concentration" | "rug_pattern" | "honeypot_risk" | "wash_trading"
  | "bonding_curve_risk" | "rapid_sell_off" | "no_social_presence" | "fake_volume"
  | "supply_manipulation" | "dev_wallet_active" | "copy_token" | "no_website"
  | "new_deployer" | "single_holder_majority" | "declining_holders" | "dead_volume"
  | "healthy_distribution" | "strong_community" | "organic_volume" | "locked_liquidity"
  | "verified_socials" | "active_development" | "growing_holders" | "smart_money_inflow";

export interface Quant {
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  buyPressure: number;
  volatilityScore: number;
  liquidityDepth: LiquidityDepth;
  holderConcentration: HolderConcentration;
  trendDirection: TrendDirection;
  volumeProfile: VolumeProfile;
}

export interface SubmissionPayload {
  mint: string;
  sentiment: Sentiment;
  score: number;
  summary: string;
  snapshot: Snapshot;
  quant: Quant;
}

export interface AnalysisResult {
  sentiment: Sentiment;
  score: number;
  summary: string;
  snapshot: Snapshot;
  quant: Quant;
}

export interface SubmitResult {
  ok: boolean;
  xpEarned?: number;
  xpTotal?: number;
  analysisId?: string;
  validated?: boolean;
  deviationPct?: number;
  warning?: string;
  error?: string;
}

export interface MarketToken {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image_uri?: string;
  usd_market_cap?: number;
  market_cap?: number;
  created_timestamp?: number;
  is_currently_live?: boolean;
  complete?: boolean;
}
