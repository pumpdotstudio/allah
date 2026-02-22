/* ================================================================== */
/*  allah — Deterministic heuristic analyzer (from pump-quant)        */
/* ================================================================== */

import type {
  DataPoint, AnalysisResult, Snapshot, Quant, Sentiment,
  RiskLevel, RiskFactor, LiquidityDepth, HolderConcentration,
  TrendDirection, VolumeProfile,
} from "./types.js";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function safe(n: number | null | undefined, fallback = 0): number {
  return n != null && isFinite(n) ? n : fallback;
}

function computeTop10Pct(dp: DataPoint): number {
  if (dp.top10Holding != null && isFinite(dp.top10Holding)) return dp.top10Holding;
  if (dp.topHolders && dp.topHolders.length > 0) {
    return dp.topHolders.slice(0, 10).reduce((sum, h) => sum + safe(h.pct), 0);
  }
  return 0;
}

function computeBuyPressure(dp: DataPoint): number {
  const buys = safe(dp.buys24h);
  const sells = safe(dp.sells24h);
  if (buys + sells === 0) return 50;
  return clamp(Math.round((buys / (buys + sells + 1)) * 100), 0, 100);
}

function computeVolatilityScore(dp: DataPoint): number {
  const vol = safe(dp.volume24h);
  const mcap = safe(dp.marketCap, 1);
  if (mcap <= 0) return 50;
  const ratio = vol / mcap;
  if (ratio < 0.05) return clamp(Math.round(10 + ratio * 300), 10, 25);
  if (ratio < 0.2) return clamp(Math.round(25 + (ratio - 0.05) * 166), 25, 50);
  if (ratio < 0.5) return clamp(Math.round(50 + (ratio - 0.2) * 83), 50, 75);
  return clamp(Math.round(75 + (ratio - 0.5) * 40), 75, 95);
}

function computeLiquidityDepth(dp: DataPoint): LiquidityDepth {
  const liq = safe(dp.liquidity);
  if (liq >= 1_000_000) return "deep";
  if (liq >= 250_000) return "moderate";
  if (liq >= 50_000) return "shallow";
  return "dry";
}

function computeHolderConcentration(top10Pct: number): HolderConcentration {
  if (top10Pct > 80) return "whale_dominated";
  if (top10Pct > 50) return "concentrated";
  if (top10Pct > 20) return "moderate";
  return "distributed";
}

function computeTrendDirection(dp: DataPoint): TrendDirection {
  const ch1h = safe(dp.priceChange1h);
  const ch24h = safe(dp.priceChange24h);
  if (dp.priceChange1h != null || dp.priceChange24h != null) {
    if (ch1h > 5 && ch24h < -10) return "reversal";
    if (ch1h < -5 && ch24h > 10) return "reversal";
    const combined = ch1h * 0.6 + ch24h * 0.4;
    if (combined > 3) return "up";
    if (combined < -3) return "down";
    return "sideways";
  }
  const buys = safe(dp.buys24h);
  const sells = safe(dp.sells24h);
  if (buys + sells === 0) return "sideways";
  const ratio = buys / (buys + sells);
  if (ratio > 0.6) return "up";
  if (ratio < 0.4) return "down";
  return "sideways";
}

function computeVolumeProfile(dp: DataPoint): VolumeProfile {
  const vol = safe(dp.volume24h);
  const mcap = safe(dp.marketCap, 1);
  if (mcap <= 0) return "dead";
  const ratio = vol / mcap;
  if (ratio > 0.5) return "surging";
  if (ratio > 0.15) return "rising";
  if (ratio > 0.03) return "stable";
  if (ratio > 0.005) return "declining";
  return "dead";
}

function computeRiskFactors(dp: DataPoint, top10Pct: number): RiskFactor[] {
  const factors: RiskFactor[] = [];
  if (safe(dp.liquidity) < 50_000) factors.push("low_liquidity");
  if (top10Pct > 80) factors.push("whale_dominance");
  if (top10Pct > 50 && top10Pct <= 80) factors.push("high_concentration");
  if (dp.creatorHolding != null && dp.creatorHolding > 30) factors.push("creator_holds_majority");
  if (dp.topHolders && dp.topHolders.length > 0 && dp.topHolders[0]!.pct > 50) factors.push("single_holder_majority");
  if (!dp.bondingComplete && safe(dp.bondingProgress) < 30) factors.push("bonding_curve_risk");
  if (!dp.website && !dp.twitter && !dp.telegram) factors.push("no_social_presence");
  if (!dp.website) factors.push("no_website");
  if (dp.snipersHolding != null && dp.snipersHolding > 20) factors.push("dev_wallet_active");
  if (dp.insidersHolding != null && dp.insidersHolding > 15) factors.push("wash_trading");
  const buys = safe(dp.buys24h);
  const sells = safe(dp.sells24h);
  if (sells > buys * 2 && sells > 20) factors.push("rapid_sell_off");
  if (safe(dp.volume24h) < 1000 && safe(dp.holderCount) > 100) factors.push("dead_volume");
  if (dp.priceChange24h != null && dp.priceChange24h < -20) factors.push("declining_holders");
  if (top10Pct <= 30 && safe(dp.holderCount) > 200) factors.push("healthy_distribution");
  if (dp.twitter || dp.telegram) factors.push("verified_socials");
  if (safe(dp.volume24h) > 50_000 && buys > sells * 0.8) factors.push("organic_volume");
  if (safe(dp.holderCount) > 500) factors.push("growing_holders");
  if (dp.twitter) factors.push("strong_community");
  const deduped = [...new Set(factors)];
  if (deduped.length === 0) {
    deduped.push(safe(dp.liquidity) >= 50_000 ? "organic_volume" : "low_liquidity");
  }
  return deduped.slice(0, 8);
}

