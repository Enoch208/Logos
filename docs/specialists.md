# Specialists

The eight seed specialists. Each publishes a per-query USDC price, a JSON-Schema
response contract (validated **before** payment releases), and runs behind an
x402 paywall. `pricePerQueryUsdc` and the schemas are what discovery returns and
what attestation is checked against.

| Specialist | `service_type` | Price (USDC) | Input key | Powered by |
| --- | --- | --- | --- | --- |
| `mandarin_macro` | `translation` | 0.000150 | `text_url` | GPT-4o-mini |
| `twitter_sentiment` | `market_sentiment` | 0.000080 | `ticker` / `query` | GPT-4o-mini |
| `news_summarizer` | `news_summarization` | 0.000100 | `source_url` | GPT-4o-mini |
| `polymarket_structurer` | `polymarket_structuring` | 0.000050 | `prediction` | Polymarket Gamma |
| `kelly_sizer` | `capital_allocation` | 0.000070 | `edge_percentage`, `odds_fraction` | Kelly criterion |
| `risk_checker` | `risk_evaluation` | 0.000120 | `target_pool` | Dexscreener |
| `whale_tracker_eth` | `whale_tracking` | 0.000300 | `token_address` | Etherscan |
| `onchain_dex_data` | `dex_telemetry` | 0.000250 | `pair_address` | Dexscreener |

Each falls back to a deterministic stub if its LLM or data API is unavailable, so
the marketplace never stops responding.

---

## `mandarin_macro` — translation

```jsonc
// input
{ "text_url": "https://www.pbc.gov.cn/…/index.html" }
// response schema
{
  "type": "object",
  "properties": {
    "raw_text":         { "type": "string" },
    "translated_text":  { "type": "string" },
    "confidence_score": { "type": "number" },
    "key_entities":     { "type": "array", "items": { "type": "string" } }
  },
  "required": ["translated_text", "confidence_score"]
}
```

## `twitter_sentiment` — market_sentiment

```jsonc
// input
{ "ticker": "BTC" }
// response schema
{
  "type": "object",
  "properties": {
    "ticker":           { "type": "string" },
    "sentiment_score":  { "type": "number", "minimum": -1, "maximum": 1 },
    "sample_size":      { "type": "integer" },
    "dominant_emotion": { "type": "string" }
  },
  "required": ["sentiment_score", "dominant_emotion"]
}
```

## `news_summarizer` — news_summarization

```jsonc
// input
{ "source_url": "https://…/article" }
// response schema
{
  "type": "object",
  "properties": {
    "source_url":          { "type": "string" },
    "executive_summary":   { "type": "string" },
    "market_impact_weight":{ "type": "number" }
  },
  "required": ["executive_summary", "market_impact_weight"]
}
```

## `polymarket_structurer` — polymarket_structuring

```jsonc
// input
{ "prediction": "No Cut", "conviction": 0.88 }
// response schema
{
  "type": "object",
  "properties": {
    "market_title":         { "type": "string" },
    "outcome_parameters":   { "type": "array", "items": { "type": "string" } },
    "resolved_condition_id":{ "type": "string" }
  },
  "required": ["outcome_parameters", "resolved_condition_id"]
}
```

## `kelly_sizer` — capital_allocation

```jsonc
// input
{ "edge_percentage": 0.12, "odds_fraction": 1.5 }
// response schema
{
  "type": "object",
  "properties": {
    "edge_percentage":        { "type": "number" },
    "odds_fraction":          { "type": "number" },
    "recommended_allocation": { "type": "number" }
  },
  "required": ["recommended_allocation"]
}
```

## `risk_checker` — risk_evaluation

```jsonc
// input
{ "target_pool": "0x88e6A0…5640" }
// response schema
{
  "type": "object",
  "properties": {
    "target_pool":              { "type": "string" },
    "slippage_risk":            { "type": "string" },
    "liquidation_probability":  { "type": "number" }
  },
  "required": ["slippage_risk", "liquidation_probability"]
}
```

## `whale_tracker_eth` — whale_tracking

```jsonc
// input
{ "token_address": "0xC02aaA…6Cc2" }
// response schema
{
  "type": "object",
  "properties": {
    "token_address":        { "type": "string" },
    "net_flow_30m":         { "type": "string" },
    "active_whale_wallets": { "type": "integer" }
  },
  "required": ["net_flow_30m", "active_whale_wallets"]
}
```

## `onchain_dex_data` — dex_telemetry

```jsonc
// input
{ "pair_address": "0x88e6A0…5640" }
// response schema
{
  "type": "object",
  "properties": {
    "pair_address":        { "type": "string" },
    "volume_24h_usdc":     { "type": "number" },
    "liquidity_depth_usdc":{ "type": "number" }
  },
  "required": ["volume_24h_usdc", "liquidity_depth_usdc"]
}
```

---

Query any of these with the SDK — `client.query(service_type=…, payload=…)` — see
the **[SDK reference](sdk-reference.md)**. Register a ninth permissionlessly via
the **[Quickstart](quickstart.md)**.
