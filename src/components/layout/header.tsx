"use client";

import { signOut, useSession } from "next-auth/react";
import { Bell, LogOut, User, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface HeaderProps {
  title?: string;
  backHref?: string;
  badge?: React.ReactNode;
}

export function Header({ title, backHref, badge }: HeaderProps) {
  const { data: session } = useSession();

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  return (
    <header className="flex h-14 items-center gap-2 border-b bg-white/90 backdrop-blur-sm px-3 md:px-5 sticky top-0 z-30">
      {/* Mobile spacer for hamburger */}
      <div className="md:hidden w-9 shrink-0" />

      {/* Back button */}
      {backHref && (
        <Link href={backHref}
          className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      )}

      {/* Title + badge */}
      {title && (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h1 className="text-sm md:text-base font-semibold text-[var(--foreground)] truncate leading-tight">
            {title}
          </h1>
          {badge && <span className="shrink-0">{badge}</span>}
        </div>
      )}

      {!title && <div className="flex-1" />}

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="hidden sm:inline-flex h-8 w-8">
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image || ""} />
                <AvatarFallback className="bg-blue-600 text-white text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-[var(--muted-foreground)] truncate">{session?.user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem><User className="mr-2 h-4 w-4" />Mon profil</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600"
              onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="mr-2 h-4 w-4" />Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
