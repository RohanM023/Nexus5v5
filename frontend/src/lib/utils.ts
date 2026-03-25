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

export function getItemIconUrl(itemId: number): string {
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/item/${itemId}.png`;
}

export function getChampionSplashUrl(championName: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championName}_0.jpg`;
}

export function getTierColor(tier: "S" | "A" | "B" | "C"): string {
  switch (tier) {
    case "S": return "text-[var(--color-tier-s)]";
    case "A": return "text-[var(--color-tier-a)]";
    case "B": return "text-[var(--color-tier-b)]";
    case "C": return "text-[var(--color-tier-c)]";
  }
}

export function getTierBgColor(tier: "S" | "A" | "B" | "C"): string {
  switch (tier) {
    case "S": return "bg-[var(--color-tier-s-bg)] border-[var(--color-tier-s)]";
    case "A": return "bg-[var(--color-tier-a-bg)] border-[var(--color-tier-a)]";
    case "B": return "bg-[var(--color-tier-b-bg)] border-[var(--color-tier-b)]";
    case "C": return "bg-[var(--color-tier-c-bg)] border-[var(--color-tier-c)]";
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-[var(--color-score-high)]";
  if (score >= 60) return "text-[var(--color-score-mid)]";
  if (score >= 40) return "text-[var(--color-score-low)]";
  return "text-[var(--color-score-poor)]";
}

export function getScoreBarColor(score: number): string {
  if (score >= 80) return "bg-[var(--color-score-high-bg)]";
  if (score >= 60) return "bg-[var(--color-score-mid-bg)]";
  if (score >= 40) return "bg-[var(--color-score-low-bg)]";
  return "bg-[var(--color-score-poor-bg)]";
}
