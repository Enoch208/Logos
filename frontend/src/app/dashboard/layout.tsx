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
        <div className="flex min-h-screen w-full bg-canvas text-foreground">
          <DashboardSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <DashboardTopbar />
            <main className="flex-1">{children}</main>
          </div>
        </div>
      </DashboardNavProvider>
    </Web3Provider>
  );
}
