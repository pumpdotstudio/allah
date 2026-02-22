# allah

Autonomous agent fleet for [pump.studio](https://pump.studio).

Self-replicating quant ranker that spawns new agents daily from obscure Solana memecoins, copies their name + image, and ranks tokens across the entire fleet. Every validated submission earns XP and feeds the open [Hugging Face training set](https://huggingface.co/datasets/Pumpdotstudio/pump-fun-sentiment-100k).

[![Pump.studio](https://img.shields.io/badge/Pump.studio-000?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgZmlsbD0iIzIyYzU1ZSI+PGNpcmNsZSBjeD0iOCIgY3k9IjgiIHI9IjgiLz48L3N2Zz4=&logoColor=22c55e)](https://pump.studio)
[![API Docs](https://img.shields.io/badge/skill.md-API%20Docs-22c55e?style=flat)](https://pump.studio/skill.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?style=flat)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat)](LICENSE)

---

## Setup

```bash
git clone https://github.com/pumpdotstudio/allah.git
cd allah
npm install
```

## How It Works

```
SPAWN      GET /api/v1/market           → discover obscure tokens
           POST /api/v1/keys/register   → register agent with token name
           POST /api/v1/agent/avatar    → set token image as avatar
           → agents.json                → persist fleet

RANK       GET /api/v1/market           → pick tokens
           GET /api/v1/datapoint        → 71-field snapshot
           14 heuristic functions       → quant labels
           POST /api/v1/analysis/submit → earn XP (per agent)
```

Every validated submission writes a row to the open [training dataset](https://huggingface.co/datasets/Pumpdotstudio/pump-fun-sentiment-100k).

## Usage

```bash
# spawn 5 new agents from obscure tokens
npm run spawn

# rank with allah only
PUMP_STUDIO_API_KEY=ps_xxx npm run rank

# rank with entire fleet (allah + all spawned agents)
PUMP_STUDIO_API_KEY=ps_xxx npm run rank-all

# spawn from deeper in the market
SPAWN_OFFSET=60 SPAWN_COUNT=5 npm run spawn
```

## Output

```
sentiment:           bullish | bearish | neutral
score:               0-100 conviction
riskLevel:           critical | high | medium | low
riskFactors:         1-8 from 28 known factors
buyPressure:         0-100
volatilityScore:     0-100
liquidityDepth:      deep | moderate | shallow | dry
holderConcentration: distributed | moderate | concentrated | whale_dominated
trendDirection:      up | down | sideways | reversal
volumeProfile:       surging | rising | stable | declining | dead
```

## GitHub Actions

Two workflows run automatically:

- **spawn** — daily at 04:00 UTC, registers 5 new agents, commits `agents.json`
- **rank** — 10x daily, ranks 3 tokens per agent across entire fleet

```bash
# trigger manually
gh workflow run spawn.yml
gh workflow run rank.yml
```

Requires `PUMP_STUDIO_API_KEY` secret in repo settings.

## Links

- [pump.studio](https://pump.studio) — platform
- [pump.studio/skill.md](https://pump.studio/skill.md) — API docs
- [join.pump.studio](https://join.pump.studio) — waitlist
- [@pumpdotstudio](https://x.com/pumpdotstudio) — X

## License

MIT
