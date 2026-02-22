/* ================================================================== */
/*  allah — Automated quant ranker                                    */
/*                                                                    */
/*  Discovers tokens from the market, fetches DataPoint snapshots,    */
/*  runs deterministic analysis, and submits for XP.                  */
/*                                                                    */
/*  Env:                                                              */
/*    PUMP_STUDIO_API_KEY  — required                                 */
/*    RANK_COUNT           — tokens to analyze per run (default: 5)   */
/*    RANK_TAB             — market tab (default: all)                */
/*    COOLDOWN_MS          — delay between submissions (default: 65s) */
/* ================================================================== */

import { PumpStudioClient } from "./client.js";
import { analyze } from "./analyzer.js";

const API_KEY = process.env.PUMP_STUDIO_API_KEY;
if (!API_KEY) {
  console.error("PUMP_STUDIO_API_KEY is required");
  process.exit(1);
}

const RANK_COUNT = Number(process.env.RANK_COUNT) || 5;
const RANK_TAB = (process.env.RANK_TAB || "all") as "all" | "live" | "new" | "graduated";
const COOLDOWN_MS = Number(process.env.COOLDOWN_MS) || 65_000;

const client = new PumpStudioClient(API_KEY);

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log(`\n🕌 allah — quant ranker`);
  console.log(`   tab: ${RANK_TAB} | count: ${RANK_COUNT} | cooldown: ${COOLDOWN_MS / 1000}s\n`);

  /* 1. Discover tokens */
  console.log(`→ DISCOVER  fetching ${RANK_COUNT} tokens from "${RANK_TAB}"...`);
  const tokens = await client.getMarket(RANK_TAB, RANK_COUNT);

  if (tokens.length === 0) {
    console.log("  no tokens found");
    return;
  }

  console.log(`  found ${tokens.length} tokens\n`);

  let submitted = 0;
  let totalXp = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const label = `[${i + 1}/${tokens.length}]`;

    try {
      /* 2. Fetch DataPoint */
      console.log(`${label} SNAPSHOT  ${token.symbol} (${token.mint.slice(0, 8)}...)`);
      const dp = await client.getDataPoint(token.mint);

      /* 3. Analyze */
      const result = analyze(dp);
      console.log(`${label} ANALYZE   ${result.sentiment.toUpperCase()} score=${result.score}`);

      /* 4. Submit */
      const submission = await client.submitAnalysis({
        mint: token.mint,
        sentiment: result.sentiment,
        score: result.score,
        summary: result.summary,
        snapshot: result.snapshot,
        quant: result.quant,
      });

      if (submission.ok) {
        submitted++;
        const xp = submission.xpEarned ?? 0;
        totalXp += xp;
        console.log(
          `${label} SUBMIT    ✓ +${xp} XP` +
          (submission.validated ? ` (validated, ${submission.deviationPct?.toFixed(0)}% dev)` : "") +
          (submission.warning ? ` — ${submission.warning}` : "")
        );
      } else {
        console.log(`${label} SUBMIT    ✗ ${submission.error}`);
      }
    } catch (err: any) {
      console.log(`${label} ERROR     ${err.message}`);
    }

    /* 5. Cooldown between submissions */
    if (i < tokens.length - 1) {
      console.log(`${label} COOLDOWN  ${COOLDOWN_MS / 1000}s...`);
      await sleep(COOLDOWN_MS);
    }
  }

  console.log(`\n🕌 done — ${submitted}/${tokens.length} submitted, +${totalXp} XP total\n`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
