import { TraceExplorer } from "@/components/dashboard/TraceExplorer";

export const metadata = {
  title: "Trace explorer · Logos",
};

export default async function TracePage({
  searchParams,
}: {
  searchParams: Promise<{ cid?: string }>;
}) {
  const { cid } = await searchParams;
  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8 md:px-8 md:py-10">
      <TraceExplorer initialCid={cid} />
    </div>
  );
}
