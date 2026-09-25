import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { FormSchemaJson, FormSettings, isQuestionVisible } from "@/lib/schema";
import { validateStep } from "@/lib/validation";
import { QuestionRenderer } from "./QuestionRenderer";
import { Button } from "@/components/ui/Button";

interface PublicForm {
  id: string;
  title: string;
  slug: string;
  published_schema: FormSchemaJson;
  version: number;
  settings: FormSettings;
}

const MIN_COMPLETE_SECONDS = 3; // anti-spam: reject submissions faster than a human could plausibly finish

export default function PublicFormPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const source = searchParams.get("src") ?? "direct";

  const { data: form, isLoading, error } = useQuery({
    queryKey: ["public-form", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_form", { p_slug: slug });
      if (error) throw error;
      if (!data) throw new Error("not_found");
      return data as PublicForm;
    },
  });

  if (isLoading) return <div className="min-h-screen bg-bg" />;
  if (error || !form) return <ClosedOrMissingPage kind="notfound" />;

  const limitReached =
    form.settings.responseLimit != null && form.settings.responseLimit <= 0; // exact check done server-side too
  const closedByDate = form.settings.closeDate ? new Date(form.settings.closeDate) < new Date() : false;

  if (closedByDate || limitReached) return <ClosedOrMissingPage kind="closed" />;

  return <FormRuntime form={form} source={source} />;
}

function ClosedOrMissingPage({ kind }: { kind: "closed" | "notfound" }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center">
      <div>
        <span className="mono-label text-cyan">
          {kind === "closed" ? "Not accepting responses" : "404"}
        </span>
        <h1 className="text-2xl mt-2">
          {kind === "closed" ? "This form is not accepting responses." : "This form doesn't exist."}
        </h1>
      </div>
    </div>
  );
}

type Stage = "intro" | "step" | "success";

