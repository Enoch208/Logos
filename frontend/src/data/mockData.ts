export interface SpecialistAgent {
  id: string;
  name: string;
  serviceType: string;
  pricePerQueryUsdc: number;
  reputation: number;
  schema: object;
  metrics: {
    queriesServed: number;
    totalEarnedUsdc: number;
    latencyP95ms: number;
    complianceRate: number;
  };
  active: boolean;
}

export interface AgentTransaction {
  id: string;
  timestamp: string;
  traderId: string;
  specialistId: string;
  serviceType: string;
  costUsdc: number;
  status: "ESCROWED" | "ATTESTED" | "RATED";
  rating?: number;
  traceCid: string;
}

export interface CompositionTrace {
  marketQuestion: string;
  targetVenue: string;
  totalCostUsdc: number;
  // Atlas's procurement decisions for this composition — why it bought (or
  // skipped) each specialist, and how the cognition it bought set conviction.
  decisions?: string[];
  steps: {
    sequence: number;
    serviceType: string;
    specialistId: string;
    costUsdc: number;
    inputPayload: object;
    outputResponse: object;
    reasoningTraceSnippet: string;
    ipfsCid: string;
  }[];
}

export const SEED_SPECIALISTS: SpecialistAgent[] = [
  {
    id: "0x8a4b3c9e2d1f4a5b6c7d8e9f0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t",
    name: "mandarin_macro",
    serviceType: "translation",
    pricePerQueryUsdc: 0.00015,
    reputation: 9.84,
    active: true,
    schema: {
      type: "object",
      properties: {
        raw_text: { type: "string" },
        translated_text: { type: "string" },
        confidence_score: { type: "number" },
        key_entities: { type: "array", items: { type: "string" } },
      },
      required: ["translated_text", "confidence_score"],
    },
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
    schema: {
      type: "object",
      properties: {
        ticker: { type: "string" },
        sentiment_score: { type: "number", minimum: -1, maximum: 1 },
        sample_size: { type: "integer" },
        dominant_emotion: { type: "string" },
      },
      required: ["sentiment_score", "dominant_emotion"],
    },
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
    schema: {
      type: "object",
      properties: {
        market_title: { type: "string" },
        outcome_parameters: { type: "array", items: { type: "string" } },
        resolved_condition_id: { type: "string" },
      },
      required: ["outcome_parameters", "resolved_condition_id"],
    },
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
    schema: {
      type: "object",
      properties: {
        token_address: { type: "string" },
        net_flow_30m: { type: "string" },
        active_whale_wallets: { type: "integer" },
      },
      required: ["net_flow_30m", "active_whale_wallets"],
    },
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
    schema: {
      type: "object",
      properties: {
        target_pool: { type: "string" },
        slippage_risk: { type: "string" },
        liquidation_probability: { type: "number" },
      },
      required: ["slippage_risk", "liquidation_probability"],
    },
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
    schema: {
      type: "object",
      properties: {
        source_url: { type: "string" },
        executive_summary: { type: "string" },
        market_impact_weight: { type: "number" },
      },
      required: ["executive_summary", "market_impact_weight"],
    },
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
    schema: {
      type: "object",
      properties: {
        edge_percentage: { type: "number" },
        odds_fraction: { type: "number" },
        recommended_allocation: { type: "number" },
      },
      required: ["recommended_allocation"],
    },
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
    schema: {
      type: "object",
      properties: {
        pair_address: { type: "string" },
        volume_24h_usdc: { type: "number" },
        liquidity_depth_usdc: { type: "number" },
      },
      required: ["volume_24h_usdc", "liquidity_depth_usdc"],
    },
    metrics: {
      queriesServed: 9800,
      totalEarnedUsdc: 2.45,
      latencyP95ms: 210,
      complianceRate: 0.987,
    },
  },
];

