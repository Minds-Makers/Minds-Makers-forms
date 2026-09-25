import { describe, it, expect } from "vitest";
import { validateAnswer, validateStep } from "../validation";
import { Question } from "../schema";

const email: Question = { id: "email", type: "email", label: "Email", optional: true };
const num: Question = { id: "n", type: "number", label: "N", min: 1, max: 5, optional: false };
const text: Question = { id: "t", type: "text", label: "T", optional: false };

describe("validateAnswer", () => {
  it("requires a required field", () => {
    expect(validateAnswer(text, "")).toBe("This field is required.");
    expect(validateAnswer(text, "hi")).toBeNull();
  });

  it("allows an empty optional field", () => {
    expect(validateAnswer(email, "")).toBeNull();
  });

  it("rejects a malformed email", () => {
    expect(validateAnswer(email, "not-an-email")).toMatch(/valid email/);
    expect(validateAnswer(email, "a@b.com")).toBeNull();
  });

  it("enforces number min/max", () => {
    expect(validateAnswer(num, 0)).toMatch(/at least/);
    expect(validateAnswer(num, 6)).toMatch(/at most/);
    expect(validateAnswer(num, 3)).toBeNull();
  });
});

describe("validateStep", () => {
  it("skips questions hidden by showIf", () => {
    const hidden: Question = {
      id: "hidden",
      type: "text",
      label: "Hidden",
      optional: false,
      showIf: { id: "gate", equals: "yes" },
    };
    const errors = validateStep([hidden], { gate: "no" });
    expect(errors).toEqual({});
  });

  it("validates a visible required question", () => {
    const errors = validateStep([text], {});
    expect(errors.t).toBeDefined();
  });
});
