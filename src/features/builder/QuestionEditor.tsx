import { Question, QuestionType, optionLabel } from "@/lib/schema";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, GripVertical } from "lucide-react";

let counter = 0;
function nextId(prefix: string) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter}`;
}

export function makeDefaultQuestion(type: QuestionType): Question {
  const base = { id: nextId("q"), label: "Untitled question", optional: false };
  switch (type) {
    case "single":
    case "multi":
    case "dropdown":
      return { ...base, type, options: ["Option 1", "Option 2"] } as Question;
    case "scales":
      return {
        ...base,
        type,
        low: "Low",
        high: "High",
        items: [{ id: nextId("item"), label: "First item" }],
      } as Question;
    case "text":
    case "textarea":
    case "email":
    case "yesno":
      return { ...base, type } as Question;
    case "number":
      return { ...base, type } as Question;
  }
}

export function QuestionEditor({
  question,
  hasResponses,
  onChange,
  onDelete,
  onDuplicate,
  dragHandleProps,
}: {
  question: Question;
  hasResponses: boolean;
  onChange: (q: Question) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: Record<string, unknown>;
}) {
  // Only for shared fields across all variants (id, type, label, hint,
  // placeholder, optional, showIf, maxLength). Type-specific fields are
  // updated inline below, where TypeScript has narrowed the union.
  function setBase<K extends keyof Question>(key: K, value: Question[K]) {
    onChange({ ...question, [key]: value } as Question);
  }

  const hasOptions =
    question.type === "single" ||
    question.type === "multi" ||
    question.type === "dropdown";

  return (
    <div className="border border-line rounded bg-field/40 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          {...dragHandleProps}
          className="cursor-grab text-faint hover:text-muted"
          aria-label="Reorder question"
        >
          <GripVertical size={16} />
        </button>
        <span className="mono-label text-faint">{question.type}</span>
        <div className="flex-1" />
        <button onClick={onDuplicate} className="text-faint hover:text-cyan text-xs mono-label">
          Duplicate
        </button>
        <button onClick={onDelete} className="text-faint hover:text-err">
          <Trash2 size={14} />
        </button>
      </div>

      <Input
        value={question.label}
        onChange={(e) => setBase("label", e.target.value)}
        placeholder="Question label"
      />
      <Input
        value={question.hint ?? ""}
        onChange={(e) => setBase("hint", e.target.value)}
        placeholder="Helper hint (optional)"
      />
      {(question.type === "text" ||
        question.type === "textarea" ||
        question.type === "email") && (
        <Input
          value={question.placeholder ?? ""}
          onChange={(e) =>
            onChange({ ...question, placeholder: e.target.value } as Question)
          }
          placeholder="Placeholder"
        />
      )}

      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!question.optional}
            onChange={(e) =>
              onChange({ ...question, optional: !e.target.checked } as Question)
            }
          />
          Required
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="mono-label text-faint">ID</span>
          <input
            value={question.id}
            disabled={hasResponses}
            onChange={(e) =>
              onChange({ ...question, id: e.target.value } as Question)
            }
            className="bg-field border border-line2 rounded-sm px-2 py-1 text-xs w-40 disabled:opacity-50"
          />
        </label>
        {hasResponses && (
          <span className="text-faint text-xs">Locked — form has responses</span>
        )}
      </div>

      {question.type === "number" && (
        <div className="flex gap-3">
          <Input
            type="number"
            value={question.min ?? ""}
            onChange={(e) =>
              onChange({
                ...question,
                min: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            placeholder="Min"
          />
          <Input
            type="number"
            value={question.max ?? ""}
            onChange={(e) =>
              onChange({
                ...question,
                max: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            placeholder="Max"
          />
        </div>
      )}

      {hasOptions && "options" in question && (
        <OptionsEditor
          options={question.options}
          onChange={(options) =>
            onChange({ ...question, options } as Question)
          }
        />
      )}

      {question.type === "scales" && (
        <ScalesEditor question={question} onChange={onChange} />
      )}
    </div>
  );
}

type EditableOption = string | { value: string; label: string };

function OptionsEditor({
  options,
  onChange,
}: {
  options: EditableOption[];
  onChange: (opts: EditableOption[]) => void;
}) {
  function updateAt(i: number, label: string) {
    const next = [...options];
    const current = next[i];
    // Preserve the option's shape — if it was {value,label}, keep it that
    // way so stored answer values don't drift when only the label changes.
    if (typeof current === "string") {
      next[i] = label;
    } else {
      next[i] = { ...current, label };
    }
    onChange(next);
  }
  function removeAt(i: number) {
    onChange(options.filter((_, idx) => idx !== i));
  }
  function bulkPaste(text: string) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length) onChange(lines);
  }
  return (
    <div className="flex flex-col gap-2">
      <span className="mono-label text-faint">Options</span>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={optionLabel(opt)}
            onChange={(e) => updateAt(i, e.target.value)}
          />
          <button
            type="button"
            onClick={() => removeAt(i)}
            className="text-faint hover:text-err shrink-0"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => onChange([...options, `Option ${options.length + 1}`])}
        >
          <Plus size={14} /> Add option
        </Button>
      </div>
      <details className="text-xs">
        <summary className="text-faint cursor-pointer">
          Bulk paste (one per line)
        </summary>
        <Textarea
          rows={3}
          placeholder={"Option A\nOption B\nOption C"}
          onBlur={(e) => e.target.value && bulkPaste(e.target.value)}
        />
      </details>
    </div>
  );
}

function ScalesEditor({
  question,
  onChange,
}: {
  question: Extract<Question, { type: "scales" }>;
  onChange: (q: Question) => void;
}) {
  function updateItem(i: number, label: string) {
    const items = [...question.items];
    items[i] = { ...items[i], label };
    onChange({ ...question, items });
  }
  function removeItem(i: number) {
    onChange({
      ...question,
      items: question.items.filter((_, idx) => idx !== i),
    });
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        <Input
          value={question.low}
          onChange={(e) => onChange({ ...question, low: e.target.value })}
          placeholder="Low label"
        />
        <Input
          value={question.high}
          onChange={(e) => onChange({ ...question, high: e.target.value })}
          placeholder="High label"
        />
      </div>
      <span className="mono-label text-faint">Items</span>
      {question.items.map((item, i) => (
        <div key={item.id} className="flex items-center gap-2">
          <Input
            value={item.label}
            onChange={(e) => updateItem(i, e.target.value)}
          />
          <button
            type="button"
            onClick={() => removeItem(i)}
            className="text-faint hover:text-err shrink-0"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <Button
        variant="ghost"
        onClick={() =>
          onChange({
            ...question,
            items: [
              ...question.items,
              {
                id: nextId("item"),
                label: `Item ${question.items.length + 1}`,
              },
            ],
          })
        }
      >
        <Plus size={14} /> Add item
      </Button>
    </div>
  );
}