"use client";

const INVITE_URL =
  "https://discord.com/oauth2/authorize?client_id=1488503548650979419&scope=bot+applications.commands&permissions=309237730304";

const COMMANDS = [
  {
    name: "/lookup",
    args: "<region> <name> <tag>",
    description: "Summoner profile with ranked data",
  },
  {
    name: "/stats",
    args: "<region> <name> <tag>",
    description: "Performance stats — KDA, win rate, top champions",
  },
  {
    name: "/champions",
    args: "<region> <name> <tag>",
    description: "Champion pool with True Mastery & Comfort scores",
  },
  {
    name: "/history",
    args: "<region> <name> <tag>",
    description: "Paginated match history with detail drill-down",
  },
  {
    name: "/draft start",
    args: "",
    description: "Start a live draft session in a Discord thread",
  },
  {
    name: "/draft pick",
    args: "<champion> <side>",
    description: "Register a pick — updates scores & suggestions live",
  },
  {
    name: "/draft ban",
    args: "<champion> <side>",
    description: "Register a ban",
  },
  {
    name: "/scout",
    args: "<p1> <p2> ... <p5>",
    description: "Team scouting report for up to 5 players",
  },
];

export default function DiscordPage() {
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-16">
      <div className="w-full max-w-[560px] animate-fade-in">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#5865F2]/10">
            <svg
              className="h-7 w-7 text-[#5865F2]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
          </div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Lynkr Discord Bot
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
            Bring Lynkr analytics directly into your Discord server —
            summoner lookups, draft sessions, scouting reports, and more.
          </p>
        </div>

        {/* Invite Button */}
        <div className="mb-12 text-center">
          <a
            href={INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#5865F2] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4752C4]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add to Server
          </a>
        </div>

        {/* Commands */}
        <div>
          <h2 className="mb-4 font-mono text-[10px] font-medium tracking-[0.3em] uppercase text-[var(--color-text-muted)]">
            Slash Commands
          </h2>
          <div className="space-y-px overflow-hidden rounded-lg border border-[var(--color-border)]">
            {COMMANDS.map((cmd) => (
              <div
                key={cmd.name + cmd.args}
                className="flex items-baseline justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <code className="text-xs font-semibold text-[var(--color-accent-text)]">
                    {cmd.name}
                  </code>
                  {cmd.args && (
                    <span className="ml-1.5 text-[10px] text-[var(--color-text-muted)]">
                      {cmd.args}
                    </span>
                  )}
                </div>
                <p className="shrink-0 text-right text-[10px] text-[var(--color-text-muted)]">
                  {cmd.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Permissions note */}
        <p className="mt-6 text-center text-[9px] leading-relaxed text-[var(--color-text-muted)]">
          The bot requires Send Messages, Embed Links, Create Threads, and
          Slash Commands permissions. No message content is read.
        </p>
      </div>
    </div>
  );
}
