"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import {
  LayoutDashboard, Users, FileText, Receipt, Package,
  TrendingUp, Calendar, Settings, X, Menu, ChevronRight,
  Building2, ChevronDown, Check, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { switchActiveCompany } from "@/actions/company";

const navItems = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard, color: "text-blue-400" },
  { href: "/clients", label: "Clients", icon: Users, color: "text-emerald-400" },
  { href: "/devis", label: "Devis", icon: FileText, color: "text-violet-400" },
  { href: "/factures", label: "Factures", icon: Receipt, color: "text-amber-400" },
  { href: "/produits", label: "Produits", icon: Package, color: "text-cyan-400" },
  { href: "/deals", label: "Pipeline", icon: TrendingUp, color: "text-pink-400" },
  { href: "/activites", label: "Activités", icon: Calendar, color: "text-orange-400" },
];

interface SidebarProps {
  companies: { id: string; name: string }[];
  activeCompanyId: string;
  activeCompanyName: string;
}

function CompanySwitcher({ companies, activeCompanyId, activeCompanyName }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSwitch(companyId: string) {
    if (companyId === activeCompanyId) { setOpen(false); return; }
    setOpen(false);
    startTransition(() => switchActiveCompany(companyId));
  }

  if (companies.length <= 1) {
    return (
      <div className="mx-3 mb-1 px-3 py-2.5 rounded-xl bg-white/5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-6 w-6 rounded-md bg-blue-500/20 flex items-center justify-center shrink-0">
            <Building2 className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <span className="text-sm text-white font-medium truncate">{activeCompanyName}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-3 mb-1">
      <button
        onClick={() => setOpen(!open)}
        disabled={pending}
        className="w-full px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-2.5 min-w-0"
      >
        <div className="h-6 w-6 rounded-md bg-blue-500/20 flex items-center justify-center shrink-0">
          <Building2 className="h-3.5 w-3.5 text-blue-400" />
        </div>
        <span className="text-sm text-white font-medium truncate flex-1 text-left">{activeCompanyName}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
          {companies.map((c) => (
            <button key={c.id} onClick={() => handleSwitch(c.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-white/5 transition-colors text-left">
              <div className={cn(
                "h-5 w-5 rounded flex items-center justify-center shrink-0",
                c.id === activeCompanyId ? "bg-blue-500/30" : "bg-white/5"
              )}>
                {c.id === activeCompanyId
                  ? <Check className="h-3 w-3 text-blue-400" />
                  : <Building2 className="h-3 w-3 text-slate-500" />
                }
              </div>
              <span className={cn("truncate flex-1", c.id === activeCompanyId ? "text-white font-medium" : "text-slate-400")}>
                {c.name}
              </span>
            </button>
          ))}
          <div className="border-t border-white/5">
            <Link href="/parametres?tab=entreprises" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
              <Plus className="h-3 w-3" /> Ajouter une entreprise
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NavLinks({ companies, activeCompanyId, activeCompanyName, onClick }: SidebarProps & { onClick?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <CompanySwitcher companies={companies} activeCompanyId={activeCompanyId} activeCompanyName={activeCompanyName} />
      <nav className="flex-1 space-y-0.5 px-3 py-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} onClick={onClick}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}>
              <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? item.color : "group-hover:" + item.color)} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-3 w-3 opacity-50" />}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/5 px-3 py-4 shrink-0">
        <SettingsLink onClick={onClick} />
      </div>
    </div>
  );
}

function SettingsLink({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith("/parametres");
  return (
    <Link href="/parametres" onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
        isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
      )}>
      <Settings className={cn("h-4 w-4 shrink-0", isActive ? "text-slate-300" : "")} />
      Paramètres
    </Link>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
        <span className="text-white text-sm font-bold">C</span>
      </div>
      <div>
        <p className="text-white font-bold text-sm leading-none">CRM Devis</p>
        <p className="text-slate-500 text-[10px] mt-0.5">Gestion commerciale</p>
      </div>
    </div>
  );
}

export function Sidebar({ companies, activeCompanyId, activeCompanyName }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen w-64 shrink-0 flex-col bg-[var(--sidebar)] border-r border-white/5">
        <div className="flex h-16 items-center px-5 border-b border-white/5 shrink-0">
          <Logo />
        </div>
        <NavLinks companies={companies} activeCompanyId={activeCompanyId} activeCompanyName={activeCompanyName} />
      </aside>

      {/* Mobile hamburger */}
      <button onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2.5 rounded-xl bg-[var(--sidebar)] text-white shadow-xl border border-white/10"
        aria-label="Menu">
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col bg-[var(--sidebar)] shadow-2xl border-r border-white/5">
            <div className="flex h-16 items-center justify-between px-5 border-b border-white/5 shrink-0">
              <Logo />
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks companies={companies} activeCompanyId={activeCompanyId} activeCompanyName={activeCompanyName} onClick={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
