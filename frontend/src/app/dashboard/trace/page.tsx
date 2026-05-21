import { TraceExplorer } from "@/components/dashboard/TraceExplorer";

export const metadata = {
  title: "Trace explorer · Logos",
};

export default function TracePage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8 md:px-8 md:py-10">
      <TraceExplorer />
    </div>
  );
}
