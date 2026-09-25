import { FormSchemaJson, Question, ResponseRow, optionLabel, optionValue } from "@/lib/schema";

export interface ChoiceCount {
  label: string;
  count: number;
  pct: number;
}

/** Count answers for a single/multi/dropdown/yesno question. */
export function countChoiceAnswers(question: Question, responses: ResponseRow[]): ChoiceCount[] {
  const total = responses.length || 1;
  const tally = new Map<string, number>();

  const optionLabels: Record<string, string> =
    question.type === "single" || question.type === "multi" || question.type === "dropdown"
      ? Object.fromEntries(question.options.map((o) => [optionValue(o), optionLabel(o)]))
      : question.type === "yesno"
      ? { Yes: "Yes", No: "No" }
      : {};

  for (const r of responses) {
    const value = r.answers[question.id];
    if (value === undefined || value === null) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      const key = String(v);
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }
  }

  return Array.from(tally.entries())
    .map(([key, count]) => ({ label: optionLabels[key] ?? key, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

export interface ScaleItemStat {
  itemId: string;
  label: string;
  mean: number;
  count: number;
  distribution: number[]; // index 0 = rating 1 ... index 4 = rating 5
}

/** Mean + distribution per item of a `scales` question, sorted by mean descending. */
export function aggregateScales(
  question: Extract<Question, { type: "scales" }>,
  responses: ResponseRow[]
): ScaleItemStat[] {
  return question.items
    .map((item) => {
      const values: number[] = [];
      for (const r of responses) {
        const v = r.answers[item.id];
        if (typeof v === "number") values.push(v);
      }
      const distribution = [0, 0, 0, 0, 0];
      for (const v of values) if (v >= 1 && v <= 5) distribution[v - 1] += 1;
      const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      return { itemId: item.id, label: item.label, mean: Math.round(mean * 100) / 100, count: values.length, distribution };
    })
    .sort((a, b) => b.mean - a.mean);
}

/** Cross-tab counts between two choice-type questions. */
export function crossTab(
  qa: Question,
  qb: Question,
  responses: ResponseRow[]
): { rows: string[]; cols: string[]; matrix: number[][] } {
  const av = countChoiceAnswers(qa, responses).map((c) => c.label);
  const bv = countChoiceAnswers(qb, responses).map((c) => c.label);
  const matrix = av.map(() => bv.map(() => 0));

  const aLabels: Record<string, string> =
    "options" in qa ? Object.fromEntries(qa.options.map((o) => [optionValue(o), optionLabel(o)])) : {};
  const bLabels: Record<string, string> =
    "options" in qb ? Object.fromEntries(qb.options.map((o) => [optionValue(o), optionLabel(o)])) : {};

  for (const r of responses) {
    const aVal = r.answers[qa.id];
    const bVal = r.answers[qb.id];
    if (aVal === undefined || bVal === undefined) continue;
    const aList = Array.isArray(aVal) ? aVal : [aVal];
    const bList = Array.isArray(bVal) ? bVal : [bVal];
    for (const a of aList) {
      const aLabel = aLabels[String(a)] ?? String(a);
      const ai = av.indexOf(aLabel);
      if (ai === -1) continue;
      for (const b of bList) {
        const bLabel = bLabels[String(b)] ?? String(b);
        const bi = bv.indexOf(bLabel);
        if (bi === -1) continue;
        matrix[ai][bi] += 1;
      }
    }
  }
  return { rows: av, cols: bv, matrix };
}

export function completionRate(views: number, submissions: number): number {
  if (views === 0) return 0;
  return Math.round((submissions / views) * 100);
}

export function averageDurationSec(responses: ResponseRow[]): number {
  const durations = responses.map((r) => r.duration_sec).filter((d): d is number => typeof d === "number");
  if (durations.length === 0) return 0;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

export function choiceQuestions(schema: FormSchemaJson): Question[] {
  const out: Question[] = [];
  for (const step of schema.steps) {
    for (const q of step.questions) {
      if (q.type === "single" || q.type === "multi" || q.type === "dropdown" || q.type === "yesno") out.push(q);
    }
  }
  return out;
}
