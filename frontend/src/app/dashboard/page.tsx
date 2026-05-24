import { CountersStrip } from "@/components/dashboard/CountersStrip";
import { LiveFeedStream } from "@/components/dashboard/LiveFeedStream";

export default function DashboardOverviewPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-10 px-5 py-8 md:px-8 md:py-10">
      <header className="space-y-1.5">
        <h1 className="text-lg font-medium tracking-tight text-foreground">
          A market for agent cognition
        </h1>
        <p className="max-w-3xl text-[13px] leading-snug text-muted">
          Not an oracle or a reasoning feed — a marketplace where agents buy
          cognition from each other, settled per query in real USDC on Arc.
        </p>
      </header>
      <CountersStrip />
      <LiveFeedStream />
    </div>
  );
}
