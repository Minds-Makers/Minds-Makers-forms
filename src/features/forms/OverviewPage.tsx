import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useForms } from "./api";
import { CreateFormDialog } from "./CreateFormDialog";

export default function OverviewPage() {
  const { data: forms } = useForms();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: allResponses } = useQuery({
    queryKey: ["overview-responses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responses")
        .select("id, form_id, submitted_at")
        .order("submitted_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as { id: string; form_id: string; submitted_at: string }[];
    },
  });

  const chartData = useMemo(() => {
    if (!allResponses) return [];
    const byDay = new Map<string, number>();
    for (const r of allResponses) {
      const day = r.submitted_at.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([day, count]) => ({ day, count }));
  }, [allResponses]);

  const formTitleById = new Map((forms ?? []).map((f) => [f.id, f.title]));

  if (forms && forms.length === 0) {
    return (
      <div>
        <span className="mono-label text-cyan">Overview</span>
        <h1 className="text-2xl mt-1 mb-6">Welcome</h1>
        <EmptyState
          eyebrow="No forms yet"
          message="Create your first form to start collecting responses."
          action={<Button onClick={() => setCreateOpen(true)}>Create form</Button>}
        />
        <CreateFormDialog open={createOpen} onOpenChange={setCreateOpen} existingForms={[]} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <span className="mono-label text-cyan">Overview</span>
          <h1 className="text-2xl mt-1">Dashboard</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Create form
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <span className="mono-label text-faint">Total forms</span>
          <p className="text-3xl font-head font-bold mt-2">{forms?.length ?? 0}</p>
        </Card>
        <Card className="p-5">
          <span className="mono-label text-faint">Total responses</span>
          <p className="text-3xl font-head font-bold mt-2">{allResponses?.length ?? 0}</p>
        </Card>
        <Card className="p-5">
          <span className="mono-label text-faint">Published</span>
          <p className="text-3xl font-head font-bold mt-2">
            {forms?.filter((f) => f.status === "published").length ?? 0}
          </p>
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <span className="mono-label text-faint">Responses, last 30 days</span>
        <div className="h-56 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--faint)" fontSize={11} />
              <YAxis stroke="var(--faint)" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--line)" }} />
              <Line type="monotone" dataKey="count" stroke="var(--cyan)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <span className="mono-label text-faint">Latest responses</span>
        <div className="mt-3 flex flex-col divide-y divide-line">
          {(allResponses ?? []).slice(0, 10).map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/admin/forms/${r.form_id}/responses`)}
              className="flex items-center justify-between py-3 text-sm hover:text-cyan text-left"
            >
              <span>{formTitleById.get(r.form_id) ?? "Unknown form"}</span>
              <span className="text-faint">{new Date(r.submitted_at).toLocaleString()}</span>
            </button>
          ))}
          {(allResponses ?? []).length === 0 && <p className="text-faint text-sm py-3">No responses yet.</p>}
        </div>
      </Card>

      <CreateFormDialog open={createOpen} onOpenChange={setCreateOpen} existingForms={forms ?? []} />
    </div>
  );
}
