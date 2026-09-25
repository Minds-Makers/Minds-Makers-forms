import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, Trash2, Flag, X } from "lucide-react";
import { useForm } from "@/features/forms/api";
import { useResponses, useDeleteResponses, useFlagSpam } from "./api";
import { allAnswerKeys } from "@/lib/schema";
import { exportCsv, exportJson, exportXlsx } from "@/lib/export";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

const PAGE_SIZES = [25, 50, 100];

export default function ResponsesPage() {
  const { id } = useParams();
  const { data: form } = useForm(id);
  const { data: responses, isLoading, justArrivedIds } = useResponses(id);
  const deleteResponses = useDeleteResponses(id);
  const flagSpam = useFlagSpam(id);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [versionFilter, setVersionFilter] = useState("all");
  const [hasEmailOnly, setHasEmailOnly] = useState(false);
  const [interviewOnly, setInterviewOnly] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [visibleCols, setVisibleCols] = useState<Set<string> | null>(null);

  const schema = form?.schema;
  const keys = useMemo(() => (schema ? allAnswerKeys(schema) : []), [schema]);
  const columns = visibleCols ?? new Set(keys.map((k) => k.id));

  const sources = useMemo(
    () => Array.from(new Set((responses ?? []).map((r) => r.source))),
    [responses]
  );
  const versions = useMemo(
    () => Array.from(new Set((responses ?? []).map((r) => r.form_version))).sort((a, b) => b - a),
    [responses]
  );

  const filtered = useMemo(() => {
    let rows = responses ?? [];
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((r) => JSON.stringify(r.answers).toLowerCase().includes(s));
    }
    if (sourceFilter !== "all") rows = rows.filter((r) => r.source === sourceFilter);
    if (versionFilter !== "all") rows = rows.filter((r) => String(r.form_version) === versionFilter);
    if (hasEmailOnly) rows = rows.filter((r) => Object.values(r.answers).some((v) => typeof v === "string" && v.includes("@")));
    if (interviewOnly) rows = rows.filter((r) => r.answers["interview_ok"]);
    return rows;
  }, [responses, search, sourceFilter, versionFilter, hasEmailOnly, interviewOnly]);

  const paged = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const detailRow = responses?.find((r) => r.id === detailId);

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (isLoading || !form) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/forms" className="text-faint hover:text-ink">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <span className="mono-label text-cyan">Responses</span>
          <h1 className="text-2xl mt-1">{form.title}</h1>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <Input placeholder="Search answers…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="bg-field border border-line2 rounded-sm px-3 min-h-[44px] text-sm">
          <option value="all">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={versionFilter} onChange={(e) => setVersionFilter(e.target.value)} className="bg-field border border-line2 rounded-sm px-3 min-h-[44px] text-sm">
          <option value="all">All versions</option>
          {versions.map((v) => (
            <option key={v} value={v}>v{v}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasEmailOnly} onChange={(e) => setHasEmailOnly(e.target.checked)} /> Has email
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={interviewOnly} onChange={(e) => setInterviewOnly(e.target.checked)} /> Open to interview
        </label>
        <div className="flex-1" />
        <Button variant="ghost" onClick={() => exportCsv(form.schema, filtered, form.slug)}>
          <Download size={14} /> CSV
        </Button>
        <Button variant="ghost" onClick={() => exportXlsx(form.schema, filtered, form.slug)}>
          <Download size={14} /> XLSX
        </Button>
        <Button variant="ghost" onClick={() => exportJson(form.schema, filtered, form.slug)}>
          <Download size={14} /> JSON
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 bg-cyan-soft border border-cyan/40 rounded-sm px-4 py-2">
          <span className="text-sm">{selected.size} selected</span>
          <Button
            variant="destructive"
            onClick={() => {
              deleteResponses.mutate(Array.from(selected));
              setSelected(new Set());
            }}
          >
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState eyebrow="No responses" message="Nothing matches yet — share the public link to start collecting." />
      ) : (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="mono-label text-faint text-left border-b border-line">
                  <th className="p-3"></th>
                  <th className="p-3">Submitted</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Version</th>
                  {keys.filter((k) => columns.has(k.id)).slice(0, 4).map((k) => (
                    <th key={k.id} className="p-3 whitespace-nowrap">{k.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paged.map((r) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-cyan-soft cursor-pointer ${justArrivedIds.has(r.id) ? "bg-cyan-soft" : ""} ${r.is_spam ? "opacity-40" : ""}`}
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} />
                    </td>
                    <td className="p-3 whitespace-nowrap" onClick={() => setDetailId(r.id)}>
                      {new Date(r.submitted_at).toLocaleString()}
                    </td>
                    <td className="p-3" onClick={() => setDetailId(r.id)}>{r.source}</td>
                    <td className="p-3" onClick={() => setDetailId(r.id)}>{r.duration_sec ?? "—"}s</td>
                    <td className="p-3" onClick={() => setDetailId(r.id)}>v{r.form_version}</td>
                    {keys.filter((k) => columns.has(k.id)).slice(0, 4).map((k) => (
                      <td key={k.id} className="p-3 max-w-[200px] truncate" onClick={() => setDetailId(r.id)}>
                        {formatAnswer(r.answers[k.id])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="flex items-center justify-between mt-4">
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} className="bg-field border border-line2 rounded-sm px-3 py-2 text-sm">
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s} / page</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                Prev
              </Button>
              <span className="text-sm text-faint">
                {page + 1} / {Math.max(1, Math.ceil(filtered.length / pageSize))}
              </span>
              <Button
                variant="ghost"
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * pageSize >= filtered.length}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {detailRow && (
        <DetailDrawer
          response={detailRow}
          keys={keys}
          onClose={() => setDetailId(null)}
          onDelete={() => {
            deleteResponses.mutate([detailRow.id]);
            setDetailId(null);
          }}
          onFlag={() => flagSpam.mutate({ id: detailRow.id, isSpam: !detailRow.is_spam })}
        />
      )}
    </div>
  );
}

function formatAnswer(v: unknown): string {
  if (v === undefined || v === null) return "—";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function DetailDrawer({
  response,
  keys,
  onClose,
  onDelete,
  onFlag,
}: {
  response: import("@/lib/schema").ResponseRow;
  keys: { id: string; label: string }[];
  onClose: () => void;
  onDelete: () => void;
  onFlag: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l border-line h-full overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-head font-bold text-lg">Response detail</h2>
          <button onClick={onClose} className="text-faint hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <p className="text-faint text-sm mb-6">
          {new Date(response.submitted_at).toLocaleString()} · {response.source} · v{response.form_version}
        </p>
        <div className="flex flex-col gap-4 mb-6">
          {keys.map((k) => (
            <div key={k.id}>
              <p className="mono-label text-faint mb-1">{k.label}</p>
              <p className="text-sm">{formatAnswer(response.answers[k.id])}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onFlag}>
            <Flag size={14} /> {response.is_spam ? "Unflag spam" : "Flag as spam"}
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
