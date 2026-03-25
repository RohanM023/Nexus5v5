import type { Metadata } from "next";

interface SummonerLayoutProps {
  children: React.ReactNode;
  params: Promise<{ region: string; gameName: string; tagLine: string }>;
}

export async function generateMetadata({ params }: SummonerLayoutProps): Promise<Metadata> {
  const { region, gameName, tagLine } = await params;
  const decodedName = decodeURIComponent(gameName);
  const decodedTag = decodeURIComponent(tagLine);

  const title = `${decodedName}#${decodedTag} — Nexus 5v5`;
  const description = `View stats, champion pool, and match history for ${decodedName}#${decodedTag} on ${region.toUpperCase()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
    },
  };
}

export default function SummonerLayout({ children }: SummonerLayoutProps) {
  return children;
}
