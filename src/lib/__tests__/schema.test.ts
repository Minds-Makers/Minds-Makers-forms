import { describe, it, expect } from "vitest";
import { formSchemaSchema, isQuestionVisible, allAnswerKeys } from "../schema";
import { compileStudentSurveySchema } from "../seedTemplate";

describe("formSchemaSchema", () => {
  it("validates the seed template", () => {
    const result = formSchemaSchema.safeParse(compileStudentSurveySchema);
    expect(result.success).toBe(true);
  });

  it("rejects a question id that isn't snake_case", () => {
    const bad = {
      intro: { headline: "Hi", startLabel: "Start" },
      steps: [{ id: "s1", title: "S1", questions: [{ id: "Bad-ID", type: "text", label: "x" }] }],
    };
    expect(formSchemaSchema.safeParse(bad).success).toBe(false);
  });
});

describe("isQuestionVisible (conditional logic)", () => {
  it("shows a question with no showIf", () => {
    expect(isQuestionVisible(undefined, {})).toBe(true);
  });

  it("shows only when the equals condition matches", () => {
    const showIf = { id: "past_platform", equals: "Tried it and stopped" };
    expect(isQuestionVisible(showIf, { past_platform: "Tried it and stopped" })).toBe(true);
    expect(isQuestionVisible(showIf, { past_platform: "Never tried one" })).toBe(false);
    expect(isQuestionVisible(showIf, {})).toBe(false);
  });

  it("supports an array of accepted values for equals", () => {
    const showIf = { id: "q", equals: ["a", "b"] };
    expect(isQuestionVisible(showIf, { q: "b" })).toBe(true);
    expect(isQuestionVisible(showIf, { q: "c" })).toBe(false);
  });

  it("supports includes for multi-select answers", () => {
    const showIf = { id: "tools", includes: "GitHub" };
    expect(isQuestionVisible(showIf, { tools: ["GitHub", "Other"] })).toBe(true);
    expect(isQuestionVisible(showIf, { tools: ["Other"] })).toBe(false);
  });
});

describe("allAnswerKeys", () => {
  it("expands scales questions into one key per item", () => {
    const keys = allAnswerKeys(compileStudentSurveySchema);
    const ids = keys.map((k) => k.id);
    expect(ids).toContain("p_no_practice");
    expect(ids).toContain("v_tasks");
    expect(ids).not.toContain("problems_scale"); // the group id itself isn't a key
  });

  it("includes the trailing consent question", () => {
    const keys = allAnswerKeys(compileStudentSurveySchema);
    expect(keys.map((k) => k.id)).toContain("consent");
  });
});
