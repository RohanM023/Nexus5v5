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
                "font-mono text-[9px] tracking-[0.2em] uppercase",
                isCompleted
                  ? "text-[var(--color-success)]"
                  : "text-[var(--color-accent-text)]"
              )}
            >
              {isCompleted
                ? "Complete"
                : currentPhase.replace(/_/g, " ")}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ban section */}
          <div>
            <p className="mb-2 font-mono text-[8px] tracking-[0.3em] uppercase text-[var(--color-text-muted)]">
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
              <p className="mb-3 text-center font-mono text-[9px] tracking-[0.2em] uppercase text-[var(--color-team-blue)]">
                Blue Side
              </p>
              <div className="space-y-1.5">
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
              <p className="mb-3 text-center font-mono text-[9px] tracking-[0.2em] uppercase text-[var(--color-team-red)]">
                Red Side
              </p>
              <div className="space-y-1.5">
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
            <div className="flex justify-center pt-2">
              <button
                onClick={() => handleOpenSelect()}
                disabled={isAddingPick || isAddingBan}
                className="bg-[var(--color-accent-bg)] px-6 py-2 font-mono text-xs font-medium tracking-wider uppercase text-black transition-colors hover:bg-[var(--color-accent-bg-hover)] disabled:opacity-40"
              >
                {isAddingPick || isAddingBan
                  ? "Processing..."
                  : isBanPhase
                    ? `Ban — ${activeSide}`
                    : `Pick — ${activeSide}`}
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
    <div className="flex items-center gap-1.5">
      {Array.from({ length: maxBans }).map((_, idx) => {
        const ban = bans[idx];
        return (
          <div
            key={idx}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-sm",
              ban
                ? "bg-[var(--color-surface)]"
                : side === "blue"
                  ? "bg-[var(--color-team-blue-bg)]"
                  : "bg-[var(--color-team-red-bg)]"
            )}
          >
            {ban ? (
              <Image
                src={getChampionIconUrl(ban.champion_name)}
                alt={ban.champion_name}
                width={32}
                height={32}
                className="rounded-sm opacity-40 grayscale"
                unoptimized
              />
            ) : (
              <span className="font-mono text-[8px] text-[var(--color-text-muted)]">—</span>
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
        "flex w-full items-center gap-3 rounded-sm px-3 py-2.5 transition-all",
        pick
          ? "bg-[var(--color-surface)]"
          : isActive
            ? side === "blue"
              ? "bg-[var(--color-team-blue-bg)] hover:brightness-150 cursor-pointer"
              : "bg-[var(--color-team-red-bg)] hover:brightness-150 cursor-pointer"
            : "bg-transparent cursor-default"
      )}
    >
      {pick ? (
        <Image
          src={getChampionIconUrl(pick.champion_name)}
          alt={pick.champion_name}
          width={32}
          height={32}
          className="rounded-sm"
          unoptimized
        />
      ) : (
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-sm",
            isActive ? "bg-[var(--color-surface-hover)]" : "bg-[var(--color-surface)]"
          )}
        >
          <span className="font-mono text-[8px] text-[var(--color-text-muted)]">?</span>
        </div>
      )}
      <div className="flex-1 text-left">
        <p className="text-xs font-medium text-[var(--color-text-primary)]">
          {pick ? pick.champion_name : "—"}
        </p>
        <p className="font-mono text-[8px] tracking-wider text-[var(--color-text-muted)]">{role}</p>
      </div>
      {isActive && (
        <span className="font-mono text-[8px] tracking-wider text-[var(--color-accent-text)]">Select</span>
      )}
    </button>
  );
}