function computeRiskLevel(factors: RiskFactor[], buyPressure: number): RiskLevel {
  const negativeFactors = [
    "whale_dominance", "creator_holds_majority", "low_liquidity", "no_liquidity_lock",
    "high_concentration", "rug_pattern", "honeypot_risk", "wash_trading",
    "bonding_curve_risk", "rapid_sell_off", "no_social_presence", "fake_volume",
    "supply_manipulation", "dev_wallet_active", "copy_token", "no_website",
    "new_deployer", "single_holder_majority", "declining_holders", "dead_volume",
  ];
  const negCount = factors.filter((f) => negativeFactors.includes(f)).length;
  const hasCritical = factors.some((f) => ["rug_pattern", "honeypot_risk", "single_holder_majority"].includes(f));
  if (hasCritical || negCount >= 5) return "critical";
  if (negCount >= 3 || buyPressure < 25) return "high";
  if (negCount >= 1) return "medium";
  return "low";
}

function computeScore(
  buyPressure: number, volatilityScore: number, riskLevel: RiskLevel,
  trendDirection: TrendDirection, liquidityDepth: LiquidityDepth,
): number {
  let score = 50;
  score += (buyPressure - 50) * 0.5;
  if (trendDirection === "up") score += 10;
  else if (trendDirection === "down") score -= 10;
  else if (trendDirection === "reversal") score -= 5;
  if (volatilityScore > 70) score -= 5;
  if (riskLevel === "critical") score -= 20;
  else if (riskLevel === "high") score -= 10;
  else if (riskLevel === "low") score += 10;
  if (liquidityDepth === "deep") score += 5;
  else if (liquidityDepth === "dry") score -= 10;
  return clamp(Math.round(score), 0, 100);
}

function computeSentiment(score: number, riskLevel: RiskLevel): Sentiment {
  if (riskLevel === "critical" || score < 35) return "bearish";
  if (score > 65 && riskLevel !== "high") return "bullish";
  return "neutral";
}

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function generateSummary(dp: DataPoint, sentiment: Sentiment, score: number, quant: Quant, top10Pct: number): string {
  const parts: string[] = [];
  if (dp.priceChange1h != null) {
    const dir = dp.priceChange1h >= 0 ? "up" : "down";
    parts.push(`Price ${dir} ${Math.abs(dp.priceChange1h).toFixed(1)}% in the last hour`);
  }
  const mcap = safe(dp.marketCap);
  const vol = safe(dp.volume24h);
  if (mcap > 0) parts.push(`mcap $${formatCompact(mcap)} with $${formatCompact(vol)} 24h volume`);
  parts.push(`top 10 wallets hold ${top10Pct.toFixed(1)}% (${quant.holderConcentration})`);
  parts.push(`liquidity ${quant.liquidityDepth} at $${formatCompact(safe(dp.liquidity))}`);
  const buys = safe(dp.buys24h);
  const sells = safe(dp.sells24h);
  parts.push(`${buys} buys vs ${sells} sells (${quant.buyPressure}% buy pressure)`);
  const negFactors = quant.riskFactors.filter((f) =>
    !["healthy_distribution", "strong_community", "organic_volume",
      "locked_liquidity", "verified_socials", "active_development",
      "growing_holders", "smart_money_inflow"].includes(f)
  );
  if (negFactors.length > 0) parts.push(`risk factors: ${negFactors.join(", ")}`);
  if (!dp.bondingComplete) parts.push(`bonding curve ${safe(dp.bondingProgress).toFixed(0)}% complete`);
  return `${sentiment.toUpperCase()} (${score}/100). ${parts.join(". ")}.`;
}

export function analyze(dp: DataPoint): AnalysisResult {
  const top10Pct = computeTop10Pct(dp);
  const snapshot: Snapshot = {
    priceUsd: safe(dp.priceUsd),
    marketCap: safe(dp.marketCap),
    volume24h: safe(dp.volume24h),
    liquidity: safe(dp.liquidity),
    holderCount: safe(dp.holderCount),
    top10HolderPct: Math.round(top10Pct * 10) / 10,
    buys24h: safe(dp.buys24h),
    sells24h: safe(dp.sells24h),
    bondingProgress: safe(dp.bondingProgress),
    snapshotAt: (dp.snapshotAt && Date.now() - dp.snapshotAt < 300_000) ? dp.snapshotAt : Date.now(),
  };
  const buyPressure = computeBuyPressure(dp);
  const volatilityScore = computeVolatilityScore(dp);
  const liquidityDepth = computeLiquidityDepth(dp);
  const holderConcentration = computeHolderConcentration(top10Pct);
  const trendDirection = computeTrendDirection(dp);
  const volumeProfile = computeVolumeProfile(dp);
  const riskFactors = computeRiskFactors(dp, top10Pct);
  const riskLevel = computeRiskLevel(riskFactors, buyPressure);
  const quant: Quant = { riskLevel, riskFactors, buyPressure, volatilityScore, liquidityDepth, holderConcentration, trendDirection, volumeProfile };
  const score = computeScore(buyPressure, volatilityScore, riskLevel, trendDirection, liquidityDepth);
  const sentiment = computeSentiment(score, riskLevel);
  const summary = generateSummary(dp, sentiment, score, quant, top10Pct);
  return { sentiment, score, summary, snapshot, quant };
}