function FormRuntime({ form, source }: { form: PublicForm; source: string }) {
  const schema = form.published_schema;
  const draftKey = `mm_draft_${form.id}_${form.version}`;
  const submittedKey = `mm_submitted_${form.id}`;

  const [stage, setStage] = useState<Stage>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // FIX: consentRequired is now optional (undefined = treat as required).
  const [consented, setConsented] = useState(!(schema.intro.consentRequired ?? true));
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  const alreadySubmitted = form.settings.onePerDevice && localStorage.getItem(submittedKey) === "1";

  // Restore draft.
  useEffect(() => {
    const raw = localStorage.getItem(draftKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setAnswers(parsed.answers ?? {});
      } catch {
        // ignore corrupt draft
      }
    }
  }, [draftKey]);

  // Persist draft.
  useEffect(() => {
    if (stage !== "success") localStorage.setItem(draftKey, JSON.stringify({ answers }));
  }, [answers, draftKey, stage]);

  // Log a "view" event once.
  useEffect(() => {
    supabase.rpc("log_form_event", { p_form_id: form.id, p_kind: "view" }).then(
      () => {},
      () => {}
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id]);

  const visibleSteps = schema.steps;
  const totalSteps = visibleSteps.length;

  function startForm() {
    setStartedAt(Date.now());
    setStage("step");
    supabase.rpc("log_form_event", { p_form_id: form.id, p_kind: "start" }).then(
      () => {},
      () => {}
    );
  }

  function goNext() {
    const step = visibleSteps[stepIndex];
    const visibleQuestions = step.questions.filter((q) => isQuestionVisible(q.showIf, answers));
    const stepErrors = validateStep(visibleQuestions, answers);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      const firstId = Object.keys(stepErrors)[0];
      document.getElementById(`q_${firstId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    if (stepIndex < totalSteps - 1) {
      setStepIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      submit();
    }
  }

  function goBack() {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setStage("intro");
    }
  }

  async function submit() {
    if (honeypot) return; // silently drop bots, no visible error
    const durationSec = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;
    if (durationSec < MIN_COMPLETE_SECONDS) {
      // Likely automated; show a friendly message rather than blocking silently.
      setSubmitError("That was fast — please double check your answers and submit again.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    // Flatten scales-group answers into their per-item keys for storage.
    const flatAnswers: Record<string, unknown> = {};
    for (const step of schema.steps) {
      for (const q of step.questions) {
        if (q.type === "scales") {
          const grouped = (answers[q.id] as Record<string, number>) ?? {};
          for (const item of q.items) if (grouped[item.id] !== undefined) flatAnswers[item.id] = grouped[item.id];
        } else if (answers[q.id] !== undefined) {
          flatAnswers[q.id] = answers[q.id];
        }
      }
    }
    if (schema.consent && answers[schema.consent.id] !== undefined) {
      flatAnswers[schema.consent.id] = answers[schema.consent.id];
    }

    const { error } = await supabase.rpc("submit_response", {
      p_form_id: form.id,
      p_answers: flatAnswers,
      p_source: source,
      p_duration_sec: durationSec,
    });

    setSubmitting(false);
    if (error) {
      setSubmitError("Couldn't submit — check your connection and try again. Your answers are still here.");
      return;
    }
    localStorage.removeItem(draftKey);
    if (form.settings.onePerDevice) localStorage.setItem(submittedKey, "1");
    setStage("success");
  }

  if (alreadySubmitted && stage !== "success") return <ClosedOrMissingPage kind="closed" />;

  return (
    <div className="min-h-screen">
      {stage !== "intro" && stage !== "success" && (
        <header className="sticky top-0 z-10 backdrop-blur bg-bg/80 border-b border-line px-4 py-3">
          <div className="max-w-xl mx-auto flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-sm bg-cyan-soft border border-cyan/45 flex items-center justify-center text-cyan text-[10px] font-bold">
                MM
              </div>
              <span className="mono-label text-faint">
                Step {stepIndex + 1} of {totalSteps}
              </span>
            </div>
          </div>
          <div className="max-w-xl mx-auto h-[3px] bg-line rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan transition-all duration-200"
              style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </header>
      )}

      <div className="max-w-xl mx-auto px-4 py-10">
        {stage === "intro" && (
          <IntroScreen schema={schema} consented={consented} setConsented={setConsented} onStart={startForm} />
        )}

        {stage === "step" && (
          <StepScreen
            step={visibleSteps[stepIndex]}
            answers={answers}
            errors={errors}
            onChange={(id, val) => setAnswers((a) => ({ ...a, [id]: val }))}
            honeypot={honeypot}
            setHoneypot={setHoneypot}
          />
        )}

        {stage === "success" && <SuccessScreen settings={form.settings} slug={form.slug} />}
      </div>

      {stage === "step" && (
        <div className="sticky bottom-0 bg-bg/90 backdrop-blur border-t border-line px-4 py-4">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={goBack}>
              Back
            </Button>
            {submitError && <p className="text-err text-sm">{submitError}</p>}
            <Button onClick={goNext} disabled={submitting}>
              {submitting ? "Submitting…" : stepIndex === totalSteps - 1 ? "Submit" : "Next"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function IntroScreen({
  schema,
  consented,
  setConsented,
  onStart,
}: {
  schema: FormSchemaJson;
  consented: boolean;
  setConsented: (v: boolean) => void;
  onStart: () => void;
}) {
  const parts = schema.intro.headlineHighlight
    ? schema.intro.headline.split(schema.intro.headlineHighlight)
    : [schema.intro.headline];
  // FIX: consentRequired is optional; undefined means "required".
  const needsConsent = schema.intro.consentRequired ?? true;
  return (
    <div>
      {schema.intro.eyebrow && <span className="mono-label text-cyan">{schema.intro.eyebrow}</span>}
      <h1 className="text-3xl md:text-4xl mt-3 mb-4">
        {parts[0]}
        {schema.intro.headlineHighlight && <span className="text-cyan">{schema.intro.headlineHighlight}</span>}
        {parts[1]}
      </h1>
      {schema.intro.lead && <p className="text-muted mb-6 leading-relaxed">{schema.intro.lead}</p>}
      {schema.intro.facts && schema.intro.facts.length > 0 && (
        <ul className="flex flex-col gap-2 mb-6">
          {schema.intro.facts.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted">
              <span className="text-cyan mt-1">·</span> {f}
            </li>
          ))}
        </ul>
      )}
      {needsConsent && (
        <label className="flex items-start gap-3 mb-6 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-1 accent-[--cyan]"
          />
          <span>{schema.intro.consentText}</span>
        </label>
      )}
      <Button onClick={onStart} disabled={needsConsent && !consented}>
        {schema.intro.startLabel || "Start"}
      </Button>
    </div>
  );
}

function StepScreen({
  step,
  answers,
  errors,
  onChange,
  honeypot,
  setHoneypot,
}: {
  step: FormSchemaJson["steps"][number];
  answers: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (id: string, value: unknown) => void;
  honeypot: string;
  setHoneypot: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl mb-1">{step.title}</h2>
      {step.hint && <p className="text-faint text-sm mb-6">{step.hint}</p>}
      <div className="flex flex-col gap-6">
        {step.questions
          .filter((q) => isQuestionVisible(q.showIf, answers))
          .map((q) => (
            <div id={`q_${q.id}`} key={q.id}>
              <QuestionRenderer
                question={q}
                value={answers[q.id]}
                onChange={(v) => onChange(q.id, v)}
                error={errors[q.id]}
              />
            </div>
          ))}
      </div>
      {/* Honeypot: hidden from real users, bots often fill every field. */}
      <input
        type="text"
        name="company_website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] w-px h-px opacity-0"
        aria-hidden="true"
      />
    </div>
  );
}

function SuccessScreen({ settings, slug }: { settings: FormSettings; slug: string }) {
  useEffect(() => {
    if (settings.redirectUrl) {
      const t = setTimeout(() => {
        window.location.href = settings.redirectUrl!;
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [settings.redirectUrl]);

  return (
    <div className="text-center py-10">
      <span className="mono-label text-cyan">Thank you</span>
      <h1 className="text-2xl mt-3 mb-3">{settings.successTitle || "Your response was recorded."}</h1>
      <p className="text-muted mb-8">
        {settings.successMessage || "Thanks for taking the time — this genuinely helps us build the right thing."}
      </p>
      <Button
        variant="ghost"
        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/f/${slug}`)}
      >
        Copy form link
      </Button>
    </div>
  );
}