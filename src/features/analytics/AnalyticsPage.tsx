import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, Printer } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useForm } from "@/features/forms/api";
import { useResponses } from "@/features/responses/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Question } from "@/lib/schema";
import {
  aggregateScales, averageDurationSec, choiceQuestions, completionRate, countChoiceAnswers, crossTab,
} from "./aggregate";

export default function AnalyticsPage() {
  const { id } = useParams();
  const { data: form } = useForm(id);
  const { data: responses, isLoading } = useResponses(id);
  const [reportView, setReportView] = useState(false);

  const { data: events } = useQuery({
    queryKey: ["form_events", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("form_events").select("kind").eq("form_id", id);
      if (error) throw error;
      return data as { kind: "view" | "start" }[];
    },
  });

  const live = (responses ?? []).filter((r) => !r.is_spam);

  const last7d = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return live.filter((r) => new Date(r.submitted_at).getTime() >= cutoff).length;
  }, [live]);

  const views = (events ?? []).filter((e) => e.kind === "view").length;
  const rate = completionRate(views, live.length);
  const avgDuration = averageDurationSec(live);
  const emailLeads = live.filter((r) => Object.values(r.answers).some((v) => typeof v === "string" && v.includes("@"))).length;
  const interviewOptins = live.filter((r) => r.answers["interview_ok"]).length;

  const overTime = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const r of live) {
      const day = r.submitted_at.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    return Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count }));
  }, [live]);

  const bySource = useMemo(() => {
    const bySrc = new Map<string, number>();
    for (const r of live) bySrc.set(r.source, (bySrc.get(r.source) ?? 0) + 1);
    return Array.from(bySrc.entries()).map(([source, count]) => ({ source, count }));
  }, [live]);

  const [cross, setCross] = useState<{ a: string; b: string }>({ a: "", b: "" });

  if (isLoading || !form) {
    return <Skeleton className="h-96 w-full" />;
  }

  const cQuestions = choiceQuestions(form.schema);
  const scaleQuestions = form.schema.steps.flatMap((s) => s.questions).filter((q): q is Extract<Question, { type: "scales" }> => q.type === "scales");
  const textQuestions = form.schema.steps.flatMap((s) => s.questions).filter((q) => q.type === "text" || q.type === "textarea");

  const qa = cQuestions.find((q) => q.id === cross.a);
  const qb = cQuestions.find((q) => q.id === cross.b);
  const table = qa && qb ? crossTab(qa, qb, live) : null;

  function copyMarkdown() {
    let md = `# ${form!.title} — Analytics summary\n\nExploratory sample, n = ${live.length}.\n\n`;
    for (const q of cQuestions) {
      md += `## ${q.label}\n`;
      for (const c of countChoiceAnswers(q, live)) md += `- ${c.label}: ${c.count} (${c.pct}%)\n`;
      md += "\n";
    }
    for (const q of scaleQuestions) {
      md += `## ${q.label} — ranking\n`;
      for (const s of aggregateScales(q, live)) md += `- ${s.label}: mean ${s.mean} (n=${s.count})\n`;
      md += "\n";
    }
    navigator.clipboard.writeText(md);
  }

  return (
    <div className={reportView ? "print:bg-white print:text-black" : ""}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 no-print">
        <div className="flex items-center gap-3">
          <Link to="/admin/forms" className="text-faint hover:text-ink">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <span className="mono-label text-cyan">Analytics</span>
            <h1 className="text-2xl mt-1">{form.title}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={copyMarkdown}>
            <Copy size={14} /> Copy summary as Markdown
          </Button>
          <Button variant="ghost" onClick={() => window.print()}>
            <Printer size={14} /> Download PDF
          </Button>
          <Button variant="ghost" onClick={() => setReportView((v) => !v)}>
            {reportView ? "Exit report view" : "Report view"}
          </Button>
        </div>
      </div>

      <p className="text-faint text-sm mb-6">Exploratory sample, n = {live.length}.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Kpi label="Total responses" value={live.length} />
        <Kpi label="Last 7 days" value={last7d} />
        <Kpi label="Avg completion time" value={`${avgDuration}s`} />
        <Kpi label="Completion rate" value={`${rate}%`} />
        <Kpi label="Email leads" value={emailLeads} />
        <Kpi label="Interview opt-ins" value={interviewOptins} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="p-5">
          <span className="mono-label text-faint">Responses over time</span>
          <div className="h-52 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overTime}>
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
          <span className="mono-label text-faint">Responses by source</span>
          <div className="h-52 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySource}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="source" stroke="var(--faint)" fontSize={11} />
                <YAxis stroke="var(--faint)" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--line)" }} />
                <Bar dataKey="count" fill="var(--cyan)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {cQuestions.map((q) => (
        <Card key={q.id} className="p-5 mb-6">
          <span className="mono-label text-faint">{q.label}</span>
          <div className="h-auto mt-3" style={{ height: Math.max(120, countChoiceAnswers(q, live).length * 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countChoiceAnswers(q, live)} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid stroke="var(--line)" horizontal={false} />
                <XAxis type="number" stroke="var(--faint)" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="label" stroke="var(--faint)" fontSize={11} width={160} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--line)" }}
                  formatter={(value: number, _name, entry: any) => [`${value} (${entry.payload.pct}%)`, "count"]}
                />
                <Bar dataKey="count" fill="var(--cyan)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ))}

      {scaleQuestions.map((q) => (
        <Card key={q.id} className="p-5 mb-6">
          <span className="mono-label text-faint">{q.label} — ranking table (top priorities)</span>
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="text-faint text-left border-b border-line">
                <th className="py-2">Item</th>
                <th className="py-2">Mean</th>
                <th className="py-2">n</th>
                <th className="py-2">Distribution (1–5)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {aggregateScales(q, live).map((s) => (
                <tr key={s.itemId}>
                  <td className="py-2">{s.label}</td>
                  <td className="py-2 font-head font-bold text-cyan">{s.mean}</td>
                  <td className="py-2 text-faint">{s.count}</td>
                  <td className="py-2">
                    <div className="flex h-3 w-full max-w-xs rounded-full overflow-hidden bg-field">
                      {s.distribution.map((d, i) => (
                        <div
                          key={i}
                          style={{ width: `${(d / (s.count || 1)) * 100}%`, opacity: 0.4 + i * 0.15 }}
                          className="bg-cyan h-full"
                          title={`${i + 1}: ${d}`}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}

      {textQuestions.map((q) => (
        <TextAnswersCard key={q.id} question={q} responses={live} />
      ))}

      {cQuestions.length >= 2 && (
        <Card className="p-5 mb-6 no-print">
          <span className="mono-label text-faint">Cross-tab</span>
          <div className="flex gap-3 mt-3 mb-4 flex-wrap">
            <select value={cross.a} onChange={(e) => setCross((c) => ({ ...c, a: e.target.value }))} className="bg-field border border-line2 rounded-sm px-3 py-2 text-sm">
              <option value="">Question A…</option>
              {cQuestions.map((q) => (
                <option key={q.id} value={q.id}>{q.label}</option>
              ))}
            </select>
            <select value={cross.b} onChange={(e) => setCross((c) => ({ ...c, b: e.target.value }))} className="bg-field border border-line2 rounded-sm px-3 py-2 text-sm">
              <option value="">Question B…</option>
              {cQuestions.map((q) => (
                <option key={q.id} value={q.id}>{q.label}</option>
              ))}
            </select>
          </div>
          {table && (
            <div className="overflow-x-auto">
              <table className="text-sm">
                <thead>
                  <tr>
                    <th className="p-2 text-faint"></th>
                    {table.cols.map((c) => (
                      <th key={c} className="p-2 text-faint mono-label whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((r, i) => (
                    <tr key={r} className="border-t border-line">
                      <td className="p-2 mono-label text-faint whitespace-nowrap">{r}</td>
                      {table.cols.map((c, j) => (
                        <td key={c} className="p-2 text-center">{table.matrix[i][j]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-5">
      <span className="mono-label text-faint">{label}</span>
      <p className="text-2xl font-head font-bold mt-2">{value}</p>
    </Card>
  );
}

function TextAnswersCard({ question, responses }: { question: Question; responses: import("@/lib/schema").ResponseRow[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const answers = responses.map((r) => r.answers[question.id]).filter((a): a is string => typeof a === "string" && a.length > 0);
  const filtered = search ? answers.filter((a) => a.toLowerCase().includes(search.toLowerCase())) : answers;
  const paged = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <Card className="p-5 mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className="mono-label text-faint">{question.label} ({filtered.length})</span>
        <div className="flex gap-2 no-print">
          <input
            placeholder="Search…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="bg-field border border-line2 rounded-sm px-3 py-1.5 text-sm"
          />
          <Button variant="ghost" onClick={() => navigator.clipboard.writeText(filtered.join("\n\n"))}>
            <Copy size={14} /> Copy all
          </Button>
        </div>
      </div>
      <div className="flex flex-col divide-y divide-line">
        {paged.map((a, i) => (
          <p key={i} className="py-2 text-sm text-muted">{a}</p>
        ))}
        {filtered.length === 0 && <p className="text-faint text-sm py-2">No answers yet.</p>}
      </div>
      {filtered.length > pageSize && (
        <div className="flex justify-end gap-2 mt-3 no-print">
          <Button variant="ghost" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Prev</Button>
          <Button variant="ghost" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * pageSize >= filtered.length}>Next</Button>
        </div>
      )}
    </Card>
  );
}