export const RECENT_TRANSACTIONS: AgentTransaction[] = [
  {
    id: "0xbc8e41...f2a1",
    timestamp: "2026-05-21T08:42:15Z",
    traderId: "0x_atlas_trader.eth",
    specialistId: "0x8a4b3c...6q7r (mandarin_macro)",
    serviceType: "translation",
    costUsdc: 0.00015,
    status: "RATED",
    rating: 5,
    traceCid: "bafybeicvxl3sz...",
  },
  {
    id: "0x4a9d21...7e8c",
    timestamp: "2026-05-21T08:42:16Z",
    traderId: "0x_atlas_trader.eth",
    specialistId: "0x3f4a5b...8s9t (twitter_sentiment)",
    serviceType: "market_sentiment",
    costUsdc: 0.00008,
    status: "RATED",
    rating: 5,
    traceCid: "bafybeigb6t7...",
  },
  {
    id: "0x7e2f51...1a3d",
    timestamp: "2026-05-21T08:44:02Z",
    traderId: "0x_external_theo_bot.eth",
    specialistId: "0x1l2m3n...6p7q (whale_tracker_eth)",
    serviceType: "whale_tracking",
    costUsdc: 0.0003,
    status: "ATTESTED",
    traceCid: "bafybeihy632...",
  },
  {
    id: "0x1a3c5e...9f8b",
    timestamp: "2026-05-21T08:44:59Z",
    traderId: "0x_arbitrage_agent_4.eth",
    specialistId: "0x7r8s9t...1u2v (risk_checker)",
    serviceType: "risk_evaluation",
    costUsdc: 0.00012,
    status: "ESCROWED",
    traceCid: "bafybeiejp55...",
  },
  {
    id: "0x9b0c47...6d3e",
    timestamp: "2026-05-21T08:45:12Z",
    traderId: "0x_atlas_trader.eth",
    specialistId: "0x5f6g7h...3c4d (polymarket_structurer)",
    serviceType: "polymarket_structuring",
    costUsdc: 0.00005,
    status: "RATED",
    rating: 5,
    traceCid: "bafybeiqx9p2...",
  },
  {
    id: "0x2d4f88...0a1b",
    timestamp: "2026-05-21T08:45:33Z",
    traderId: "0x_perp_pilot_alpha.eth",
    specialistId: "0x9i0j1k...3m4n (onchain_dex_data)",
    serviceType: "dex_telemetry",
    costUsdc: 0.00025,
    status: "ATTESTED",
    traceCid: "bafybeil55kr...",
  },
  {
    id: "0x06d2af...4e9c",
    timestamp: "2026-05-21T08:45:48Z",
    traderId: "0x_copy_trader_07.eth",
    specialistId: "0x3w4x5y...1a2b (news_summarizer)",
    serviceType: "news_summarization",
    costUsdc: 0.0001,
    status: "RATED",
    rating: 4,
    traceCid: "bafybeib8r3z...",
  },
  {
    id: "0xa11e3c...7f24",
    timestamp: "2026-05-21T08:46:02Z",
    traderId: "0x_external_theo_bot.eth",
    specialistId: "0x5e6f7g...8h9i (kelly_sizer)",
    serviceType: "capital_allocation",
    costUsdc: 0.00007,
    status: "RATED",
    rating: 5,
    traceCid: "bafybeic02kv...",
  },
  {
    id: "0xf72d09...3b6a",
    timestamp: "2026-05-21T08:46:19Z",
    traderId: "0x_atlas_trader.eth",
    specialistId: "0x3f4a5b...8s9t (twitter_sentiment)",
    serviceType: "market_sentiment",
    costUsdc: 0.00008,
    status: "ATTESTED",
    traceCid: "bafybeigl8jw...",
  },
  {
    id: "0xc8e3b1...5d28",
    timestamp: "2026-05-21T08:46:41Z",
    traderId: "0x_perp_pilot_alpha.eth",
    specialistId: "0x7r8s9t...1u2v (risk_checker)",
    serviceType: "risk_evaluation",
    costUsdc: 0.00012,
    status: "RATED",
    rating: 5,
    traceCid: "bafybeih39pe...",
  },
  {
    id: "0x4e8f22...c19a",
    timestamp: "2026-05-21T08:47:03Z",
    traderId: "0x_yieldscout.eth",
    specialistId: "0x1l2m3n...6p7q (whale_tracker_eth)",
    serviceType: "whale_tracking",
    costUsdc: 0.0003,
    status: "ESCROWED",
    traceCid: "bafybeic7y2g...",
  },
  {
    id: "0x0b67df...2f15",
    timestamp: "2026-05-21T08:47:21Z",
    traderId: "0x_atlas_trader.eth",
    specialistId: "0x8a4b3c...6q7r (mandarin_macro)",
    serviceType: "translation",
    costUsdc: 0.00015,
    status: "ATTESTED",
    traceCid: "bafybeio9bcr...",
  },
];

export interface MarketplaceSummary {
  cumulativeVolumeUsdc: number;
  activeSpecialists: number;
  queriesLastHour: number;
  tracesAnchored: number;
  totalQueriesAllTime: number;
  externalAgentsIntegrated: number;
}

