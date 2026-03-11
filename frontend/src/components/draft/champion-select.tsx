"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { cn, getChampionIconUrl } from "@/lib/utils";

interface ChampionSelectProps {
  unavailableIds: number[];
  onSelect: (championId: number) => void;
  onClose: () => void;
  mode: "pick" | "ban";
}

// Static champion data for the select grid. In production this would come from
// DDragon / an API endpoint. This is a representative subset for the UI.
const CHAMPION_LIST = [
  { id: 266, name: "Aatrox", roles: ["TOP"] },
  { id: 103, name: "Ahri", roles: ["MID"] },
  { id: 84, name: "Akali", roles: ["MID", "TOP"] },
  { id: 166, name: "Akshan", roles: ["MID"] },
  { id: 12, name: "Alistar", roles: ["SUPPORT"] },
  { id: 32, name: "Amumu", roles: ["JUNGLE", "SUPPORT"] },
  { id: 34, name: "Anivia", roles: ["MID"] },
  { id: 1, name: "Annie", roles: ["MID", "SUPPORT"] },
  { id: 523, name: "Aphelios", roles: ["BOT"] },
  { id: 22, name: "Ashe", roles: ["BOT", "SUPPORT"] },
  { id: 136, name: "AurelionSol", roles: ["MID"] },
  { id: 268, name: "Azir", roles: ["MID"] },
  { id: 432, name: "Bard", roles: ["SUPPORT"] },
  { id: 200, name: "BelVeth", roles: ["JUNGLE"] },
  { id: 53, name: "Blitzcrank", roles: ["SUPPORT"] },
  { id: 63, name: "Brand", roles: ["SUPPORT", "MID"] },
  { id: 201, name: "Braum", roles: ["SUPPORT"] },
  { id: 233, name: "Briar", roles: ["JUNGLE"] },
  { id: 51, name: "Caitlyn", roles: ["BOT"] },
  { id: 164, name: "Camille", roles: ["TOP"] },
  { id: 69, name: "Cassiopeia", roles: ["MID"] },
  { id: 31, name: "Chogath", roles: ["TOP"] },
  { id: 42, name: "Corki", roles: ["MID"] },
  { id: 122, name: "Darius", roles: ["TOP"] },
  { id: 131, name: "Diana", roles: ["JUNGLE", "MID"] },
  { id: 119, name: "Draven", roles: ["BOT"] },
  { id: 36, name: "DrMundo", roles: ["TOP", "JUNGLE"] },
  { id: 245, name: "Ekko", roles: ["JUNGLE", "MID"] },
  { id: 60, name: "Elise", roles: ["JUNGLE"] },
  { id: 28, name: "Evelynn", roles: ["JUNGLE"] },
  { id: 81, name: "Ezreal", roles: ["BOT"] },
  { id: 9, name: "Fiddlesticks", roles: ["JUNGLE", "SUPPORT"] },
  { id: 114, name: "Fiora", roles: ["TOP"] },
  { id: 105, name: "Fizz", roles: ["MID"] },
  { id: 3, name: "Galio", roles: ["MID", "SUPPORT"] },
  { id: 41, name: "Gangplank", roles: ["TOP"] },
  { id: 86, name: "Garen", roles: ["TOP"] },
  { id: 150, name: "Gnar", roles: ["TOP"] },
  { id: 79, name: "Gragas", roles: ["JUNGLE", "TOP"] },
  { id: 104, name: "Graves", roles: ["JUNGLE"] },
  { id: 887, name: "Gwen", roles: ["TOP"] },
  { id: 120, name: "Hecarim", roles: ["JUNGLE"] },
  { id: 74, name: "Heimerdinger", roles: ["MID", "SUPPORT"] },
  { id: 420, name: "Illaoi", roles: ["TOP"] },
  { id: 39, name: "Irelia", roles: ["TOP", "MID"] },
  { id: 427, name: "Ivern", roles: ["JUNGLE"] },
  { id: 40, name: "Janna", roles: ["SUPPORT"] },
  { id: 59, name: "JarvanIV", roles: ["JUNGLE"] },
  { id: 24, name: "Jax", roles: ["TOP", "JUNGLE"] },
  { id: 126, name: "Jayce", roles: ["TOP", "MID"] },
  { id: 202, name: "Jhin", roles: ["BOT"] },
  { id: 222, name: "Jinx", roles: ["BOT"] },
  { id: 145, name: "Kaisa", roles: ["BOT"] },
  { id: 429, name: "Kalista", roles: ["BOT"] },
  { id: 43, name: "Karma", roles: ["SUPPORT"] },
  { id: 30, name: "Karthus", roles: ["JUNGLE"] },
  { id: 38, name: "Kassadin", roles: ["MID"] },
  { id: 55, name: "Katarina", roles: ["MID"] },
  { id: 10, name: "Kayle", roles: ["TOP"] },
  { id: 141, name: "Kayn", roles: ["JUNGLE"] },
  { id: 85, name: "Kennen", roles: ["TOP"] },
  { id: 121, name: "Khazix", roles: ["JUNGLE"] },
  { id: 203, name: "Kindred", roles: ["JUNGLE"] },
  { id: 240, name: "Kled", roles: ["TOP"] },
  { id: 96, name: "KogMaw", roles: ["BOT"] },
  { id: 897, name: "KSante", roles: ["TOP"] },
  { id: 7, name: "Leblanc", roles: ["MID"] },
  { id: 64, name: "LeeSin", roles: ["JUNGLE"] },
  { id: 89, name: "Leona", roles: ["SUPPORT"] },
  { id: 876, name: "Lillia", roles: ["JUNGLE"] },
  { id: 127, name: "Lissandra", roles: ["MID"] },
  { id: 236, name: "Lucian", roles: ["BOT", "MID"] },
  { id: 117, name: "Lulu", roles: ["SUPPORT"] },
  { id: 99, name: "Lux", roles: ["SUPPORT", "MID"] },
  { id: 54, name: "Malphite", roles: ["TOP", "SUPPORT"] },
  { id: 90, name: "Malzahar", roles: ["MID"] },
  { id: 57, name: "Maokai", roles: ["SUPPORT", "JUNGLE"] },
  { id: 11, name: "MasterYi", roles: ["JUNGLE"] },
  { id: 21, name: "MissFortune", roles: ["BOT"] },
  { id: 62, name: "MonkeyKing", roles: ["JUNGLE", "TOP"] },
  { id: 82, name: "Mordekaiser", roles: ["TOP"] },
  { id: 25, name: "Morgana", roles: ["SUPPORT"] },
  { id: 267, name: "Nami", roles: ["SUPPORT"] },
  { id: 75, name: "Nasus", roles: ["TOP"] },
  { id: 111, name: "Nautilus", roles: ["SUPPORT"] },
  { id: 518, name: "Neeko", roles: ["MID", "SUPPORT"] },
  { id: 76, name: "Nidalee", roles: ["JUNGLE"] },
  { id: 56, name: "Nocturne", roles: ["JUNGLE"] },
  { id: 20, name: "Nunu", roles: ["JUNGLE"] },
  { id: 2, name: "Olaf", roles: ["TOP", "JUNGLE"] },
  { id: 61, name: "Orianna", roles: ["MID"] },
  { id: 516, name: "Ornn", roles: ["TOP"] },
  { id: 80, name: "Pantheon", roles: ["SUPPORT", "TOP"] },
  { id: 78, name: "Poppy", roles: ["JUNGLE", "TOP"] },
  { id: 555, name: "Pyke", roles: ["SUPPORT"] },
  { id: 246, name: "Qiyana", roles: ["MID", "JUNGLE"] },
  { id: 133, name: "Quinn", roles: ["TOP"] },
  { id: 497, name: "Rakan", roles: ["SUPPORT"] },
  { id: 33, name: "Rammus", roles: ["JUNGLE"] },
  { id: 421, name: "RekSai", roles: ["JUNGLE"] },
  { id: 526, name: "Rell", roles: ["SUPPORT"] },
  { id: 888, name: "Renata", roles: ["SUPPORT"] },
  { id: 58, name: "Renekton", roles: ["TOP"] },
  { id: 107, name: "Rengar", roles: ["JUNGLE", "TOP"] },
  { id: 92, name: "Riven", roles: ["TOP"] },
  { id: 68, name: "Rumble", roles: ["TOP", "MID"] },
  { id: 13, name: "Ryze", roles: ["MID"] },
  { id: 360, name: "Samira", roles: ["BOT"] },
  { id: 113, name: "Sejuani", roles: ["JUNGLE"] },
  { id: 235, name: "Senna", roles: ["SUPPORT", "BOT"] },
  { id: 147, name: "Seraphine", roles: ["SUPPORT", "MID"] },
  { id: 875, name: "Sett", roles: ["TOP", "SUPPORT"] },
  { id: 35, name: "Shaco", roles: ["JUNGLE"] },
  { id: 98, name: "Shen", roles: ["TOP", "SUPPORT"] },
  { id: 102, name: "Shyvana", roles: ["JUNGLE"] },
  { id: 27, name: "Singed", roles: ["TOP"] },
  { id: 14, name: "Sion", roles: ["TOP"] },
  { id: 15, name: "Sivir", roles: ["BOT"] },
  { id: 72, name: "Skarner", roles: ["JUNGLE"] },
  { id: 37, name: "Sona", roles: ["SUPPORT"] },
  { id: 16, name: "Soraka", roles: ["SUPPORT"] },
  { id: 50, name: "Swain", roles: ["SUPPORT", "MID"] },
  { id: 517, name: "Sylas", roles: ["MID"] },
  { id: 134, name: "Syndra", roles: ["MID"] },
  { id: 223, name: "TahmKench", roles: ["SUPPORT", "TOP"] },
  { id: 163, name: "Taliyah", roles: ["JUNGLE", "MID"] },
  { id: 91, name: "Talon", roles: ["MID", "JUNGLE"] },
  { id: 44, name: "Taric", roles: ["SUPPORT"] },
  { id: 17, name: "Teemo", roles: ["TOP"] },
  { id: 412, name: "Thresh", roles: ["SUPPORT"] },
  { id: 18, name: "Tristana", roles: ["BOT", "MID"] },
  { id: 48, name: "Trundle", roles: ["JUNGLE", "TOP"] },
  { id: 23, name: "Tryndamere", roles: ["TOP"] },
  { id: 4, name: "TwistedFate", roles: ["MID"] },
  { id: 29, name: "Twitch", roles: ["BOT"] },
  { id: 77, name: "Udyr", roles: ["JUNGLE"] },
  { id: 6, name: "Urgot", roles: ["TOP"] },
  { id: 110, name: "Varus", roles: ["BOT"] },
  { id: 67, name: "Vayne", roles: ["BOT", "TOP"] },
  { id: 45, name: "Veigar", roles: ["MID"] },
  { id: 161, name: "VelKoz", roles: ["SUPPORT", "MID"] },
  { id: 711, name: "Vex", roles: ["MID"] },
  { id: 254, name: "Vi", roles: ["JUNGLE"] },
  { id: 234, name: "Viego", roles: ["JUNGLE"] },
  { id: 112, name: "Viktor", roles: ["MID"] },
  { id: 8, name: "Vladimir", roles: ["MID", "TOP"] },
  { id: 106, name: "Volibear", roles: ["TOP", "JUNGLE"] },
  { id: 19, name: "Warwick", roles: ["JUNGLE", "TOP"] },
  { id: 498, name: "Xayah", roles: ["BOT"] },
  { id: 101, name: "Xerath", roles: ["SUPPORT", "MID"] },
  { id: 5, name: "XinZhao", roles: ["JUNGLE"] },
  { id: 157, name: "Yasuo", roles: ["MID", "BOT"] },
  { id: 777, name: "Yone", roles: ["MID", "TOP"] },
  { id: 83, name: "Yorick", roles: ["TOP"] },
  { id: 350, name: "Yuumi", roles: ["SUPPORT"] },
  { id: 154, name: "Zac", roles: ["JUNGLE"] },
  { id: 238, name: "Zed", roles: ["MID"] },
  { id: 221, name: "Zeri", roles: ["BOT"] },
  { id: 115, name: "Ziggs", roles: ["MID", "BOT"] },
  { id: 26, name: "Zilean", roles: ["SUPPORT"] },
  { id: 142, name: "Zoe", roles: ["MID"] },
  { id: 143, name: "Zyra", roles: ["SUPPORT"] },
];

