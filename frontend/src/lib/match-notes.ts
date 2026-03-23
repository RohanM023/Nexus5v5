const STORAGE_KEY = "nexus-match-notes";

interface MatchNoteEntry {
  text: string;
  updated_at: string;
}

type MatchNotesStore = Record<string, MatchNoteEntry>;

function getStore(): MatchNotesStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getMatchNote(matchId: string): string | null {
  const store = getStore();
  const entry = store[matchId];
  return entry ? entry.text : null;
}

export function setMatchNote(matchId: string, text: string): void {
  if (typeof window === "undefined") return;
  try {
    const store = getStore();
    const trimmed = text.slice(0, 200);
    if (!trimmed) {
      delete store[matchId];
    } else {
      store[matchId] = { text: trimmed, updated_at: new Date().toISOString() };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}