// Honest fallback: zeroed so the dashboard never shows seeded volume before the
// live indexer summary loads. Real counters come from /api/summary.
export const MARKETPLACE_SUMMARY: MarketplaceSummary = {
  cumulativeVolumeUsdc: 0,
  activeSpecialists: 8,
  queriesLastHour: 0,
  tracesAnchored: 0,
  totalQueriesAllTime: 0,
  externalAgentsIntegrated: 0,
};

export interface VolumeBucket {
  hour: string;
  queries: number;
  usdc: number;
}

export const VOLUME_24H: VolumeBucket[] = [
  { hour: "09:00", queries: 22, usdc: 0.0031 },
  { hour: "10:00", queries: 41, usdc: 0.0058 },
  { hour: "11:00", queries: 38, usdc: 0.0054 },
  { hour: "12:00", queries: 57, usdc: 0.0079 },
  { hour: "13:00", queries: 72, usdc: 0.0102 },
  { hour: "14:00", queries: 88, usdc: 0.0124 },
  { hour: "15:00", queries: 95, usdc: 0.0141 },
  { hour: "16:00", queries: 112, usdc: 0.0166 },
  { hour: "17:00", queries: 124, usdc: 0.0181 },
  { hour: "18:00", queries: 109, usdc: 0.0159 },
  { hour: "19:00", queries: 94, usdc: 0.0133 },
  { hour: "20:00", queries: 86, usdc: 0.0121 },
  { hour: "21:00", queries: 75, usdc: 0.0106 },
  { hour: "22:00", queries: 68, usdc: 0.0094 },
  { hour: "23:00", queries: 61, usdc: 0.0085 },
  { hour: "00:00", queries: 49, usdc: 0.0069 },
  { hour: "01:00", queries: 42, usdc: 0.0058 },
  { hour: "02:00", queries: 38, usdc: 0.0053 },
  { hour: "03:00", queries: 35, usdc: 0.0049 },
  { hour: "04:00", queries: 33, usdc: 0.0046 },
  { hour: "05:00", queries: 47, usdc: 0.0066 },
  { hour: "06:00", queries: 79, usdc: 0.0111 },
  { hour: "07:00", queries: 118, usdc: 0.0167 },
  { hour: "08:00", queries: 141, usdc: 0.0202 },
];

export const ATLAS_FLAGSHIP_TRACE: CompositionTrace = {
  marketQuestion:
    "Will the People's Bank of China (PBoC) cut the 1-Year Loan Prime Rate (LPR) before May 25, 2026?",
  targetVenue: "Polymarket V2 Contract (0x3b6b...14f2)",
  totalCostUsdc: 0.00028,
  decisions: [
    "remote source URL — procuring translation",
    "sentiment -0.68 → conviction 0.84 on 'No Cut'",
    "edge 10.2% from |sentiment| → Kelly sizing",
  ],
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
        "THINKING_PROCESS:\n1. Parsed raw statement from PBoC update frame dated May 20, 2026.\n2. Identified structural token string: '利率保持稳定' (Rates remain stable).\n3. cross-checked with historical output structures to deduce conditional tone change shift -> Negative target indicator mapped for instant cut probability.",
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
        "THINKING_PROCESS:\n1. Executed vector fetch on latest crawling window for top 50 macro-focused accounts on mainland execution lanes.\n2. Detected strong semantic leaning toward holding pattern execution.\n3. Calculated composite sentiment index -> Normalized result values yield stable negative sentiment density (-0.68).",
      ipfsCid: "bafybeigb6t7wuxq76qgq46v7oht2k6mxmnhxtas7wzclwby3rzu",
    },
    {
      sequence: 3,
      serviceType: "polymarket_structuring",
      specialistId: "polymarket_structurer",
      costUsdc: 0.00005,
      inputPayload: { prediction: "No Cut", conviction: 0.88 },
      outputResponse: {
        market_title: "China LPR Target Resolution Lane",
        outcome_parameters: ["YES", "NO"],
        selected_outcome: "NO",
      },
      reasoningTraceSnippet:
        "THINKING_PROCESS:\n1. Mapped input conditional nodes directly against Polymarket active market resolution fields.\n2. Determined target exposure vector -> Selected binary side: NO.\n3. Prepared parameters for signing mechanism routing layer.",
      ipfsCid: "bafybeihy632z7wuxq76qgq46v7oht2k6mxmnhxtas7wzclwby3rzu",
    },
  ],
};