const ROLE_FILTERS = ["ALL", "TOP", "JUNGLE", "MID", "BOT", "SUPPORT"] as const;

export function ChampionSelect({
  unavailableIds,
  onSelect,
  onClose,
  mode,
}: ChampionSelectProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>("ALL");

  const filteredChampions = useMemo(() => {
    return CHAMPION_LIST.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (roleFilter !== "ALL" && !c.roles.includes(roleFilter)) {
        return false;
      }
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [search, roleFilter]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            {mode === "ban" ? "Ban Champion" : "Pick Champion"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="border-b border-slate-800 px-6 py-3">
          <input
            type="text"
            placeholder="Search champions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            autoFocus
          />
          <div className="mt-2 flex gap-1">
            {ROLE_FILTERS.map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  roleFilter === role
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                {role === "ALL"
                  ? "All"
                  : role.charAt(0) + role.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid max-h-[400px] grid-cols-5 gap-2 overflow-y-auto p-4 sm:grid-cols-7 md:grid-cols-8">
          {filteredChampions.map((champ) => {
            const isUnavailable = unavailableIds.includes(champ.id);
            return (
              <button
                key={champ.id}
                onClick={() => !isUnavailable && onSelect(champ.id)}
                disabled={isUnavailable}
                className={cn(
                  "group flex flex-col items-center gap-1 rounded-lg p-1.5 transition-all",
                  isUnavailable
                    ? "cursor-not-allowed opacity-30"
                    : "cursor-pointer hover:bg-slate-800"
                )}
                title={champ.name}
              >
                <Image
                  src={getChampionIconUrl(champ.name)}
                  alt={champ.name}
                  width={40}
                  height={40}
                  className={cn(
                    "rounded-lg",
                    isUnavailable && "grayscale"
                  )}
                  unoptimized
                />
                <span className="w-full truncate text-center text-[10px] text-slate-400 group-hover:text-white">
                  {champ.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
