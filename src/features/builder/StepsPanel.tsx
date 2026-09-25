import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, GripVertical, Copy } from "lucide-react";
import { FormSchemaJson, Question, Step } from "@/lib/schema";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { QuestionTypePicker } from "./QuestionTypePicker";
import { QuestionEditor, makeDefaultQuestion } from "./QuestionEditor";

let stepCounter = 0;
function nextStepId() {
  stepCounter += 1;
  return `step_${Date.now().toString(36)}${stepCounter}`;
}

export function StepsPanel({
  schema,
  hasResponses,
  onChange,
}: {
  schema: FormSchemaJson;
  hasResponses: boolean;
  onChange: (schema: FormSchemaJson) => void;
}) {
  const [activeStepId, setActiveStepId] = useState(schema.steps[0]?.id);
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const activeStep = schema.steps.find((s) => s.id === activeStepId) ?? schema.steps[0];

  function updateStep(stepId: string, patch: Partial<Step>) {
    onChange({
      ...schema,
      steps: schema.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
    });
  }

  function addStep() {
    const step: Step = { id: nextStepId(), title: `Step ${schema.steps.length + 1}`, hint: "", questions: [] };
    onChange({ ...schema, steps: [...schema.steps, step] });
    setActiveStepId(step.id);
  }

  function deleteStep(stepId: string) {
    if (schema.steps.length <= 1) return;
    const next = schema.steps.filter((s) => s.id !== stepId);
    onChange({ ...schema, steps: next });
    if (activeStepId === stepId) setActiveStepId(next[0].id);
  }

  function onStepDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = schema.steps.findIndex((s) => s.id === active.id);
    const newIndex = schema.steps.findIndex((s) => s.id === over.id);
    onChange({ ...schema, steps: arrayMove(schema.steps, oldIndex, newIndex) });
  }

  function onQuestionDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id || !activeStep) return;
    const oldIndex = activeStep.questions.findIndex((q) => q.id === active.id);
    const newIndex = activeStep.questions.findIndex((q) => q.id === over.id);
    updateStep(activeStep.id, { questions: arrayMove(activeStep.questions, oldIndex, newIndex) });
  }

  function addQuestion(type: Parameters<typeof makeDefaultQuestion>[0]) {
    if (!activeStep) return;
    updateStep(activeStep.id, { questions: [...activeStep.questions, makeDefaultQuestion(type)] });
    setPickerOpenFor(null);
  }

  function updateQuestion(qid: string, q: Question) {
    if (!activeStep) return;
    updateStep(activeStep.id, {
      questions: activeStep.questions.map((existing) => (existing.id === qid ? q : existing)),
    });
  }

  function deleteQuestion(qid: string) {
    if (!activeStep) return;
    updateStep(activeStep.id, { questions: activeStep.questions.filter((q) => q.id !== qid) });
  }

  function duplicateQuestion(q: Question) {
    if (!activeStep) return;
    const copy: Question = { ...q, id: `${q.id}_copy${Date.now().toString(36).slice(-3)}` };
    updateStep(activeStep.id, { questions: [...activeStep.questions, copy] });
  }

  return (
    <div className="flex gap-4">
      {/* Step tabs */}
      <div className="w-48 shrink-0">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onStepDragEnd}>
          <SortableContext items={schema.steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1">
              {schema.steps.map((step, i) => (
                <SortableStepTab
                  key={step.id}
                  step={step}
                  index={i}
                  active={step.id === activeStep?.id}
                  onClick={() => setActiveStepId(step.id)}
                  onDelete={() => deleteStep(step.id)}
                  canDelete={schema.steps.length > 1}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <Button variant="ghost" onClick={addStep} className="w-full mt-2">
          <Plus size={14} /> Add step
        </Button>
      </div>

      {/* Active step editor */}
      {activeStep && (
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="flex gap-3">
            <Input
              value={activeStep.title}
              onChange={(e) => updateStep(activeStep.id, { title: e.target.value })}
              placeholder="Step title"
            />
          </div>
          <Input
            value={activeStep.hint ?? ""}
            onChange={(e) => updateStep(activeStep.id, { hint: e.target.value })}
            placeholder="Step hint (optional)"
          />

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onQuestionDragEnd}>
            <SortableContext items={activeStep.questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-3">
                {activeStep.questions.map((q) => (
                  <SortableQuestion
                    key={q.id}
                    question={q}
                    hasResponses={hasResponses}
                    onChange={(nq) => updateQuestion(q.id, nq)}
                    onDelete={() => deleteQuestion(q.id)}
                    onDuplicate={() => duplicateQuestion(q)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Button variant="ghost" onClick={() => setPickerOpenFor(activeStep.id)}>
            <Plus size={14} /> Add question
          </Button>
        </div>
      )}

      <Dialog open={!!pickerOpenFor} onOpenChange={() => setPickerOpenFor(null)} title="Add question">
        <QuestionTypePicker onPick={addQuestion} />
      </Dialog>
    </div>
  );
}

function SortableStepTab({
  step,
  index,
  active,
  onClick,
  onDelete,
  canDelete,
}: {
  step: Step;
  index: number;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 px-2 py-2 rounded-sm border text-sm cursor-pointer ${
        active ? "border-cyan bg-cyan-soft text-cyan" : "border-line2 text-muted hover:bg-field"
      }`}
      onClick={onClick}
    >
      <span {...attributes} {...listeners} className="cursor-grab text-faint">
        <GripVertical size={14} />
      </span>
      <span className="flex-1 truncate">
        {index + 1}. {step.title || "Untitled"}
      </span>
      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-faint hover:text-err"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

function SortableQuestion({
  question,
  hasResponses,
  onChange,
  onDelete,
  onDuplicate,
}: {
  question: Question;
  hasResponses: boolean;
  onChange: (q: Question) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <QuestionEditor
        question={question}
        hasResponses={hasResponses}
        onChange={onChange}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export { Copy };
