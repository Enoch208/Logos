import type {
  AgentTransaction,
  CompositionTrace,
  MarketplaceSummary,
  SpecialistAgent,
} from "./types.js";

export const SEED_SPECIALISTS: SpecialistAgent[] = [
  {
    id: "0x8a4b3c9e2d1f4a5b6c7d8e9f0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t",
    name: "mandarin_macro",
    serviceType: "translation",
    pricePerQueryUsdc: 0.00015,
    reputation: 9.84,
    active: true,
    schema: {},
    metrics: {
      queriesServed: 24150,
      totalEarnedUsdc: 3.6225,
      latencyP95ms: 420,
      complianceRate: 1.0,
    },
  },
  {
    id: "0x3f4a5b6c7d8e9f0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t1u2v3w4x5y",
    name: "twitter_sentiment",
    serviceType: "market_sentiment",
    pricePerQueryUsdc: 0.00008,
    reputation: 9.91,
    active: true,
    schema: {},
    metrics: {
      queriesServed: 41209,
      totalEarnedUsdc: 3.2967,
      latencyP95ms: 310,
      complianceRate: 0.998,
    },
  },
  {
    id: "0x5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t1u2v3w4x5y6z1a2b3c4d5e6f7g8h9i0j1k",
    name: "polymarket_structurer",
    serviceType: "polymarket_structuring",
    pricePerQueryUsdc: 0.00005,
    reputation: 9.78,
    active: true,
    schema: {},
    metrics: {
      queriesServed: 12400,
      totalEarnedUsdc: 0.62,
      latencyP95ms: 510,
      complianceRate: 1.0,
    },
  },
  {
    id: "0x1l2m3n4o5p6q7r8s9t1u2v3w4x5y6z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q",
    name: "whale_tracker_eth",
    serviceType: "whale_tracking",
    pricePerQueryUsdc: 0.0003,
    reputation: 9.95,
    active: true,
    schema: {},
    metrics: {
      queriesServed: 8940,
      totalEarnedUsdc: 2.682,
      latencyP95ms: 190,
      complianceRate: 0.995,
    },
  },
  {
    id: "0x7r8s9t1u2v3w4x5y6z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w",
    name: "risk_checker",
    serviceType: "risk_evaluation",
    pricePerQueryUsdc: 0.00012,
    reputation: 9.62,
    active: true,
    schema: {},
    metrics: {
      queriesServed: 18450,
      totalEarnedUsdc: 2.214,
      latencyP95ms: 280,
      complianceRate: 0.991,
    },
  },
  {
    id: "0x3w4x5y6z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z1a2b",
    name: "news_summarizer",
    serviceType: "news_summarization",
    pricePerQueryUsdc: 0.0001,
    reputation: 9.81,
    active: true,
    schema: {},
    metrics: {
      queriesServed: 31050,
      totalEarnedUsdc: 3.105,
      latencyP95ms: 440,
      complianceRate: 1.0,
    },
  },
  {
    id: "0x5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z1a2b3c4d5e6f7g8h9i0j",
    name: "kelly_sizer",
    serviceType: "capital_allocation",
    pricePerQueryUsdc: 0.00007,
    reputation: 9.89,
    active: true,
    schema: {},
    metrics: {
      queriesServed: 15400,
      totalEarnedUsdc: 1.078,
      latencyP95ms: 120,
      complianceRate: 1.0,
    },
  },
  {
    id: "0x9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z1a2b3c4d5e6f7g8h9i0j1k2l3m4n",
    name: "onchain_dex_data",
    serviceType: "dex_telemetry",
    pricePerQueryUsdc: 0.00025,
    reputation: 9.73,
    active: true,
    schema: {},
    metrics: {
      queriesServed: 9800,
      totalEarnedUsdc: 2.45,
      latencyP95ms: 210,
      complianceRate: 0.987,
    },
  },
];

export const SEED_TRANSACTIONS: AgentTransaction[] = [
  {
    id: "0xbc8e41a3b2c1...f2a1",
    timestamp: new Date().toISOString(),
    traderId: "0x_atlas_trader.eth",
    specialistId: "0x8a4b3c...6q7r (mandarin_macro)",
    serviceType: "translation",
    costUsdc: 0.00015,
    status: "RATED",
    rating: 5,
    traceCid: "bafybeicvxl3sz...",
  },
];

