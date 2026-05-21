import { DashboardSidebar } from "@/components/landing/dashboard/DashboardSidebar";
import { DashboardQueryRail } from "@/components/landing/dashboard/DashboardQueryRail";
import { DashboardMainPanel } from "@/components/landing/dashboard/DashboardMainPanel";

export function HeroDashboardPreview() {
  return (
    <div
      className="group relative -mt-8 px-4 pt-20 pb-20 [perspective:2000px] md:px-0"
      style={{
        WebkitMaskImage:
          "linear-gradient(180deg, transparent, black 0%, black 25%, transparent)",
        maskImage:
          "linear-gradient(180deg, transparent, black 0%, black 25%, transparent)",
      }}
    >
      <div
        className={[
          "relative mx-auto max-w-[1300px] left-20 overflow-hidden",
          "rounded-xl border border-white/10 bg-[#0F1012]",
          "shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06),0_0_120px_-30px_rgba(245,158,11,0.18)]",
          "transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]",
          "[transform-style:preserve-3d]",
          "[transform:rotateX(20deg)_rotateY(30deg)_rotateZ(-20deg)_translateY(2rem)]",
          "group-hover:left-0",
          "group-hover:[transform:rotateX(0deg)_rotateY(0deg)_rotateZ(0deg)_translateY(0)]",
          "group-hover:shadow-2xl",
        ].join(" ")}
        style={{
          WebkitMaskImage:
            "linear-gradient(transparent, black 0%, black 50%, transparent)",
          maskImage:
            "linear-gradient(transparent, black 0%, black 50%, transparent)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_bottom_right,rgba(255,255,255,0.05)_0%,transparent_40%)]" />
        <div className="grid h-[800px] grid-cols-[260px_380px_1fr] divide-x divide-white/[0.05]">
          <DashboardSidebar />
          <DashboardQueryRail />
          <DashboardMainPanel />
        </div>
      </div>
    </div>
  );
}
