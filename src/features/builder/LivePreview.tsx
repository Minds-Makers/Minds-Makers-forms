import { useState } from "react";
import { FormSchemaJson, isQuestionVisible } from "@/lib/schema";
import { QuestionRenderer } from "@/features/runtime/QuestionRenderer";
import { Button } from "@/components/ui/Button";

/** Mirrors PublicFormPage's look without hitting Supabase — for the builder's right pane. */
export function LivePreview({ schema }: { schema: FormSchemaJson }) {
  const [stage, setStage] = useState<"intro" | "step">("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const step = schema.steps[Math.min(stepIndex, schema.steps.length - 1)];
  const total = schema.steps.length;

  const parts = schema.intro.headlineHighlight
    ? schema.intro.headline.split(schema.intro.headlineHighlight)
    : [schema.intro.headline];

  return (
    <div className="p-6">
      {stage === "step" && (
        <div className="mb-4 -mx-6 -mt-6 px-6 pt-4 pb-3 border-b border-line sticky top-0 bg-bg/90 backdrop-blur">
          <span className="mono-label text-faint">
            Step {stepIndex + 1} of {total}
          </span>
          <div className="h-[3px] bg-line rounded-full overflow-hidden mt-2">
            <div className="h-full bg-cyan" style={{ width: `${((stepIndex + 1) / total) * 100}%` }} />
          </div>
        </div>
      )}

      {stage === "intro" && (
        <div>
          {schema.intro.eyebrow && <span className="mono-label text-cyan">{schema.intro.eyebrow}</span>}
          <h1 className="text-2xl mt-2 mb-3">
            {parts[0]}
            {schema.intro.headlineHighlight && <span className="text-cyan">{schema.intro.headlineHighlight}</span>}
            {parts[1]}
          </h1>
          {schema.intro.lead && <p className="text-muted text-sm mb-4">{schema.intro.lead}</p>}
          {(schema.intro.facts ?? []).length > 0 && (
            <ul className="flex flex-col gap-1 mb-4">
              {(schema.intro.facts ?? []).map((f, i) => (
                <li key={i} className="text-sm text-muted flex gap-2">
                  <span className="text-cyan">·</span> {f}
                </li>
              ))}
            </ul>
          )}
          {schema.intro.consentRequired && (
            <label className="flex items-start gap-2 text-sm mb-4">
              <input type="checkbox" disabled className="mt-1" />
              {schema.intro.consentText}
            </label>
          )}
          <Button onClick={() => setStage("step")}>{schema.intro.startLabel || "Start"}</Button>
        </div>
      )}

      {stage === "step" && step && (
        <div>
          <h2 className="text-lg mb-1">{step.title}</h2>
          {step.hint && <p className="text-faint text-sm mb-4">{step.hint}</p>}
          <div className="flex flex-col gap-5">
            {step.questions
              .filter((q) => isQuestionVisible(q.showIf, answers))
              .map((q) => (
                <QuestionRenderer
                  key={q.id}
                  question={q}
                  value={answers[q.id]}
                  onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                />
              ))}
            {step.questions.length === 0 && (
              <p className="text-faint text-sm">No questions in this step yet.</p>
            )}
          </div>
          <div className="flex justify-between mt-6">
            <Button
              variant="ghost"
              onClick={() => (stepIndex === 0 ? setStage("intro") : setStepIndex((i) => i - 1))}
            >
              Back
            </Button>
            <Button onClick={() => setStepIndex((i) => Math.min(i + 1, total - 1))}>
              {stepIndex === total - 1 ? "Submit" : "Next"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
