"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { useClashDashboard } from "@/lib/hooks/use-clash-dashboard";
import { useClashStore } from "@/lib/stores/clash-store";
import { useTeamPresetsStore } from "@/lib/stores/team-presets-store";
import type { TeamPresetPlayer } from "@/lib/stores/team-presets-store";
import { api, ApiError } from "@/lib/api";
import { getChampionIconUrl } from "@/lib/utils";
import { TeamPanel } from "./team-panel";
import { WinProbability } from "./win-probability";
import { RecommendationRow } from "./recommendation-row";
import { BanPriority } from "./ban-priority";
import { TeamRadarChart } from "@/components/charts/team-radar-chart";
import { ChampionSelect } from "@/components/draft/champion-select";
import type { TeamPlayer, TeamRole } from "@/types";

const ROLES: TeamRole[] = ["TOP", "JUNGLE", "MID", "BOT", "SUPPORT"];

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

export function ClashView() {
  const {
    yourTeam,
    opponentTeam,
    yourBans,
    opponentBans,
    addPlayer,
    removePlayer,
    setSelectedChampion,
    addBan,
    removeBan,
    radarData,
    winProbability,
    banTargets,
    suggestions,
    suggestionsLoading,
    yourPools,
    opponentPools,
    yourPoolsLoading,
    opponentPoolsLoading,
  } = useClashDashboard();

  const { presets, savePreset, deletePreset } = useTeamPresetsStore();
  const [presetName, setPresetName] = useState("");
  const [showPresets, setShowPresets] = useState(false);

  const queryClient = useQueryClient();
  const activePolls = useRef<Set<string>>(new Set());

  const [addingRole, setAddingRole] = useState<{ side: "your" | "opponent"; role: TeamRole } | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [regionInput, setRegionInput] = useState("na1");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [ingestingPuuids, setIngestingPuuids] = useState<Set<string>>(new Set());

  const [pickingFor, setPickingFor] = useState<{ side: "your" | "opponent"; role: TeamRole } | null>(null);
  const [banningFor, setBanningFor] = useState<"your" | "opponent" | null>(null);

  const pollIngestion = useCallback(
    (jobId: string, puuid: string, side: "your" | "opponent") => {
      if (activePolls.current.has(puuid)) return;
      activePolls.current.add(puuid);
      setIngestingPuuids((prev) => new Set(prev).add(puuid));

      const poll = async () => {
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const status = await api.getIngestionStatus(jobId);
            if (status.status === "completed" || status.status === "complete" || status.status === "not_found") {
              break;
            }
            if (status.status === "failed") break;
          } catch {
            break;
          }
        }
        activePolls.current.delete(puuid);
        setIngestingPuuids((prev) => {
          const next = new Set(prev);
          next.delete(puuid);
          return next;
        });
        // Invalidate pool caches so mastery data refetches
        await queryClient.invalidateQueries({ queryKey: ["clash-your-pools"] });
        await queryClient.invalidateQueries({ queryKey: ["clash-opponent-pools"] });
      };

      poll();
    },
    [queryClient]
  );

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingRole || !nameInput.trim()) return;

    const parts = nameInput.trim().split("#");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      setLookupError("Enter Riot ID as GameName#TAG");
      return;
    }

    const [gameName, tagLine] = parts;
    setLookupLoading(true);
    setLookupError("");

    try {
      const summoner = await api.lookupSummoner(regionInput, gameName, tagLine);

      addPlayer(addingRole.side, addingRole.role, {
        puuid: summoner.puuid,
        game_name: summoner.game_name,
        tag_line: summoner.tag_line,
        role: addingRole.role,
        alt_accounts: [],
        top_champions: [],
      });

      const side = addingRole.side;
      api
        .triggerIngestion(summoner.puuid, { region: regionInput })
        .then((res) => {
          // Inline ingestion returns status:"complete" immediately — refresh pools now
          if (res.status === "complete" || res.error) {
            queryClient.invalidateQueries({ queryKey: [`clash-${side}-pools`] });
          }
          if (res.job_id && !res.error) {
            pollIngestion(res.job_id, summoner.puuid, side);
          }
        })
        .catch(() => {
          queryClient.invalidateQueries({ queryKey: [`clash-${side}-pools`] });
        });

      setNameInput("");
      setAddingRole(null);
    } catch (err) {
      const isApiKeyError = err instanceof ApiError && (err.code === "RIOT_API_ERROR" || err.status === 502);
      setLookupError(
        isApiKeyError
          ? "Riot API key expired. Update RIOT_API_KEY in .env and restart the backend."
          : "Player not found. Check the Riot ID and region."
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const toPresetPlayer = (p: TeamPlayer | null): TeamPresetPlayer | null => {
    if (!p) return null;
    return { puuid: p.puuid, game_name: p.game_name, tag_line: p.tag_line, role: p.role };
  };

  const unavailableChampionIds = [
    ...yourTeam.filter(Boolean).map((p) => p!.selected_champion?.id).filter((id): id is number => id !== undefined),
    ...opponentTeam.filter(Boolean).map((p) => p!.selected_champion?.id).filter((id): id is number => id !== undefined),
    ...yourBans.filter((b): b is { id: number; name: string } => b !== null).map((b) => b.id),
    ...opponentBans.filter((b): b is { id: number; name: string } => b !== null).map((b) => b.id),
  ];

  const handleChampionPicked = (championId: number) => {
    if (!pickingFor) return;
    const name = CHAMPION_ID_TO_NAME[championId] ?? "";
    setSelectedChampion(pickingFor.side, pickingFor.role, { id: championId, name });
    setPickingFor(null);
  };

  const handleBanPicked = (championId: number) => {
    if (!banningFor) return;
    const name = CHAMPION_ID_TO_NAME[championId] ?? "";
    addBan(banningFor, { id: championId, name });
    setBanningFor(null);
  };

  return (
    <div className="space-y-8">
      {/* Search */}
      <div className="flex justify-center">
        <div className="flex w-full max-w-md items-center border-b border-[var(--color-border)] transition-colors focus-within:border-[var(--color-accent)]/40">
          <svg className="h-3.5 w-3.5 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search Team, Player, or Clash ID"
            className="flex-1 bg-transparent px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
          />
        </div>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_auto_1fr]">
        <TeamPanel
          players={[...yourTeam]}
          side="your"
          label="Your Team"
          pools={yourPools}
          poolsLoading={yourPoolsLoading}
          ingestingPuuids={ingestingPuuids}
          onPickChampion={(role) => setPickingFor({ side: "your", role })}
        />

        <div className="flex flex-col items-center gap-4">
          <p className="font-mono text-xs tracking-[0.4em] uppercase text-[var(--color-text-muted)]">
            vs
          </p>
          <TeamRadarChart data={radarData} />
          <WinProbability probability={winProbability} />
        </div>

        <TeamPanel
          players={[...opponentTeam]}
          side="opponent"
          label="Opponent"
          pools={opponentPools}
          poolsLoading={opponentPoolsLoading}
          ingestingPuuids={ingestingPuuids}
          onPickChampion={(role) => setPickingFor({ side: "opponent", role })}
        />
      </div>

      {pickingFor && (
        <ChampionSelect
          unavailableIds={unavailableChampionIds}
          onSelect={handleChampionPicked}
          onClose={() => setPickingFor(null)}
          mode="pick"
        />
      )}

      {banningFor && (
        <ChampionSelect
          unavailableIds={unavailableChampionIds}
          onSelect={handleBanPicked}
          onClose={() => setBanningFor(null)}
          mode="ban"
        />
      )}

      {/* Add player modal */}
      {addingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleAddPlayer}
            className="w-72 space-y-4 rounded-md bg-[var(--color-surface)] p-5 shadow-2xl"
          >
            <p className="text-xs font-medium text-[var(--color-text-primary)]">
              Add {addingRole.side === "your" ? "your" : "opponent"}{" "}
              {addingRole.role} player
            </p>
            <div className="flex gap-2">
              <select
                value={regionInput}
                onChange={(e) => setRegionInput(e.target.value)}
                className="border-b border-[var(--color-border)] bg-transparent py-1.5 font-mono text-[10px] text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value} className="bg-[var(--color-surface)]">
                    {r.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="GameName#TAG"
                value={nameInput}
                onChange={(e) => { setNameInput(e.target.value); setLookupError(""); }}
                className="flex-1 border-b border-[var(--color-border)] bg-transparent py-1.5 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                autoFocus
              />
            </div>
            {lookupError && (
              <p className="text-xs text-[var(--color-danger)]">{lookupError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={lookupLoading}
                className="flex flex-1 items-center justify-center rounded-md bg-[var(--color-accent-bg)] py-1.5 text-xs font-medium text-black hover:bg-[var(--color-accent-bg-hover)] disabled:opacity-40"
              >
                {lookupLoading ? (
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  "Add"
                )}
              </button>
              <button
                type="button"
                onClick={() => { setAddingRole(null); setNameInput(""); setLookupError(""); }}
                className="flex-1 rounded-md py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick-add buttons */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="font-mono text-[10px] tracking-wider uppercase text-[var(--color-text-muted)]">
            Your Players
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ROLES.map((role, idx) =>
              !yourTeam[idx] ? (
                <button
                  key={role}
                  onClick={() => setAddingRole({ side: "your", role })}
                  className="rounded px-2.5 py-1 font-mono text-xs text-[var(--color-accent-text)]/60 transition-colors hover:text-[var(--color-accent-hover)] hover:bg-[var(--color-accent-bg)]/5"
                >
                  + {role}
                </button>
              ) : (
                <button
                  key={role}
                  onClick={() => removePlayer("your", role)}
                  className="rounded px-2.5 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                >
                  {yourTeam[idx]!.game_name} ×
                </button>
              )
            )}
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-mono text-[10px] tracking-wider uppercase text-[var(--color-text-muted)]">
            Opponent Players
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ROLES.map((role, idx) =>
              !opponentTeam[idx] ? (
                <button
                  key={role}
                  onClick={() => setAddingRole({ side: "opponent", role })}
                  className="rounded px-2.5 py-1 font-mono text-xs text-[var(--color-danger)]/50 transition-colors hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/5"
                >
                  + {role}
                </button>
              ) : (
                <button
                  key={role}
                  onClick={() => removePlayer("opponent", role)}
                  className="rounded px-2.5 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                >
                  {opponentTeam[idx]!.game_name} ×
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Bans */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="font-mono text-[10px] tracking-wider uppercase text-[var(--color-text-muted)]">
            Your Bans
          </p>
          <div className="flex gap-1.5">
            {yourBans.map((ban, idx) =>
              ban ? (
                <button
                  key={idx}
                  onClick={() => removeBan("your", ban.id)}
                  className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded transition-opacity hover:opacity-70"
                  title={`Remove ${ban.name} ban`}
                >
                  <Image
                    src={getChampionIconUrl(ban.name)}
                    alt={ban.name}
                    width={40}
                    height={40}
                    className="rounded grayscale"
                    unoptimized
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-[var(--color-danger)]/80">×</span>
                  </div>
                </button>
              ) : (
                <button
                  key={idx}
                  onClick={() => setBanningFor("your")}
                  className="flex h-10 w-10 items-center justify-center rounded border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-danger)]/40 hover:text-[var(--color-danger)]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </button>
              )
            )}
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-mono text-[10px] tracking-wider uppercase text-[var(--color-text-muted)]">
            Opponent Bans
          </p>
          <div className="flex gap-1.5">
            {opponentBans.map((ban, idx) =>
              ban ? (
                <button
                  key={idx}
                  onClick={() => removeBan("opponent", ban.id)}
                  className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded transition-opacity hover:opacity-70"
                  title={`Remove ${ban.name} ban`}
                >
                  <Image
                    src={getChampionIconUrl(ban.name)}
                    alt={ban.name}
                    width={40}
                    height={40}
                    className="rounded grayscale"
                    unoptimized
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-[var(--color-danger)]/80">×</span>
                  </div>
                </button>
              ) : (
                <button
                  key={idx}
                  onClick={() => setBanningFor("opponent")}
                  className="flex h-10 w-10 items-center justify-center rounded border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-danger)]/40 hover:text-[var(--color-danger)]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Team Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wide text-[var(--color-text-primary)]">
            Team Presets
          </h3>
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="font-mono text-[10px] tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            {showPresets ? "Hide" : `Show (${presets.length})`}
          </button>
        </div>

        {/* Save */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Preset name..."
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            className="flex-1 border-b border-[var(--color-border)] bg-transparent py-1 font-mono text-[10px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
          />
          <button
            onClick={() => {
              if (!presetName.trim()) return;
              savePreset(presetName.trim(), yourTeam.map(toPresetPlayer));
              setPresetName("");
            }}
            disabled={!presetName.trim() || yourTeam.every((p) => !p)}
            className="font-mono text-[10px] tracking-wider text-[var(--color-accent-text)] transition-colors hover:text-[var(--color-accent-hover)] disabled:opacity-40"
          >
            Save
          </button>
        </div>

        {/* Preset list */}
        {showPresets && presets.length > 0 && (
          <div className="space-y-1">
            {presets.map((preset) => {
              const playerCount = preset.players.filter(Boolean).length;
              return (
                <div
                  key={preset.name}
                  className="flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-[var(--color-surface-hover)]"
                >
                  <span className="flex-1 truncate font-mono text-xs text-[var(--color-text-primary)]">
                    {preset.name}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                    {playerCount}/5
                  </span>
                  <button
                    onClick={() => {
                      const { resetTeams, addPlayer } = useClashStore.getState();
                      resetTeams();
                      const roles: TeamRole[] = ["TOP", "JUNGLE", "MID", "BOT", "SUPPORT"];
                      preset.players.forEach((p, i) => {
                        if (p) {
                          addPlayer("your", roles[i], {
                            puuid: p.puuid,
                            game_name: p.game_name,
                            tag_line: p.tag_line,
                            role: roles[i],
                            alt_accounts: [],
                            top_champions: [],
                          });
                        }
                      });
                    }}
                    className="font-mono text-[10px] tracking-wider text-[var(--color-accent-text)] hover:text-[var(--color-accent-hover)]"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => deletePreset(preset.name)}
                    className="font-mono text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Draft Engine */}
      <div className="space-y-3">
        <div className="flex items-baseline gap-3">
          <h3 className="text-xs font-semibold tracking-wide text-[var(--color-text-primary)]">
            Draft Assistant
          </h3>
          <span className="font-mono text-[10px] tracking-wider uppercase text-[var(--color-accent-text)]/60">
            Live Synergy / Counter
          </span>
        </div>
        <RecommendationRow
          suggestions={suggestions}
          loading={suggestionsLoading}
        />
      </div>

      {/* Ban Priority */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold tracking-wide text-[var(--color-text-primary)]">
          Ban Priority
        </h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <BanPriority bans={banTargets.slice(0, 10)} />
          <BanPriority bans={banTargets.slice(10, 20)} />
        </div>
      </div>
    </div>
  );
}

const CHAMPION_ID_TO_NAME: Record<number, string> = {
  266: "Aatrox", 103: "Ahri", 84: "Akali", 166: "Akshan", 12: "Alistar",
  799: "Ambessa", 32: "Amumu", 34: "Anivia", 1: "Annie", 523: "Aphelios",
  22: "Ashe", 136: "AurelionSol", 893: "Aurora", 268: "Azir",
  432: "Bard", 200: "Belveth", 53: "Blitzcrank", 63: "Brand",
  201: "Braum", 233: "Briar", 51: "Caitlyn", 164: "Camille",
  69: "Cassiopeia", 31: "Chogath", 42: "Corki", 122: "Darius",
  131: "Diana", 36: "DrMundo", 119: "Draven", 245: "Ekko",
  60: "Elise", 28: "Evelynn", 81: "Ezreal", 9: "Fiddlesticks",
  114: "Fiora", 105: "Fizz", 3: "Galio", 41: "Gangplank",
  86: "Garen", 150: "Gnar", 79: "Gragas", 104: "Graves",
  887: "Gwen", 120: "Hecarim", 74: "Heimerdinger", 910: "Hwei",
  420: "Illaoi", 39: "Irelia", 427: "Ivern", 40: "Janna",
  59: "JarvanIV", 24: "Jax", 126: "Jayce", 202: "Jhin",
  222: "Jinx", 897: "KSante", 145: "Kaisa", 429: "Kalista",
  43: "Karma", 30: "Karthus", 38: "Kassadin", 55: "Katarina",
  10: "Kayle", 141: "Kayn", 85: "Kennen", 121: "Khazix",
  203: "Kindred", 240: "Kled", 96: "KogMaw", 7: "Leblanc",
  64: "LeeSin", 89: "Leona", 876: "Lillia", 127: "Lissandra",
  236: "Lucian", 117: "Lulu", 99: "Lux", 54: "Malphite",
  90: "Malzahar", 57: "Maokai", 11: "MasterYi", 800: "Mel",
  902: "Milio", 21: "MissFortune", 62: "MonkeyKing", 82: "Mordekaiser",
  25: "Morgana", 950: "Naafiri", 267: "Nami", 75: "Nasus",
  111: "Nautilus", 518: "Neeko", 76: "Nidalee", 895: "Nilah",
  56: "Nocturne", 20: "Nunu", 2: "Olaf", 61: "Orianna",
  516: "Ornn", 80: "Pantheon", 78: "Poppy", 555: "Pyke",
  246: "Qiyana", 133: "Quinn", 497: "Rakan", 33: "Rammus",
  421: "RekSai", 526: "Rell", 888: "Renata", 58: "Renekton",
  107: "Rengar", 92: "Riven", 68: "Rumble", 13: "Ryze",
  360: "Samira", 113: "Sejuani", 235: "Senna", 147: "Seraphine",
  875: "Sett", 35: "Shaco", 98: "Shen", 102: "Shyvana",
  27: "Singed", 14: "Sion", 15: "Sivir", 72: "Skarner",
  901: "Smolder", 37: "Sona", 16: "Soraka", 50: "Swain",
  517: "Sylas", 134: "Syndra", 223: "TahmKench", 163: "Taliyah",
  91: "Talon", 44: "Taric", 17: "Teemo", 412: "Thresh",
  18: "Tristana", 48: "Trundle", 23: "Tryndamere", 4: "TwistedFate",
  29: "Twitch", 77: "Udyr", 6: "Urgot", 110: "Varus",
  67: "Vayne", 45: "Veigar", 161: "Velkoz", 711: "Vex",
  254: "Vi", 234: "Viego", 112: "Viktor", 8: "Vladimir",
  106: "Volibear", 19: "Warwick", 498: "Xayah", 101: "Xerath",
  5: "XinZhao", 157: "Yasuo", 777: "Yone", 83: "Yorick",
  804: "Yunara", 350: "Yuumi", 904: "Zaahen", 154: "Zac",
  238: "Zed", 221: "Zeri", 115: "Ziggs", 26: "Zilean",
  142: "Zoe", 143: "Zyra",
};
