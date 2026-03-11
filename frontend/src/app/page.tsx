import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0e1a]">
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
              N
            </div>
            <span className="text-lg font-bold text-white">Nexus 5v5</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-500"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <div className="mb-6 inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400">
          AI-Powered Draft Intelligence
        </div>
        <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
          Dominate Clash with{" "}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Smarter Drafts
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
          Aggregate your accounts, analyze your champion pool, and get real-time
          synergy and counter scoring during champion select.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-3 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-500"
          >
            Start Free
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-8 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-24 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
          <FeatureCard
            title="Identity Aggregation"
            description="Link all your Riot accounts into one Master Profile with unified stats."
          />
          <FeatureCard
            title="Draft Intelligence"
            description="Real-time synergy, counter, and comfort scoring during champion select."
          />
          <FeatureCard
            title="True Mastery"
            description="Go beyond Mastery Points with data-driven champion proficiency scores."
          />
        </div>
      </main>

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-600">
        Nexus 5v5 &middot; Not endorsed by Riot Games
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-left backdrop-blur-sm">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        {description}
      </p>
    </div>
  );
}
