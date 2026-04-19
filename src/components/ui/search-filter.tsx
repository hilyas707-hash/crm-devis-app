"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useRef, useTransition } from "react";
import { Search, X, Filter } from "lucide-react";

interface Option { value: string; label: string; color?: string }

interface SearchFilterProps {
  placeholder?: string;
  statusOptions?: Option[];
  currentSearch?: string;
  currentStatus?: string;
}

export function SearchFilter({ placeholder = "Rechercher…", statusOptions, currentSearch = "", currentStatus = "" }: SearchFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function update(search: string, status: string) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    startTransition(() => { router.push(`${pathname}?${params.toString()}`); });
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Search input */}
      <div className="relative flex-1">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${isPending ? "text-[var(--primary)] animate-pulse" : "text-[var(--muted-foreground)]"}`} />
        <input
          ref={inputRef}
          type="search"
          defaultValue={currentSearch}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
          onKeyDown={(e) => {
            if (e.key === "Enter") update((e.target as HTMLInputElement).value, currentStatus);
          }}
          onChange={(e) => {
            if (e.target.value === "") update("", currentStatus);
          }}
        />
        {currentSearch && (
          <button onClick={() => { if (inputRef.current) inputRef.current.value = ""; update("", currentStatus); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Status filter */}
      {statusOptions && (
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => update(currentSearch, "")}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${!currentStatus ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md shadow-blue-500/20" : "bg-white border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]"}`}>
            Tous
          </button>
          {statusOptions.map((opt) => (
            <button key={opt.value} onClick={() => update(currentSearch, opt.value)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${currentStatus === opt.value ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md shadow-blue-500/20" : "bg-white border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
