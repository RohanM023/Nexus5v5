"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChampionSelect } from "./champion-select";
import { cn, getChampionIconUrl } from "@/lib/utils";
import type { DraftBan, DraftPhase, DraftPick } from "@/types";

interface DraftBoardProps {
  bluePicks: DraftPick[];
  redPicks: DraftPick[];
  blueBans: DraftBan[];
  redBans: DraftBan[];
  currentPhase: DraftPhase;
  activeSide: "blue" | "red";
  onPick: (championId: number, role: string) => void;
  onBan: (championId: number) => void;
  isAddingPick: boolean;
  isAddingBan: boolean;
}

const ROLES = ["TOP", "JUNGLE", "MID", "BOT", "SUPPORT"];

export function DraftBoard({
  bluePicks,
  redPicks,
  blueBans,
  redBans,
  currentPhase,
  activeSide,
  onPick,
  onBan,
  isAddingPick,
  isAddingBan,
}: DraftBoardProps) {
  const [showChampionSelect, setShowChampionSelect] = useState(false);
  const [selectingRole, setSelectingRole] = useState<string>("MID");

  const isBanPhase =
    currentPhase === "ban_phase_1" || currentPhase === "ban_phase_2";
  const isCompleted = currentPhase === "completed";

  const allPickedIds = [
    ...bluePicks.map((p) => p.champion_id),
    ...redPicks.map((p) => p.champion_id),
  ];
  const allBannedIds = [
    ...blueBans.map((b) => b.champion_id),
    ...redBans.map((b) => b.champion_id),
  ];
  const unavailableIds = [...allPickedIds, ...allBannedIds];

  const handleOpenSelect = (role?: string) => {
    if (role) setSelectingRole(role);
    setShowChampionSelect(true);
  };

  const handleChampionSelected = (championId: number) => {
    setShowChampionSelect(false);
    if (isBanPhase) {
      onBan(championId);
    } else {
      onPick(championId, selectingRole);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Draft Board</CardTitle>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                isCompleted
                  ? "bg-green-500/20 text-green-400"
                  : "bg-blue-500/20 text-blue-400"
              )}
            >
              {isCompleted
                ? "Completed"
                : currentPhase.replace(/_/g, " ").toUpperCase()}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ban section */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              Bans
            </p>
            <div className="grid grid-cols-2 gap-4">
              <BanRow bans={blueBans} side="blue" maxBans={5} />
              <BanRow bans={redBans} side="red" maxBans={5} />
            </div>
          </div>

          {/* Pick section */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="mb-3 text-center text-sm font-semibold text-blue-400">
                Blue Side
              </p>
              <div className="space-y-2">
                {ROLES.map((role, idx) => {
                  const pick = bluePicks[idx];
                  return (
                    <PickSlot
                      key={role}
                      pick={pick}
                      role={role}
                      side="blue"
                      isActive={
                        !isCompleted &&
                        !isBanPhase &&
                        activeSide === "blue" &&
                        !pick
                      }
                      onClick={() => handleOpenSelect(role)}
                    />
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-3 text-center text-sm font-semibold text-red-400">
                Red Side
              </p>
              <div className="space-y-2">
                {ROLES.map((role, idx) => {
                  const pick = redPicks[idx];
                  return (
                    <PickSlot
                      key={role}
                      pick={pick}
                      role={role}
                      side="red"
                      isActive={
                        !isCompleted &&
                        !isBanPhase &&
                        activeSide === "red" &&
                        !pick
                      }
                      onClick={() => handleOpenSelect(role)}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action button */}
          {!isCompleted && (
            <div className="flex justify-center">
              <button
                onClick={() => handleOpenSelect()}
                disabled={isAddingPick || isAddingBan}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {isAddingPick || isAddingBan
                  ? "Processing..."
                  : isBanPhase
                    ? `Ban a Champion (${activeSide} side)`
                    : `Pick a Champion (${activeSide} side)`}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {showChampionSelect && (
        <ChampionSelect
          unavailableIds={unavailableIds}
          onSelect={handleChampionSelected}
          onClose={() => setShowChampionSelect(false)}
          mode={isBanPhase ? "ban" : "pick"}
        />
      )}
    </>
  );
}

function BanRow({
  bans,
  side,
  maxBans,
}: {
  bans: DraftBan[];
  side: "blue" | "red";
  maxBans: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: maxBans }).map((_, idx) => {
        const ban = bans[idx];
        return (
          <div
            key={idx}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg border",
              ban
                ? "border-slate-700 bg-slate-800"
                : side === "blue"
                  ? "border-blue-500/20 bg-blue-500/5"
                  : "border-red-500/20 bg-red-500/5"
            )}
          >
            {ban ? (
              <Image
                src={getChampionIconUrl(ban.champion_name)}
                alt={ban.champion_name}
                width={32}
                height={32}
                className="rounded opacity-50 grayscale"
                unoptimized
              />
            ) : (
              <span className="text-xs text-slate-600">--</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PickSlot({
  pick,
  role,
  side,
  isActive,
  onClick,
}: {
  pick?: DraftPick;
  role: string;
  side: "blue" | "red";
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!isActive}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border p-3 transition-all",
        pick
          ? "border-slate-700 bg-slate-800/50"
          : isActive
            ? side === "blue"
              ? "border-blue-500/40 bg-blue-500/10 hover:border-blue-400 cursor-pointer"
              : "border-red-500/40 bg-red-500/10 hover:border-red-400 cursor-pointer"
            : "border-slate-800 bg-slate-900/30 cursor-default"
      )}
    >
      {pick ? (
        <Image
          src={getChampionIconUrl(pick.champion_name)}
          alt={pick.champion_name}
          width={36}
          height={36}
          className="rounded-lg"
          unoptimized
        />
      ) : (
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            isActive ? "bg-slate-700/50" : "bg-slate-800/50"
          )}
        >
          <span className="text-xs text-slate-600">?</span>
        </div>
      )}
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-white">
          {pick ? pick.champion_name : "Empty"}
        </p>
        <p className="text-xs text-slate-500">{role}</p>
      </div>
      {isActive && (
        <span className="text-xs text-blue-400">Select</span>
      )}
    </button>
  );
}
