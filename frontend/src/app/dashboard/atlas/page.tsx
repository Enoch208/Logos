import { AtlasPanel } from "@/components/dashboard/AtlasPanel";

export const metadata = {
  title: "Atlas · Logos",
};

export default function AtlasPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8 md:px-8 md:py-10">
      <AtlasPanel />
    </div>
  );
}
