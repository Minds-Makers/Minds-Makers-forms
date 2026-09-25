import { describe, it, expect } from "vitest";
import { aggregateScales, countChoiceAnswers, completionRate, averageDurationSec } from "../aggregate";
import { Question, ResponseRow } from "@/lib/schema";

function response(answers: Record<string, unknown>): ResponseRow {
  return {
    id: Math.random().toString(),
    form_id: "f1",
    form_version: 1,
    answers,
    source: "direct",
    duration_sec: 60,
    is_spam: false,
    submitted_at: "2026-01-01T00:00:00Z",
  };
}

describe("countChoiceAnswers", () => {
  const q: Question = { id: "color", type: "single", label: "Color", optional: false, options: ["Red", "Blue"] };

  it("counts and computes percentages", () => {
    const rows = [response({ color: "Red" }), response({ color: "Red" }), response({ color: "Blue" })];
    const result = countChoiceAnswers(q, rows);
    expect(result[0]).toEqual({ label: "Red", count: 2, pct: 67 });
    expect(result[1]).toEqual({ label: "Blue", count: 1, pct: 33 });
  });

  it("handles multi-select arrays", () => {
    const multi: Question = { id: "tools", type: "multi", label: "Tools", optional: false, options: ["A", "B"] };
    const rows = [response({ tools: ["A", "B"] }), response({ tools: ["A"] })];
    const result = countChoiceAnswers(multi, rows);
    expect(result.find((r) => r.label === "A")?.count).toBe(2);
    expect(result.find((r) => r.label === "B")?.count).toBe(1);
  });
});

describe("aggregateScales", () => {
  const q: Question = {
    id: "value_scale",
    type: "scales",
    label: "Value",
    low: "Low",
    high: "High",
    optional: false,
    items: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ],
  };

  it("computes mean and sorts descending, with a 1-5 distribution", () => {
    const rows = [response({ a: 5, b: 2 }), response({ a: 3, b: 2 })];
    const result = aggregateScales(q as Extract<Question, { type: "scales" }>, rows);
    expect(result[0].label).toBe("A"); // mean 4 > mean 2
    expect(result[0].mean).toBe(4);
    expect(result[1].mean).toBe(2);
    expect(result[1].distribution[1]).toBe(2); // both b answers were "2"
  });
});

describe("completionRate", () => {
  it("returns 0 when there are no views", () => {
    expect(completionRate(0, 5)).toBe(0);
  });
  it("rounds to the nearest percent", () => {
    expect(completionRate(3, 1)).toBe(33);
  });
});

describe("averageDurationSec", () => {
  it("averages only rows with a duration", () => {
    const rows = [response({}), response({})];
    rows[0].duration_sec = 10;
    rows[1].duration_sec = 20;
    expect(averageDurationSec(rows)).toBe(15);
  });
});
