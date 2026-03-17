"use client";

import Link from "next/link";

export function SoloQueueView() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <p className="text-lg font-medium text-white">Solo Queue Lookup</p>
      <p className="max-w-md text-center text-sm text-slate-400">
        Search for any summoner to view their ranked stats, champion pool, and
        match history.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-500"
      >
        Go to Search
      </Link>
    </div>
  );
}
