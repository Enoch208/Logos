"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  DashboardSquare01Icon,
  Package01Icon,
  RankingIcon,
  AiBrain03Icon,
  CodeSquareIcon,
  BookOpen02Icon,
  Settings01Icon,
  Cancel01Icon,
} from "hugeicons-react";
import { useDashboardNav } from "@/lib/dashboard-nav";

type NavItem = {
  label: string;
  href: string;
  icon: typeof DashboardSquare01Icon;
};

const PRIMARY_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: DashboardSquare01Icon },
  { label: "Specialists", href: "/dashboard/specialists", icon: Package01Icon },
  { label: "Leaderboard", href: "/dashboard/leaderboard", icon: RankingIcon },
  { label: "Atlas", href: "/dashboard/atlas", icon: AiBrain03Icon },
  { label: "Trace explorer", href: "/dashboard/trace", icon: CodeSquareIcon },
];

const SECONDARY_NAV: NavItem[] = [
  { label: "Documentation", href: "/", icon: BookOpen02Icon },
  { label: "Settings", href: "#", icon: Settings01Icon },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors duration-200 ease-out ${
        active
          ? "bg-white/[0.06] text-foreground"
          : "text-foreground/70 hover:bg-white/[0.04] hover:text-foreground"
      }`}
    >
      <item.icon
        size={15}
        strokeWidth={1.5}
        className={active ? "text-foreground" : "text-muted group-hover:text-foreground/90"}
      />
      <span>{item.label}</span>
    </Link>
  );
}

function NavInner({ pathname }: { pathname: string }) {
  return (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted/60">
          Marketplace
        </p>
        <ul className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={isActive(pathname, item.href)} />
            </li>
          ))}
        </ul>

        <p className="px-3 pt-6 pb-2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted/60">
          Resources
        </p>
        <ul className="space-y-0.5">
          {SECONDARY_NAV.map((item) => (
            <li key={item.label}>
              <NavLink item={item} active={false} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-white/5 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="relative inline-flex h-2 w-2 items-center justify-center">
            <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[12px] text-foreground/90">Arc testnet</span>
            <span className="font-mono text-[10px] text-muted">chain 5042002</span>
          </div>
        </div>
      </div>
    </>
  );
}

function SidebarHeader({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex h-16 items-center gap-2.5 border-b border-white/5 px-5">
      <Link href="/" className="flex items-center gap-2.5">
        <Image src="/logo.png" alt="Logos" width={24} height={24} className="rounded-md" />
        <span className="text-[14px] font-medium tracking-tight">Logos</span>
      </Link>
      <span className="ml-auto rounded-sm border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
        testnet
      </span>
      {onClose && (
        <button
          aria-label="Close navigation"
          onClick={onClose}
          className="cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
        >
          <Cancel01Icon size={16} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { open, setOpen } = useDashboardNav();

  return (
    <>
      <aside className="hidden lg:flex h-screen sticky top-0 w-[240px] shrink-0 flex-col border-r border-white/5 bg-[#0F1012]">
        <SidebarHeader />
        <NavInner pathname={pathname} />
      </aside>

      <div
        aria-hidden={!open}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/65 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-hidden={!open}
        className={`fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-white/5 bg-[#0F1012] transition-transform duration-300 ease-out lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarHeader onClose={() => setOpen(false)} />
        <NavInner pathname={pathname} />
      </aside>
    </>
  );
}
