import { z } from "zod";

/**
 * Single shared schema for a form. The builder writes this, the public
 * runtime renders it, and analytics aggregates it. Never let these three
 * drift into separate shapes — add new question types here first.
 */

export const QUESTION_TYPES = [
  "single",
  "multi",
  "text",
  "textarea",
  "email",
  "number",
  "scales",
  "dropdown",
  "yesno",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

const idSchema = z
  .string()
  .min(1)
  .regex(/^[a-z][a-z0-9_]*$/, "must be snake_case, start with a letter");

export const optionSchema = z.union([
  z.string(),
  z.object({ value: z.string(), label: z.string() }),
]);
export type QuestionOption = z.infer<typeof optionSchema>;

export const showIfSchema = z.object({
  id: idSchema,
  equals: z.union([z.string(), z.array(z.string())]).optional(),
  includes: z.string().optional(),
});
export type ShowIf = z.infer<typeof showIfSchema>;

const baseQuestionFields = {
  id: idSchema,
  label: z.string(),
  hint: z.string().optional(),
  placeholder: z.string().optional(),
  // FIX: was `.optional().default(false)` — `.default()` makes the inferred
  // output type required, so every question literal had to spell out `optional`.
  optional: z.boolean().optional(),
  showIf: showIfSchema.optional(),
  maxLength: z.number().int().positive().optional(),
};

export const scaleItemSchema = z.object({
  id: idSchema,
  label: z.string(),
});
export type ScaleItem = z.infer<typeof scaleItemSchema>;

export const questionSchema = z.discriminatedUnion("type", [
  z.object({
    ...baseQuestionFields,
    type: z.literal("single"),
    options: z.array(optionSchema).min(1),
    allowOther: z.boolean().optional(),
  }),
  z.object({
    ...baseQuestionFields,
    type: z.literal("multi"),
    options: z.array(optionSchema).min(1),
    allowOther: z.boolean().optional(),
  }),
  z.object({ ...baseQuestionFields, type: z.literal("text") }),
  z.object({ ...baseQuestionFields, type: z.literal("textarea") }),
  z.object({ ...baseQuestionFields, type: z.literal("email") }),
  z.object({
    ...baseQuestionFields,
    type: z.literal("number"),
    min: z.number().optional(),
    max: z.number().optional(),
  }),
  z.object({
    ...baseQuestionFields,
    type: z.literal("scales"),
    low: z.string(),
    high: z.string(),
    items: z.array(scaleItemSchema).min(1),
  }),
  z.object({
    ...baseQuestionFields,
    type: z.literal("dropdown"),
    options: z.array(optionSchema).min(1),
  }),
  z.object({ ...baseQuestionFields, type: z.literal("yesno") }),
]);
export type Question = z.infer<typeof questionSchema>;

export const stepSchema = z.object({
  id: idSchema,
  title: z.string(),
  hint: z.string().optional(),
  questions: z.array(questionSchema),
});
export type Step = z.infer<typeof stepSchema>;

export const introSchema = z.object({
  eyebrow: z.string().optional(),
  headline: z.string(),
  headlineHighlight: z.string().optional(),
  lead: z.string().optional(),
  facts: z.array(z.string()).max(5).optional(),
  // FIX: was `.optional().default(true)`. Runtime code reads this as
  // `?? true` where the "required consent" behaviour matters.
  consentRequired: z.boolean().optional(),
  consentText: z.string().optional(),
  // FIX: was `.default("Start")`. UI already falls back with `|| "Start"`.
  startLabel: z.string().optional(),
});
export type Intro = z.infer<typeof introSchema>;

export const formSchemaSchema = z.object({
  intro: introSchema,
  steps: z.array(stepSchema).min(1),
  consent: questionSchema.optional(),
});
export type FormSchemaJson = z.infer<typeof formSchemaSchema>;

export const formSettingsSchema = z.object({
  closeDate: z.string().datetime().nullable().optional(),
  responseLimit: z.number().int().positive().nullable().optional(),
  // FIX: was `.optional().default(false)`. Consumers use `!!settings.onePerDevice`.
  onePerDevice: z.boolean().optional(),
  successTitle: z.string().optional(),
  successMessage: z.string().optional(),
  redirectUrl: z.string().url().optional().or(z.literal("")),
});
export type FormSettings = z.infer<typeof formSettingsSchema>;

export const formStatusSchema = z.enum(["draft", "published", "closed"]);
export type FormStatus = z.infer<typeof formStatusSchema>;

export interface FormRow {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  description: string | null;
  status: FormStatus;
  schema: FormSchemaJson;
  published_schema: FormSchemaJson | null;
  version: number;
  settings: FormSettings;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface ResponseRow {
  id: string;
  form_id: string;
  form_version: number;
  answers: Record<string, unknown>;
  source: string;
  duration_sec: number | null;
  is_spam: boolean;
  submitted_at: string;
}

/** Flatten a schema into the full ordered list of answer keys (scale items expand to their own keys). */
export function allAnswerKeys(schema: FormSchemaJson): { id: string; label: string; type: QuestionType }[] {
  const out: { id: string; label: string; type: QuestionType }[] = [];
  const pushQuestion = (q: Question) => {
    if (q.type === "scales") {
      for (const item of q.items) out.push({ id: item.id, label: `${q.label} — ${item.label}`, type: "number" });
    } else {
      out.push({ id: q.id, label: q.label, type: q.type });
    }
  };
  for (const step of schema.steps) for (const q of step.questions) pushQuestion(q);
  if (schema.consent) pushQuestion(schema.consent);
  return out;
}

/** Evaluate a showIf condition against the current answers map. */
export function isQuestionVisible(showIf: ShowIf | undefined, answers: Record<string, unknown>): boolean {
  if (!showIf) return true;
  const value = answers[showIf.id];
  if (showIf.equals !== undefined) {
    const targets = Array.isArray(showIf.equals) ? showIf.equals : [showIf.equals];
    return targets.includes(String(value));
  }
  if (showIf.includes !== undefined) {
    return Array.isArray(value) && value.includes(showIf.includes);
  }
  return true;
}

export function optionValue(opt: QuestionOption): string {
  return typeof opt === "string" ? opt : opt.value;
}
export function optionLabel(opt: QuestionOption): string {
  return typeof opt === "string" ? opt : opt.label;
}