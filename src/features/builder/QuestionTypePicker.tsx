import { QUESTION_TYPES, QuestionType } from "@/lib/schema";

const LABELS: Record<QuestionType, string> = {
  single: "Single choice",
  multi: "Multiple choice",
  text: "Short text",
  textarea: "Long text",
  email: "Email",
  number: "Number",
  scales: "Rating scales",
  dropdown: "Dropdown",
  yesno: "Yes / No",
};

export function QuestionTypePicker({ onPick }: { onPick: (type: QuestionType) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {QUESTION_TYPES.map((t) => (
        <button
          key={t}
          onClick={() => onPick(t)}
          className="text-left px-3 py-2 text-sm rounded-sm border border-line2 bg-field hover:border-cyan/50 hover:bg-cyan-soft"
        >
          {LABELS[t]}
        </button>
      ))}
    </div>
  );
}
