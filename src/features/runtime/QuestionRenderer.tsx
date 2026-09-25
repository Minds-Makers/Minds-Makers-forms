import { Question, optionLabel, optionValue } from "@/lib/schema";
import { Input, Textarea } from "@/components/ui/Input";

/**
 * Renders one question. Registered per-type below so adding a new question
 * type only requires touching this switch (and the analytics registry).
 */
export function QuestionRenderer({
  question,
  value,
  onChange,
  error,
}: {
  question: Question;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {question.label && (
        <label className="font-medium">
          {question.label}
          {!question.optional && <span className="text-cyan"> *</span>}
          {question.optional && <span className="mono-label text-faint ml-2">optional</span>}
        </label>
      )}
      {question.hint && <p className="text-faint text-sm">{question.hint}</p>}
      <QuestionField question={question} value={value} onChange={onChange} />
      {error && (
        <p className="text-err text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (question.type) {
    case "single":
    case "yesno": {
      const options = question.type === "yesno" ? ["Yes", "No"] : question.options.map((o) => o);
      return (
        <div className="grid gap-2">
          {options.map((opt) => {
            const val = optionValue(opt as any);
            const label = optionLabel(opt as any);
            const selected = value === val;
            return (
              <button
                type="button"
                key={val}
                onClick={() => onChange(val)}
                aria-pressed={selected}
                className={`text-left px-4 py-3 rounded-sm border transition-colors ${
                  selected ? "border-cyan bg-cyan-soft" : "border-line2 bg-field hover:border-cyan/40"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      );
    }
    case "multi": {
      const selectedValues: string[] = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="grid gap-2">
          {question.options.map((opt) => {
            const val = optionValue(opt);
            const label = optionLabel(opt);
            const selected = selectedValues.includes(val);
            return (
              <button
                type="button"
                key={val}
                aria-pressed={selected}
                onClick={() =>
                  onChange(
                    selected ? selectedValues.filter((v) => v !== val) : [...selectedValues, val]
                  )
                }
                className={`text-left px-4 py-3 rounded-sm border transition-colors ${
                  selected ? "border-cyan bg-cyan-soft" : "border-line2 bg-field hover:border-cyan/40"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      );
    }
    case "dropdown":
      return (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-field border border-line2 rounded-sm px-3 min-h-[44px] text-ink"
        >
          <option value="">Select…</option>
          {question.options.map((opt) => (
            <option key={optionValue(opt)} value={optionValue(opt)}>
              {optionLabel(opt)}
            </option>
          ))}
        </select>
      );
    case "text":
      return (
        <Input
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          maxLength={question.maxLength}
        />
      );
    case "textarea":
      return (
        <Textarea
          rows={4}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          maxLength={question.maxLength}
        />
      );
    case "email":
      return (
        <Input
          type="email"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder ?? "name@example.com"}
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={(value as number | string) ?? ""}
          min={question.min}
          max={question.max}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      );
    case "scales": {
      const answers = (value as Record<string, number>) ?? {};
      return (
        <div className="flex flex-col divide-y divide-line border border-line rounded-sm overflow-hidden">
          {question.items.map((item) => (
            <div key={item.id} className="p-3">
              <p className="text-sm mb-2">{item.label}</p>
              <div className="flex items-center gap-2">
                <span className="mono-label text-faint w-20">{question.low}</span>
                <div className="flex gap-1 flex-1 justify-center">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      key={n}
                      aria-pressed={answers[item.id] === n}
                      onClick={() => onChange({ ...answers, [item.id]: n })}
                      className={`w-9 h-9 rounded-sm text-sm font-semibold ${
                        answers[item.id] === n
                          ? "bg-cyan text-cyan-ink"
                          : "bg-field border border-line2 hover:border-cyan/40"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <span className="mono-label text-faint w-20 text-right">{question.high}</span>
              </div>
            </div>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}
