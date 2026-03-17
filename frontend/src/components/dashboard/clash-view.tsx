"use client";

import { useState } from "react";
import { useClashDashboard } from "@/lib/hooks/use-clash-dashboard";
import { TeamPanel } from "./team-panel";
import { WinProbability } from "./win-probability";
import { RecommendationRow } from "./recommendation-row";
import { BanPriority } from "./ban-priority";
import { TeamRadarChart } from "@/components/charts/team-radar-chart";
import type { TeamRole } from "@/types";

const ROLES: TeamRole[] = ["TOP", "JUNGLE", "MID", "BOT", "SUPPORT"];

export function ClashView() {
  const {
    yourTeam,
    opponentTeam,
    addPlayer,
    removePlayer,
    draft,
    radarData,
    winProbability,
    banTargets,
  } = useClashDashboard();

  const [addingRole, setAddingRole] = useState<{ side: "your" | "opponent"; role: TeamRole } | null>(null);
  const [nameInput, setNameInput] = useState("");

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingRole || !nameInput.trim()) return;

    const parts = nameInput.trim().split("#");
    const gameName = parts[0] || nameInput.trim();
    const tagLine = parts[1] || "NA1";

    addPlayer(addingRole.side, addingRole.role, {
      puuid: `placeholder-${addingRole.role}-${Date.now()}`,
      game_name: gameName,
      tag_line: tagLine,
      role: addingRole.role,
      alt_accounts: [],
      top_champions: [],
    });

    setNameInput("");
    setAddingRole(null);
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="flex justify-center">
        <div className="flex w-full max-w-lg items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2">
          <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search Team, Player, or Clash ID"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Your Team vs Opponent Team */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_auto_1fr]">
        {/* Your Team */}
        <TeamPanel players={[...yourTeam]} side="your" label="Your Team" />

        {/* Center — Versus + Radar + Win Prob */}
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold uppercase tracking-widest text-slate-400">
            Versus
          </h2>
          <TeamRadarChart data={radarData} />
          <WinProbability probability={winProbability} />
        </div>

        {/* Opponent Team */}
        <TeamPanel players={[...opponentTeam]} side="opponent" label="Opponent Team" />
      </div>

      {/* Add player popover */}
      {addingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <form
            onSubmit={handleAddPlayer}
            className="w-80 space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          >
            <p className="text-sm font-medium text-white">
              Add {addingRole.side === "your" ? "your" : "opponent"}{" "}
              {addingRole.role} player
            </p>
            <input
              type="text"
              placeholder="GameName#TAG"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-teal-600 py-2 text-sm font-medium text-white hover:bg-teal-500"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setAddingRole(null); setNameInput(""); }}
                className="flex-1 rounded-lg border border-slate-700 py-2 text-sm text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick-add buttons for empty slots */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Add Your Players
          </p>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role, idx) =>
              !yourTeam[idx] ? (
                <button
                  key={role}
                  onClick={() => setAddingRole({ side: "your", role })}
                  className="rounded-md border border-dashed border-teal-500/40 px-3 py-1.5 text-xs text-teal-400 transition-colors hover:border-teal-400 hover:bg-teal-500/10"
                >
                  + {role}
                </button>
              ) : (
                <button
                  key={role}
                  onClick={() => removePlayer("your", role)}
                  className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:border-red-500/40 hover:text-red-400"
                >
                  {yourTeam[idx]!.game_name} &times;
                </button>
              )
            )}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Add Opponent Players
          </p>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role, idx) =>
              !opponentTeam[idx] ? (
                <button
                  key={role}
                  onClick={() => setAddingRole({ side: "opponent", role })}
                  className="rounded-md border border-dashed border-red-500/40 px-3 py-1.5 text-xs text-red-400 transition-colors hover:border-red-400 hover:bg-red-500/10"
                >
                  + {role}
                </button>
              ) : (
                <button
                  key={role}
                  onClick={() => removePlayer("opponent", role)}
                  className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:border-red-500/40 hover:text-red-400"
                >
                  {opponentTeam[idx]!.game_name} &times;
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Draft Assistant Engine */}
      <div className="space-y-3">
        <div className="flex items-baseline gap-3">
          <h3 className="text-lg font-bold uppercase tracking-wide text-white">
            Draft Assistant Engine
          </h3>
          <span className="text-xs font-medium uppercase tracking-wider text-teal-400">
            Live Synergy/Counter Picks
          </span>
        </div>
        <p className="text-xs uppercase tracking-wider text-slate-500">
          Recommended Champions of Next Pick
        </p>
        <RecommendationRow
          suggestions={draft.suggestions}
          loading={draft.suggestionsLoading}
        />
      </div>

      {/* Ban Priority */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">
          Ban Priority{" "}
          <span className="font-normal text-slate-500">
            Based on Opponent Champion Pools
          </span>
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <BanPriority
            bans={banTargets.slice(0, 10)}
            label="Ban Priority"
          />
          <BanPriority
            bans={banTargets.slice(10, 20)}
            label="Ban Priority"
          />
        </div>
      </div>
    </div>
  );
}
