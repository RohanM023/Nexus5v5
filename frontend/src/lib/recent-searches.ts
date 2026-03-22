const STORAGE_KEY = "nexus-recent-searches";
const MAX_RECENT = 5;

export interface RecentSearch {
  gameName: string;
  tagLine: string;
  region: string;
}

export function getRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(search: RecentSearch): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentSearches();
    const filtered = existing.filter(
      (s) =>
        !(
          s.gameName.toLowerCase() === search.gameName.toLowerCase() &&
          s.tagLine.toLowerCase() === search.tagLine.toLowerCase() &&
          s.region === search.region
        )
    );
    const updated = [search, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}
