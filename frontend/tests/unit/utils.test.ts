import { describe, it, expect } from "vitest";
import {
  formatKDA,
  formatKDARatio,
  formatCsPerMin,
  formatWinRate,
  formatPercentage,
  formatDuration,
  formatTimeAgo,
  getTierColor,
  getTierBgColor,
  getScoreColor,
  getScoreBarColor,
} from "@/lib/utils";

describe("formatKDA", () => {
  it("formats kills/deaths/assists", () => {
    expect(formatKDA(10, 2, 8)).toBe("10/2/8");
  });

  it("handles zeros", () => {
    expect(formatKDA(0, 0, 0)).toBe("0/0/0");
  });
});

describe("formatKDARatio", () => {
  it("computes ratio with deaths", () => {
    expect(formatKDARatio(10, 2, 8)).toBe("9.00");
  });

  it("handles zero deaths as perfect KDA", () => {
    expect(formatKDARatio(5, 0, 3)).toBe("8.00");
  });

  it("handles all zeros", () => {
    expect(formatKDARatio(0, 0, 0)).toBe("0.00");
  });
});

describe("formatCsPerMin", () => {
  it("computes CS per minute", () => {
    expect(formatCsPerMin(180, 1200)).toBe("9.0");
  });

  it("handles short games", () => {
    expect(formatCsPerMin(60, 600)).toBe("6.0");
  });
});

describe("formatWinRate", () => {
  it("formats as percentage", () => {
    expect(formatWinRate(0.5)).toBe("50.0%");
  });

  it("formats high win rate", () => {
    expect(formatWinRate(0.755)).toBe("75.5%");
  });
});

describe("formatPercentage", () => {
  it("formats as rounded percentage", () => {
    expect(formatPercentage(0.5)).toBe("50%");
    expect(formatPercentage(0.333)).toBe("33%");
  });
});

describe("formatDuration", () => {
  it("formats seconds to mm:ss", () => {
    expect(formatDuration(1800)).toBe("30:00");
  });

  it("pads seconds", () => {
    expect(formatDuration(605)).toBe("10:05");
  });

  it("handles zero", () => {
    expect(formatDuration(0)).toBe("0:00");
  });
});

describe("formatTimeAgo", () => {
  it("returns Today for current date", () => {
    expect(formatTimeAgo(new Date().toISOString())).toBe("Today");
  });

  it("returns Yesterday for 1 day ago", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(formatTimeAgo(yesterday)).toBe("Yesterday");
  });

  it("returns days for recent dates", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(formatTimeAgo(threeDaysAgo)).toBe("3d ago");
  });

  it("returns weeks for older dates", () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    expect(formatTimeAgo(twoWeeksAgo)).toBe("2w ago");
  });
});

describe("getTierColor", () => {
  it("returns gold for S tier", () => {
    expect(getTierColor("S")).toContain("yellow");
  });

  it("returns purple for A tier", () => {
    expect(getTierColor("A")).toContain("purple");
  });

  it("returns blue for B tier", () => {
    expect(getTierColor("B")).toContain("blue");
  });

  it("returns gray for C tier", () => {
    expect(getTierColor("C")).toContain("gray");
  });
});

describe("getTierBgColor", () => {
  it("returns background classes for each tier", () => {
    expect(getTierBgColor("S")).toContain("yellow");
    expect(getTierBgColor("A")).toContain("purple");
    expect(getTierBgColor("B")).toContain("blue");
    expect(getTierBgColor("C")).toContain("gray");
  });
});

describe("getScoreColor", () => {
  it("returns green for high scores", () => {
    expect(getScoreColor(85)).toContain("green");
  });

  it("returns blue for good scores", () => {
    expect(getScoreColor(65)).toContain("blue");
  });

  it("returns yellow for medium scores", () => {
    expect(getScoreColor(45)).toContain("yellow");
  });

  it("returns red for low scores", () => {
    expect(getScoreColor(20)).toContain("red");
  });
});

describe("getScoreBarColor", () => {
  it("returns correct bar colors for score ranges", () => {
    expect(getScoreBarColor(90)).toContain("green");
    expect(getScoreBarColor(70)).toContain("blue");
    expect(getScoreBarColor(50)).toContain("yellow");
    expect(getScoreBarColor(10)).toContain("red");
  });
});
