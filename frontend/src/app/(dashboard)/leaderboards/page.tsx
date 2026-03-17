"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LeaderboardsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Leaderboards</h1>
        <p className="mt-1 text-sm text-slate-400">
          Top players ranked by True Mastery scores
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-12">
            <svg
              className="h-12 w-12 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-sm text-slate-500">
              Leaderboards are coming soon.
            </p>
            <p className="text-xs text-slate-600">
              Track top Clash players once enough match data has been ingested.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
