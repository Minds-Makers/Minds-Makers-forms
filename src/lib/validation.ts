import { Question, isQuestionVisible } from "./schema";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validate one answer against its question definition. Returns an error string or null. */
export function validateAnswer(q: Question, value: unknown): string | null {
  const empty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  if (!q.optional && empty) return "This field is required.";
  if (empty) return null;

  switch (q.type) {
    case "email":
      if (typeof value !== "string" || !EMAIL_RE.test(value)) return "Enter a valid email address.";
      break;
    case "number": {
      const n = Number(value);
      if (Number.isNaN(n)) return "Enter a number.";
      if (q.min !== undefined && n < q.min) return `Must be at least ${q.min}.`;
      if (q.max !== undefined && n > q.max) return `Must be at most ${q.max}.`;
      break;
    }
    case "text":
    case "textarea":
      if (q.maxLength && typeof value === "string" && value.length > q.maxLength)
        return `Must be ${q.maxLength} characters or fewer.`;
      break;
    default:
      break;
  }
  return null;
}

/** Validate a whole step's questions, skipping any hidden by showIf. Returns { questionId: error }. */
export function validateStep(
  questions: Question[],
  answers: Record<string, unknown>
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const q of questions) {
    if (!isQuestionVisible(q.showIf, answers)) continue;
    const err = validateAnswer(q, answers[q.id]);
    if (err) errors[q.id] = err;
  }
  return errors;
}