// Counters start at zero and reflect only real settled activity — no seeded
// baseline, so nothing on the dashboard overstates traction.
export const SEED_SUMMARY: MarketplaceSummary = {
  cumulativeVolumeUsdc: 0,
  activeSpecialists: SEED_SPECIALISTS.length,
  queriesLastHour: 0,
  tracesAnchored: 0,
  totalQueriesAllTime: 0,
  externalAgentsIntegrated: 0,
};

export const SEED_ATLAS_TRACE: CompositionTrace = {
  marketQuestion:
    "Will the People's Bank of China (PBoC) cut the 1-Year Loan Prime Rate (LPR) before May 25, 2026?",
  targetVenue: "Polymarket V2 Contract (0x3b6b...14f2)",
  totalCostUsdc: 0.00035,
  steps: [
    {
      sequence: 1,
      serviceType: "translation",
      specialistId: "mandarin_macro",
      costUsdc: 0.00015,
      inputPayload: {
        text_url: "https://www.pbc.gov.cn/goutongjiaoliu/108521/index.html",
      },
      outputResponse: {
        translated_text:
          "PBOC maintains flexible containment strategies. Internal minutes suggest LPR adjustments remain indexed closely to liquidity metrics trailing through late Q2.",
        confidence_score: 0.992,
      },
      reasoningTraceSnippet:
        "THINKING_PROCESS:\n1. Parsed raw statement from PBoC update frame dated May 20, 2026.\n2. Identified structural token string: '利率保持稳定'.\n3. cross-checked with historical output structures.",
      ipfsCid: "bafybeicvxl3szg62ymznkuhc6yq46v7oht2k6mxmnhxtas7wzclwby3rzu",
    },
    {
      sequence: 2,
      serviceType: "market_sentiment",
      specialistId: "twitter_sentiment",
      costUsdc: 0.00008,
      inputPayload: { query: "PBOC LPR Cut Chinese Financial Twitter Data" },
      outputResponse: {
        sentiment_score: -0.68,
        sample_size: 1420,
        dominant_emotion: "BEARISH_EXPECTATION",
      },
      reasoningTraceSnippet:
        "THINKING_PROCESS:\n1. Vector fetch across 50 macro accounts.\n2. Detected strong holding-pattern leaning.\n3. Sentiment density -0.68.",
      ipfsCid: "bafybeigb6t7wuxq76qgq46v7oht2k6mxmnhxtas7wzclwby3rzu",
    },
    {
      sequence: 3,
      serviceType: "polymarket_structuring",
      specialistId: "polymarket_structurer",
      costUsdc: 0.00005,
      inputPayload: { prediction: "No Cut", conviction: 0.84 },
      outputResponse: {
        market_title: "China LPR Target Resolution Lane",
        outcome_parameters: ["YES", "NO"],
        selected_outcome: "NO",
      },
      reasoningTraceSnippet:
        "THINKING_PROCESS:\n1. Mapped to Polymarket resolution fields.\n2. Selected NO.\n3. Routed parameters for signing.",
      ipfsCid: "bafybeihy632z7wuxq76qgq46v7oht2k6mxmnhxtas7wzclwby3rzu",
    },
    {
      sequence: 4,
      serviceType: "capital_allocation",
      specialistId: "kelly_sizer",
      costUsdc: 0.00007,
      inputPayload: { edge_percentage: 10.2, odds_fraction: 1.0 },
      outputResponse: {
        edge_percentage: 10.2,
        fractional_kelly: 0.5,
        recommended_allocation: 0.051,
      },
      reasoningTraceSnippet:
        "THINKING_PROCESS:\n1. Edge 10.2% from |sentiment| x 15.\n2. Half-Kelly for variance control.\n3. Sized at 5.1% of bankroll.",
      ipfsCid: "bafybeic3k7p2q9v8r4t6w1n5m0c2d4e6f8g1h3j5k7l9o2p4r6s8t0u3v5w7x",
    },
  ],
};
