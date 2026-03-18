import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DraftBoard } from "@/components/draft/draft-board";
import { ScoreDisplay } from "@/components/draft/score-display";
import { SuggestionPanel } from "@/components/draft/suggestion-panel";
import { TeamComfortOverlay } from "@/components/draft/team-comfort-overlay";
import type {
  ChampionSuggestion,
  ComfortEntry,
  DraftBan,
  DraftPhase,
  DraftPick,
  DraftScores,
} from "@/types";

// Mock next/image to render a plain <img> in jsdom
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// ---- ScoreDisplay ----

describe("ScoreDisplay", () => {
  it("renders 4 score cards with values when scores are provided", () => {
    const scores: DraftScores = {
      synergy_score: 72,
      counter_score: 58,
      comfort_scores: [
        { puuid: "p1", champion_id: 1, champion_name: "Annie", comfort_score: 85 },
        { puuid: "p2", champion_id: 86, champion_name: "Garen", comfort_score: 65 },
      ],
      total_score: 66,
    };

    render(<ScoreDisplay scores={scores} loading={false} />);

    expect(screen.getByText("Total")).toBeDefined();
    expect(screen.getByText("Synergy")).toBeDefined();
    expect(screen.getByText("Counter")).toBeDefined();
    expect(screen.getByText("Comfort")).toBeDefined();

    // Check rendered score values
    expect(screen.getByText("66")).toBeDefined(); // total
    expect(screen.getByText("72")).toBeDefined(); // synergy
    expect(screen.getByText("58")).toBeDefined(); // counter
    expect(screen.getByText("75")).toBeDefined(); // avg comfort (85+65)/2
  });

  it("renders zero cards when scores are null", () => {
    render(<ScoreDisplay scores={null} loading={false} />);

    const zeroValues = screen.getAllByText("0");
    expect(zeroValues.length).toBe(4);
  });

  it("renders loading skeletons when loading is true", () => {
    const { container } = render(<ScoreDisplay scores={null} loading={true} />);

    // Should render 4 skeleton cards
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});

// ---- SuggestionPanel ----

describe("SuggestionPanel", () => {
  const suggestions: ChampionSuggestion[] = [
    {
      champion_id: 1,
      champion_name: "Annie",
      composite_score: 82,
      synergy_contribution: 35,
      counter_contribution: 28,
      comfort_contribution: 19,
    },
    {
      champion_id: 86,
      champion_name: "Garen",
      composite_score: 71,
      synergy_contribution: 30,
      counter_contribution: 25,
      comfort_contribution: 16,
    },
  ];

  it("renders ranked suggestions with champion names and scores", () => {
    render(<SuggestionPanel suggestions={suggestions} loading={false} />);

    expect(screen.getByText("Suggested Picks")).toBeDefined();
    expect(screen.getByText("Annie")).toBeDefined();
    expect(screen.getByText("Garen")).toBeDefined();
    expect(screen.getByText("82")).toBeDefined();
    expect(screen.getByText("71")).toBeDefined();
  });

  it("renders score breakdown bars for each suggestion", () => {
    render(<SuggestionPanel suggestions={suggestions} loading={false} />);

    // Each suggestion has Synergy, Counter, Comfort breakdown bars
    const synergyLabels = screen.getAllByText("Synergy");
    const counterLabels = screen.getAllByText("Counter");
    const comfortLabels = screen.getAllByText("Comfort");

    expect(synergyLabels.length).toBe(2);
    expect(counterLabels.length).toBe(2);
    expect(comfortLabels.length).toBe(2);
  });

  it("renders empty state when no suggestions", () => {
    render(<SuggestionPanel suggestions={[]} loading={false} />);

    expect(
      screen.getByText("Pick or ban a champion to see suggestions.")
    ).toBeDefined();
  });

  it("renders loading skeletons when loading", () => {
    const { container } = render(
      <SuggestionPanel suggestions={[]} loading={true} />
    );

    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });
});

// ---- TeamComfortOverlay ----

describe("TeamComfortOverlay", () => {
  const comfortScores: ComfortEntry[] = [
    { puuid: "puuid-abc-1234", champion_id: 1, champion_name: "Annie", comfort_score: 85 },
    { puuid: "puuid-def-5678", champion_id: 86, champion_name: "Garen", comfort_score: 55 },
  ];

  it("renders comfort entries with champion names and scores", () => {
    render(<TeamComfortOverlay comfortScores={comfortScores} />);

    expect(screen.getByText("Team Comfort")).toBeDefined();
    expect(screen.getByText("Annie")).toBeDefined();
    expect(screen.getByText("Garen")).toBeDefined();
    expect(screen.getByText("85")).toBeDefined();
    expect(screen.getByText("55")).toBeDefined();
  });

  it("shows PERFECT FIT badge for scores >= 80", () => {
    render(<TeamComfortOverlay comfortScores={comfortScores} />);

    const badges = screen.getAllByText("PERFECT FIT");
    expect(badges.length).toBe(1); // Only Annie (85) qualifies
  });

  it("renders empty state when no comfort scores", () => {
    render(<TeamComfortOverlay comfortScores={[]} />);

    expect(
      screen.getByText("Comfort scores will appear as picks are made.")
    ).toBeDefined();
  });
});

// ---- DraftBoard ----

describe("DraftBoard", () => {
  const noop = () => {};

  const defaultProps = {
    bluePicks: [] as DraftPick[],
    redPicks: [] as DraftPick[],
    blueBans: [] as DraftBan[],
    redBans: [] as DraftBan[],
    currentPhase: "ban_phase_1" as DraftPhase,
    activeSide: "blue" as const,
    onPick: noop,
    onBan: noop,
    isAddingPick: false,
    isAddingBan: false,
  };

  it("renders pick slots for all 5 roles on each side", () => {
    render(<DraftBoard {...defaultProps} />);

    // Each role label appears twice (blue + red side)
    const roles = ["TOP", "JUNGLE", "MID", "BOT", "SUPPORT"];
    for (const role of roles) {
      const matches = screen.getAllByText(role);
      expect(matches.length).toBe(2);
    }
  });

  it("renders Blue Side and Red Side labels", () => {
    render(<DraftBoard {...defaultProps} />);

    expect(screen.getByText("Blue Side")).toBeDefined();
    expect(screen.getByText("Red Side")).toBeDefined();
  });

  it("renders ban slots (10 empty slots total)", () => {
    const { container } = render(<DraftBoard {...defaultProps} />);

    // Each ban slot shows "--" when empty; 5 blue + 5 red = 10
    const emptySlots = screen.getAllByText("--");
    expect(emptySlots.length).toBe(10);
  });

  it("displays phase badge with current phase", () => {
    render(<DraftBoard {...defaultProps} currentPhase="pick_phase_2" />);

    // Phase badge renders currentPhase with underscores replaced by spaces, uppercased
    expect(screen.getByText("PICK PHASE 2")).toBeDefined();
  });

  it("displays Completed badge when phase is completed", () => {
    render(<DraftBoard {...defaultProps} currentPhase="completed" />);

    expect(screen.getByText("Completed")).toBeDefined();
  });

  it("renders picked champions in their slots", () => {
    const bluePicks: DraftPick[] = [
      { champion_id: 1, champion_name: "Annie", position: 1, role: "MID" },
      { champion_id: 86, champion_name: "Garen", position: 2, role: "TOP" },
    ];

    render(<DraftBoard {...defaultProps} bluePicks={bluePicks} />);

    expect(screen.getByText("Annie")).toBeDefined();
    expect(screen.getByText("Garen")).toBeDefined();
  });

  it("hides action button when draft is completed", () => {
    render(<DraftBoard {...defaultProps} currentPhase="completed" />);

    expect(screen.queryByText(/Pick a Champion/)).toBeNull();
    expect(screen.queryByText(/Ban a Champion/)).toBeNull();
  });

  it("shows ban action button during ban phase", () => {
    render(<DraftBoard {...defaultProps} currentPhase="ban_phase_1" />);

    expect(screen.getByText("Ban a Champion (blue side)")).toBeDefined();
  });

  it("shows pick action button during pick phase", () => {
    render(
      <DraftBoard {...defaultProps} currentPhase="pick_phase_1" />
    );

    expect(screen.getByText("Pick a Champion (blue side)")).toBeDefined();
  });
});
