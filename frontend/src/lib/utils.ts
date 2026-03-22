import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKDA(kills: number, deaths: number, assists: number): string {
  return `${kills}/${deaths}/${assists}`;
}

export function formatKDARatio(kills: number, deaths: number, assists: number): string {
  const ratio = deaths === 0 ? kills + assists : (kills + assists) / deaths;
  return ratio.toFixed(2);
}

export function formatCsPerMin(cs: number, gameDurationSeconds: number): string {
  const minutes = gameDurationSeconds / 60;
  return (cs / minutes).toFixed(1);
}

export function formatWinRate(winRate: number): string {
  return `${(winRate * 100).toFixed(1)}%`;
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

const DDRAGON_VERSION =
  process.env.NEXT_PUBLIC_DDRAGON_VERSION || "16.6.1";

export function getChampionIconUrl(championName: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${championName}.png`;
}

export function getProfileIconUrl(iconId: number): string {
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/profileicon/${iconId}.png`;
}

export function getChampionSplashUrl(championName: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championName}_0.jpg`;
}

export function getTierColor(tier: "S" | "A" | "B" | "C"): string {
  switch (tier) {
    case "S":
      return "text-amber-400";
    case "A":
      return "text-sky-400";
    case "B":
      return "text-violet-400";
    case "C":
      return "text-neutral-500";
  }
}

export function getTierBgColor(tier: "S" | "A" | "B" | "C"): string {
  switch (tier) {
    case "S":
      return "bg-amber-400/15 border-amber-400/40";
    case "A":
      return "bg-sky-400/15 border-sky-400/40";
    case "B":
      return "bg-violet-400/15 border-violet-400/40";
    case "C":
      return "bg-neutral-400/15 border-neutral-500/40";
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

export function getScoreBarColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}
