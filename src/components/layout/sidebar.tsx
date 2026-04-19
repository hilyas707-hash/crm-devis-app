"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, FileText, Receipt, Package,
  TrendingUp, Calendar, Settings, Building2, X, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/devis", label: "Devis", icon: FileText },
  { href: "/factures", label: "Factures", icon: Receipt },
  { href: "/produits", label: "Produits", icon: Package },
  { href: "/deals", label: "Pipeline", icon: TrendingUp },
  { href: "/activites", label: "Activités", icon: Calendar },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} onClick={onClick}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--sidebar-accent)] text-white"
                  : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-accent)] hover:text-white"
              )}>
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[var(--sidebar-border)] px-3 py-4">
        <Link href="/parametres" onClick={onClick}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
            usePathname().startsWith("/parametres")
              ? "bg-[var(--sidebar-accent)] text-white"
              : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-accent)] hover:text-white"
          )}>
          <Settings className="h-4 w-4 shrink-0" />
          Paramètres
        </Link>
      </div>
    </>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen w-64 shrink-0 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
        <div className="flex h-16 items-center gap-2 border-b border-[var(--sidebar-border)] px-6">
          <Building2 className="h-6 w-6 text-blue-400" />
          <span className="text-lg font-bold tracking-tight">CRM Devis</span>
        </div>
        <NavLinks />
      </aside>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-[var(--sidebar)] text-white shadow-lg"
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          {/* Drawer */}
          <aside className="relative flex h-full w-72 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-[var(--sidebar-border)] px-6">
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-blue-400" />
                <span className="text-lg font-bold tracking-tight">CRM Devis</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-[var(--sidebar-muted)] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onClick={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
