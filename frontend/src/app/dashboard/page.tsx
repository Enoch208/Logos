import { CountersStrip } from "@/components/dashboard/CountersStrip";
import { LiveFeedStream } from "@/components/dashboard/LiveFeedStream";

export default function DashboardOverviewPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-10 px-5 py-8 md:px-8 md:py-10">
      <CountersStrip />
      <LiveFeedStream />
    </div>
  );
}
