import type { DraftPick, DraftBan } from "@/types";

interface DraftShareData {
  bp: number[]; // blue picks champion IDs
  rp: number[]; // red picks champion IDs
  bb: number[]; // blue bans champion IDs
  rb: number[]; // red bans champion IDs
}

export function encodeDraftState(
  bluePicks: DraftPick[],
  redPicks: DraftPick[],
  blueBans: DraftBan[],
  redBans: DraftBan[]
): string {
  const data: DraftShareData = {
    bp: bluePicks.map((p) => p.champion_id),
    rp: redPicks.map((p) => p.champion_id),
    bb: blueBans.map((b) => b.champion_id),
    rb: redBans.map((b) => b.champion_id),
  };
  return btoa(JSON.stringify(data));
}

export function generateShareUrl(
  bluePicks: DraftPick[],
  redPicks: DraftPick[],
  blueBans: DraftBan[],
  redBans: DraftBan[]
): string {
  const encoded = encodeDraftState(bluePicks, redPicks, blueBans, redBans);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/draft/shared?d=${encoded}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
