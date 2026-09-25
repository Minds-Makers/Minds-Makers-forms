import { describe, it, expect } from "vitest";
import { allAnswerKeys, FormSchemaJson, ResponseRow } from "../schema";

// Exercises the same flattening logic export.ts relies on (allAnswerKeys),
// without touching the DOM/Blob APIs that exportCsv/exportXlsx/exportJson need.
const schema: FormSchemaJson = {
  intro: { headline: "Hi", startLabel: "Start" },
  steps: [
    {
      id: "s1",
      title: "S1",
      questions: [
        { id: "name", type: "text", label: "Name", optional: false },
        {
          id: "rate",
          type: "scales",
          label: "Rate",
          low: "Low",
          high: "High",
          items: [
            { id: "r1", label: "Item 1" },
            { id: "r2", label: "Item 2" },
          ],
        },
      ],
    },
  ],
};

const responses: ResponseRow[] = [
  {
    id: "1",
    form_id: "f1",
    form_version: 1,
    answers: { name: "Alice", r1: 4 }, // r2 missing — union-of-keys, empty where missing
    source: "direct",
    duration_sec: 30,
    is_spam: false,
    submitted_at: "2026-01-01T00:00:00Z",
  },
];

describe("answer flattening for export", () => {
  it("produces one column per scale item, not per group", () => {
    const keys = allAnswerKeys(schema).map((k) => k.id);
    expect(keys).toEqual(["name", "r1", "r2"]);
  });

  it("leaves missing keys empty rather than dropping the column", () => {
    const keys = allAnswerKeys(schema).map((k) => k.id);
    const row = responses[0];
    const values = keys.map((k) => row.answers[k] ?? "");
    expect(values).toEqual(["Alice", 4, ""]);
  });
});
