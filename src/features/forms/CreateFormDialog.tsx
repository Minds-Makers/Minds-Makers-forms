import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCreateForm, useDuplicateForm } from "./api";
import { blankFormSchema, compileStudentSurveySchema } from "@/lib/seedTemplate";
import { FormRow } from "@/lib/schema";

type Source = "blank" | "seed" | "duplicate";

export function CreateFormDialog({
  open,
  onOpenChange,
  existingForms,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingForms: FormRow[];
}) {
  const [title, setTitle] = useState("");
  const [source, setSource] = useState<Source>("blank");
  const [duplicateFromId, setDuplicateFromId] = useState<string>("");
  const createForm = useCreateForm();
  const duplicateForm = useDuplicateForm();
  const navigate = useNavigate();

  async function onCreate() {
    if (source === "duplicate") {
      const from = existingForms.find((f) => f.id === duplicateFromId);
      if (!from) return;
      const created = await duplicateForm.mutateAsync(from);
      onOpenChange(false);
      navigate(`/admin/forms/${created.id}/edit`);
      return;
    }
    const schema = source === "seed" ? compileStudentSurveySchema : blankFormSchema;
    const created = await createForm.mutateAsync({
      title: title || (source === "seed" ? "Compile Student Survey" : "Untitled form"),
      schema,
    });
    onOpenChange(false);
    navigate(`/admin/forms/${created.id}/edit`);
  }

  const busy = createForm.isPending || duplicateForm.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Create form">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          {(["blank", "seed", "duplicate"] as Source[]).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={`mono-label rounded-sm border px-2 py-3 text-center transition-colors ${
                source === s ? "border-cyan text-cyan bg-cyan-soft" : "border-line2 text-faint"
              }`}
            >
              {s === "blank" ? "Blank" : s === "seed" ? "Seed template" : "Duplicate"}
            </button>
          ))}
        </div>

        {source !== "duplicate" && (
          <div>
            <label className="mono-label text-faint block mb-1">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={source === "seed" ? "Compile Student Survey" : "Untitled form"}
            />
          </div>
        )}

        {source === "duplicate" && (
          <div>
            <label className="mono-label text-faint block mb-1">Duplicate from</label>
            <select
              value={duplicateFromId}
              onChange={(e) => setDuplicateFromId(e.target.value)}
              className="w-full bg-field border border-line2 rounded-sm px-3 min-h-[44px] text-ink"
            >
              <option value="">Select a form…</option>
              {existingForms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <Button onClick={onCreate} disabled={busy || (source === "duplicate" && !duplicateFromId)}>
          {busy ? "Creating…" : "Create form"}
        </Button>
      </div>
    </Dialog>
  );
}
