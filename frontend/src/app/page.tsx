import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { InfrastructureSection } from "@/components/landing/InfrastructureSection";
import { AtlasSection } from "@/components/landing/AtlasSection";
import { SpecialistDirectory } from "@/components/landing/SpecialistDirectory";
import { CTASection } from "@/components/landing/CTASection";
import { LiveStatsStrip } from "@/components/landing/LiveStatsStrip";

export default function Home() {
  return (
    <>
      <Header />
      <main className="relative flex flex-1 flex-col overflow-hidden pb-32">
        <Hero />
        <InfrastructureSection />
        <AtlasSection />
        <SpecialistDirectory />
        <CTASection />
        <LiveStatsStrip />
      </main>
      <Footer />
    </>
  );
}
