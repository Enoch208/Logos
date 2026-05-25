import type { Metadata } from "next";
import { DashboardSidebar } from "@/components/dashboard/layout/DashboardSidebar";
import { DashboardTopbar } from "@/components/dashboard/layout/DashboardTopbar";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { DashboardNavProvider } from "@/lib/dashboard-nav";

export const metadata: Metadata = {
  title: "Logos · Marketplace terminal",
  description:
    "Live observability for the Logos marketplace — agent-to-agent queries, specialist directory, reputation, and Atlas composition traces in real time.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Web3Provider>
      <DashboardNavProvider>
        {/* App-shell: the frame is exactly viewport height and only <main>
            scrolls, so the sidebar + topbar stay static (and it's immune to the
            global `overflow-x: hidden` that otherwise breaks position: sticky). */}
        <div className="flex h-screen w-full overflow-hidden bg-canvas text-foreground">
          <DashboardSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <DashboardTopbar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </DashboardNavProvider>
    </Web3Provider>
  );
}
