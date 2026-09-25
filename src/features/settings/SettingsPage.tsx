import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useForms } from "@/features/forms/api";

export default function SettingsPage() {
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [logoText, setLogoText] = useState("Minds Makers");
  const [defaultSuccess, setDefaultSuccess] = useState("Thanks for taking the time.");

  async function changePassword() {
    if (newPassword.length < 8) {
      setPasswordMsg("Password must be at least 8 characters.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordMsg(error ? error.message : "Password updated.");
    if (!error) setNewPassword("");
  }

  return (
    <div className="max-w-xl flex flex-col gap-8">
      <div>
        <span className="mono-label text-cyan">Settings</span>
        <h1 className="text-2xl mt-1">Account & defaults</h1>
      </div>

      <Card className="p-6">
        <h2 className="font-head font-bold mb-4">Change password</h2>
        <div className="flex flex-col gap-3">
          <Input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {passwordMsg && <p className="text-sm text-cyan">{passwordMsg}</p>}
          <Button onClick={changePassword} className="self-start">
            Update password
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-head font-bold mb-4">Default branding</h2>
        <p className="text-faint text-sm mb-4">
          Applied to new forms' intro screen. The cyan accent is fixed by the design system.
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mono-label text-faint block mb-1">Logo text</label>
            <Input value={logoText} onChange={(e) => setLogoText(e.target.value)} />
          </div>
          <div>
            <label className="mono-label text-faint block mb-1">Default success message</label>
            <Input value={defaultSuccess} onChange={(e) => setDefaultSuccess(e.target.value)} />
          </div>
          <p className="text-faint text-xs">
            Note: wire these into new-form creation once you decide where account-level defaults should live
            (a small `account_settings` table is the simplest option).
          </p>
        </div>
      </Card>

      <DangerZone />
    </div>
  );
}

function DangerZone() {
  const { data: forms } = useForms();
  const [selectedFormId, setSelectedFormId] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function deleteAllResponses() {
    if (!selectedFormId || confirmText !== "DELETE") return;
    setBusy(true);
    const { error } = await supabase.from("responses").delete().eq("form_id", selectedFormId);
    setBusy(false);
    setMsg(error ? error.message : "All responses for this form were deleted.");
    setConfirmText("");
  }

  return (
    <Card className="p-6 border-err/40">
      <h2 className="font-head font-bold text-err mb-4">Danger zone</h2>
      <div className="flex flex-col gap-3">
        <label className="mono-label text-faint block">Delete all responses of a form</label>
        <select
          value={selectedFormId}
          onChange={(e) => setSelectedFormId(e.target.value)}
          className="bg-field border border-line2 rounded-sm px-3 min-h-[44px] text-sm"
        >
          <option value="">Select a form…</option>
          {(forms ?? []).map((f) => (
            <option key={f.id} value={f.id}>
              {f.title}
            </option>
          ))}
        </select>
        <Input
          placeholder='Type "DELETE" to confirm'
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />
        {msg && <p className="text-sm text-muted">{msg}</p>}
        <Button
          variant="destructive"
          onClick={deleteAllResponses}
          disabled={busy || !selectedFormId || confirmText !== "DELETE"}
          className="self-start"
        >
          Delete all responses
        </Button>
      </div>
    </Card>
  );
}
