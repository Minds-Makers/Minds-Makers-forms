import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";
import { useForms } from "@/features/forms/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Lead {
  email: string;
  formTitle: string;
  firstSeen: string;
  source: string;
  interviewOk: boolean;
}

export default function LeadsPage() {
  const { data: forms } = useForms();

  const { data: responses, isLoading } = useQuery({
    queryKey: ["all-responses-for-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responses")
        .select("form_id, answers, source, submitted_at, is_spam")
        .eq("is_spam", false)
        .order("submitted_at", { ascending: true });
      if (error) throw error;
      return data as { form_id: string; answers: Record<string, unknown>; source: string; submitted_at: string }[];
    },
  });

  const formTitleById = new Map((forms ?? []).map((f) => [f.id, f.title]));

  const leads = useMemo(() => {
    const byEmail = new Map<string, Lead>();
    for (const r of responses ?? []) {
      const emailValue = Object.values(r.answers).find((v) => typeof v === "string" && EMAIL_RE.test(v)) as
        | string
        | undefined;
      if (!emailValue) continue;
      if (!byEmail.has(emailValue)) {
        byEmail.set(emailValue, {
          email: emailValue,
          formTitle: formTitleById.get(r.form_id) ?? "Unknown form",
          firstSeen: r.submitted_at,
          source: r.source,
          interviewOk: !!r.answers["interview_ok"],
        });
      }
    }
    return Array.from(byEmail.values()).sort((a, b) => b.firstSeen.localeCompare(a.firstSeen));
  }, [responses, formTitleById]);

  function exportCsv() {
    const csv = Papa.unparse(
      leads.map((l) => ({
        email: l.email,
        form: l.formTitle,
        first_seen: l.firstSeen,
        source: l.source,
        interview_ok: l.interviewOk ? "yes" : "no",
      }))
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <span className="mono-label text-cyan">Leads</span>
          <h1 className="text-2xl mt-1">All collected emails</h1>
        </div>
        <Button variant="ghost" onClick={exportCsv} disabled={leads.length === 0}>
          <Download size={14} /> Export CSV
        </Button>
      </div>

      {leads.length === 0 ? (
        <EmptyState eyebrow="No leads yet" message="Emails left on any form's optional email question will appear here." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="mono-label text-faint text-left border-b border-line">
                <th className="p-3">Email</th>
                <th className="p-3">Form</th>
                <th className="p-3">First seen</th>
                <th className="p-3">Source</th>
                <th className="p-3">Interview OK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {leads.map((l) => (
                <tr key={l.email} className="hover:bg-cyan-soft">
                  <td className="p-3">{l.email}</td>
                  <td className="p-3">{l.formTitle}</td>
                  <td className="p-3">{new Date(l.firstSeen).toLocaleDateString()}</td>
                  <td className="p-3">{l.source}</td>
                  <td className="p-3">{l.interviewOk ? "Yes" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
