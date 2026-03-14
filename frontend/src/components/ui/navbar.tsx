"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { usePathname } from "next/navigation";

const REGIONS = [
  { value: "na1", label: "NA" },
  { value: "euw1", label: "EUW" },
  { value: "eun1", label: "EUNE" },
  { value: "kr", label: "KR" },
  { value: "br1", label: "BR" },
  { value: "la1", label: "LAN" },
  { value: "la2", label: "LAS" },
  { value: "oc1", label: "OCE" },
  { value: "tr1", label: "TR" },
  { value: "ru", label: "RU" },
  { value: "jp1", label: "JP" },
] as const;

export function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuth();
  const pathname = usePathname();
  const [searchInput, setSearchInput] = useState("");
  const [region, setRegion] = useState("na1");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    const parts = trimmed.split("#");
    if (parts.length === 2) {
      const [gameName, tagLine] = parts;
      router.push(`/summoner/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
      setSearchInput("");
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
              N
            </div>
            <span className="text-lg font-bold text-white">Nexus</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <NavLink href="/" active={pathname === "/"}>
              Search
            </NavLink>
            <NavLink href="/draft" active={pathname.startsWith("/draft")}>
              Draft
            </NavLink>
            {isAuthenticated && (
              <>
                <NavLink href="/dashboard" active={pathname.startsWith("/dashboard")}>
                  Dashboard
                </NavLink>
                <NavLink href="/profile" active={pathname === "/profile"}>
                  Profile
                </NavLink>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <form onSubmit={handleSearch} className="hidden items-center gap-2 lg:flex">
            <input
              type="text"
              placeholder="Name#TAG"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-40 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </form>

          {isAuthenticated ? (
            <>
              <span className="hidden text-sm text-slate-400 sm:block">
                {user?.display_name}
              </span>
              <Link href="/settings">
                <Button variant="ghost" size="sm">
                  Settings
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

interface NavLinkProps {
  href: string;
  active: boolean;
  children: React.ReactNode;
}

function NavLink({ href, active, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-slate-800 text-white"
          : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
      )}
    >
      {children}
    </Link>
  );
}
