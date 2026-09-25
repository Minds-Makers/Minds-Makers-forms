import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as Tabs from "@radix-ui/react-tabs";
import { Monitor, Smartphone, ArrowLeft, Undo2, Redo2 } from "lucide-react";
import { useForm, useUpdateForm, usePublishForm } from "@/features/forms/api";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { FormSchemaJson, FormSettings } from "@/lib/schema";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { StepsPanel } from "./StepsPanel";
import { LivePreview } from "./LivePreview";
import { Skeleton } from "@/components/ui/Skeleton";

const TAB_STYLE =
  "mono-label px-3 py-2 border-b-2 border-transparent data-[state=active]:border-cyan data-[state=active]:text-cyan text-faint";

export default function BuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: form, isLoading } = useForm(id);
  const updateForm = useUpdateForm();
  const publishForm = usePublishForm();

  const { data: responseCount } = useQuery({
    queryKey: ["response-count", id],
    enabled: !!id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("responses")
        .select("id", { count: "exact", head: true })
        .eq("form_id", id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [schema, setSchema] = useState<FormSchemaJson | null>(null);
  const [settings, setSettings] = useState<FormSettings>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const history = useRef<FormSchemaJson[]>([]);
  const future = useRef<FormSchemaJson[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (form) {
      setTitle(form.title);
      setDescription(form.description ?? "");
      setSchema(form.schema);
      setSettings(form.settings ?? {});
    }
  }, [form?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function pushHistory(prev: FormSchemaJson) {
    history.current.push(prev);
    if (history.current.length > 50) history.current.shift();
    future.current = [];
  }

  function setSchemaWithHistory(next: FormSchemaJson) {
    if (schema) pushHistory(schema);
    setSchema(next);
  }

  function undo() {
    if (!schema || history.current.length === 0) return;
    const prev = history.current.pop()!;
    future.current.push(schema);
    setSchema(prev);
  }
  function redo() {
    if (!schema || future.current.length === 0) return;
    const next = future.current.pop()!;
    history.current.push(schema);
    setSchema(next);
  }

  // Debounced autosave whenever title/description/schema/settings change.
  useEffect(() => {
    if (!id || !schema) return;
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await updateForm.mutateAsync({ id, title, description, schema, settings });
      setSaveState("saved");
    }, 900);
    return () => saveTimer.current && clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, schema, settings]);

  async function manualSave() {
    if (!id || !schema) return;
    setSaveState("saving");
    await updateForm.mutateAsync({ id, title, description, schema, settings });
    setSaveState("saved");
  }

  async function publish() {
    if (!form || !schema) return;
    await manualSave();
    await publishForm.mutateAsync({ ...form, schema, settings });
  }

  const hasResponses = (responseCount ?? 0) > 0;

  if (isLoading || !schema) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate("/admin/forms")} className="text-faint hover:text-ink">
            <ArrowLeft size={18} />
          </button>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-xs font-head font-bold" />
          {form && <StatusBadge status={form.status} />}
        </div>
        <div className="flex items-center gap-2">
          <span className="mono-label text-faint w-16">
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
          </span>
          <button onClick={undo} disabled={history.current.length === 0} className="text-faint hover:text-ink disabled:opacity-30">
            <Undo2 size={16} />
          </button>
          <button onClick={redo} disabled={future.current.length === 0} className="text-faint hover:text-ink disabled:opacity-30">
            <Redo2 size={16} />
          </button>
          <Button variant="ghost" onClick={manualSave}>
            Save
          </Button>
          <Button onClick={publish}>Publish</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <div className="min-w-0">
          <Tabs.Root defaultValue="structure">
            <Tabs.List className="flex gap-1 border-b border-line mb-4">
              <Tabs.Trigger value="settings" className={TAB_STYLE}>
                Settings
              </Tabs.Trigger>
              <Tabs.Trigger value="intro" className={TAB_STYLE}>
                Intro
              </Tabs.Trigger>
              <Tabs.Trigger value="structure" className={TAB_STYLE}>
                Structure
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="settings">
              <SettingsTab
                description={description}
                setDescription={setDescription}
                slug={form?.slug ?? ""}
                settings={settings}
                setSettings={setSettings}
              />
            </Tabs.Content>

            <Tabs.Content value="intro">
              <IntroTab schema={schema} onChange={setSchemaWithHistory} />
            </Tabs.Content>

            <Tabs.Content value="structure">
              <StepsPanel schema={schema} hasResponses={hasResponses} onChange={setSchemaWithHistory} />
            </Tabs.Content>
          </Tabs.Root>
        </div>

        <div className="min-w-0 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="mono-label text-faint">Live preview</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPreviewDevice("desktop")}
                className={`p-2 rounded-sm border ${previewDevice === "desktop" ? "border-cyan text-cyan" : "border-line2 text-faint"}`}
              >
                <Monitor size={14} />
              </button>
              <button
                onClick={() => setPreviewDevice("mobile")}
                className={`p-2 rounded-sm border ${previewDevice === "mobile" ? "border-cyan text-cyan" : "border-line2 text-faint"}`}
              >
                <Smartphone size={14} />
              </button>
            </div>
          </div>
          <div className="flex-1 border border-line rounded bg-bg overflow-auto">
            <div className={previewDevice === "mobile" ? "max-w-[380px] mx-auto" : ""}>
              <LivePreview schema={schema} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({
  description,
  setDescription,
  slug,
  settings,
  setSettings,
}: {
  description: string;
  setDescription: (v: string) => void;
  slug: string;
  settings: FormSettings;
  setSettings: (s: FormSettings) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mono-label text-faint block mb-1">Slug</label>
        <p className="text-muted text-sm">
          /f/{slug} — edit slug from the Forms list rename action (kept stable once shared).
        </p>
      </div>
      <div>
        <label className="mono-label text-faint block mb-1">Description</label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label className="mono-label text-faint block mb-1">Close date</label>
        <Input
          type="datetime-local"
          value={settings.closeDate ? settings.closeDate.slice(0, 16) : ""}
          onChange={(e) =>
            setSettings({ ...settings, closeDate: e.target.value ? new Date(e.target.value).toISOString() : null })
          }
        />
      </div>
      <div>
        <label className="mono-label text-faint block mb-1">Response limit</label>
        <Input
          type="number"
          value={settings.responseLimit ?? ""}
          onChange={(e) => setSettings({ ...settings, responseLimit: e.target.value ? Number(e.target.value) : null })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!settings.onePerDevice}
          onChange={(e) => setSettings({ ...settings, onePerDevice: e.target.checked })}
        />
        One response per device
      </label>
      <div>
        <label className="mono-label text-faint block mb-1">Success title</label>
        <Input value={settings.successTitle ?? ""} onChange={(e) => setSettings({ ...settings, successTitle: e.target.value })} />
      </div>
      <div>
        <label className="mono-label text-faint block mb-1">Success message</label>
        <Input
          value={settings.successMessage ?? ""}
          onChange={(e) => setSettings({ ...settings, successMessage: e.target.value })}
        />
      </div>
      <div>
        <label className="mono-label text-faint block mb-1">Redirect URL (optional)</label>
        <Input value={settings.redirectUrl ?? ""} onChange={(e) => setSettings({ ...settings, redirectUrl: e.target.value })} />
      </div>
    </div>
  );
}

function IntroTab({ schema, onChange }: { schema: FormSchemaJson; onChange: (s: FormSchemaJson) => void }) {
  function set<K extends keyof FormSchemaJson["intro"]>(key: K, value: FormSchemaJson["intro"][K]) {
    onChange({ ...schema, intro: { ...schema.intro, [key]: value } });
  }
  const facts = schema.intro.facts ?? [];
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mono-label text-faint block mb-1">Eyebrow</label>
        <Input value={schema.intro.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} />
      </div>
      <div>
        <label className="mono-label text-faint block mb-1">Headline</label>
        <Input value={schema.intro.headline} onChange={(e) => set("headline", e.target.value)} />
      </div>
      <div>
        <label className="mono-label text-faint block mb-1">Highlighted word (must appear in headline)</label>
        <Input value={schema.intro.headlineHighlight ?? ""} onChange={(e) => set("headlineHighlight", e.target.value)} />
      </div>
      <div>
        <label className="mono-label text-faint block mb-1">Lead paragraph</label>
        <Input value={schema.intro.lead ?? ""} onChange={(e) => set("lead", e.target.value)} />
      </div>
      <div>
        <label className="mono-label text-faint block mb-1">Bullet facts (up to 5, one per line)</label>
        <textarea
          className="w-full bg-field border border-line2 rounded-sm px-3 py-2 text-sm"
          rows={4}
          value={facts.join("\n")}
          onChange={(e) => set("facts", e.target.value.split("\n").filter(Boolean).slice(0, 5))}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!schema.intro.consentRequired}
          onChange={(e) => set("consentRequired", e.target.checked)}
        />
        Require consent checkbox
      </label>
      {schema.intro.consentRequired && (
        <div>
          <label className="mono-label text-faint block mb-1">Consent text</label>
          <Input value={schema.intro.consentText ?? ""} onChange={(e) => set("consentText", e.target.value)} />
        </div>
      )}
      <div>
        <label className="mono-label text-faint block mb-1">Start button label</label>
        <Input value={schema.intro.startLabel} onChange={(e) => set("startLabel", e.target.value)} />
      </div>
    </div>
  );
}
