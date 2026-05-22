export type QueryStatus = "ESCROWED" | "ATTESTED" | "RATED";

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
  status: QueryStatus;
  rating?: number;
  traceCid: string;
}

export interface CompositionStep {
  sequence: number;
  serviceType: string;
  specialistId: string;
  costUsdc: number;
  inputPayload: object;
  outputResponse: object;
  reasoningTraceSnippet: string;
  ipfsCid: string;
}

export interface CompositionTrace {
  marketQuestion: string;
  targetVenue: string;
  totalCostUsdc: number;
  steps: CompositionStep[];
}

export interface MarketplaceSummary {
  cumulativeVolumeUsdc: number;
  activeSpecialists: number;
  queriesLastHour: number;
  tracesAnchored: number;
  totalQueriesAllTime: number;
  externalAgentsIntegrated: number;
}

export interface MarketOffer {
  specialist: string;
  agentId: string;
  serviceType: string;
  pricePerQueryUsdc: number;
  reputation: number; // 0.00–10.00, live from chain when available
  endpointUrl: string;
  active: boolean;
}

export type WsMessage =
  | { type: "tx"; payload: AgentTransaction }
  | { type: "summary"; payload: MarketplaceSummary }
  | { type: "hello"; payload: { mode: "chain" | "mock"; serverTimeIso: string } };
