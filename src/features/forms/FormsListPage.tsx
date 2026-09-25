import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Copy, Trash2, MoreVertical, ExternalLink } from "lucide-react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useForms,
  useResponseCounts,
  useSetStatus,
  useDeleteForm,
  useDuplicateForm,
  usePublishForm,
} from "./api";
import { CreateFormDialog } from "./CreateFormDialog";
import { FormStatus } from "@/lib/schema";

const PUBLIC_BASE = typeof window !== "undefined" ? window.location.origin : "";

export default function FormsListPage() {
  const { data: forms, isLoading } = useForms();
  const counts = useResponseCounts((forms ?? []).map((f) => f.id));
  const setStatus = useSetStatus();
  const deleteForm = useDeleteForm();
  const duplicateForm = useDuplicateForm();
  const publishForm = usePublishForm();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FormStatus | "all">("all");
  const [sort, setSort] = useState<"newest" | "responses">("newest");
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let rows = forms ?? [];
    if (search) rows = rows.filter((f) => f.title.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "all") rows = rows.filter((f) => f.status === statusFilter);
    if (sort === "responses")
      rows = [...rows].sort((a, b) => (counts.data?.[b.id] ?? 0) - (counts.data?.[a.id] ?? 0));
    return rows;
  }, [forms, search, statusFilter, sort, counts.data]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <span className="mono-label text-cyan">Forms</span>
          <h1 className="text-2xl mt-1">All forms</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Create form
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search forms…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FormStatus | "all")}
          className="bg-field border border-line2 rounded-sm px-3 min-h-[44px] text-ink text-sm"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "newest" | "responses")}
          className="bg-field border border-line2 rounded-sm px-3 min-h-[44px] text-ink text-sm"
        >
          <option value="newest">Newest</option>
          <option value="responses">Most responses</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          eyebrow="No forms yet"
          message="Create your first form from scratch or start from the Compile Student Survey template."
          action={<Button onClick={() => setCreateOpen(true)}>Create form</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((form) => (
            <Card key={form.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    className="font-head font-bold hover:text-cyan text-left"
                    onClick={() => navigate(`/admin/forms/${form.id}/edit`)}
                  >
                    {form.title}
                  </button>
                  <StatusBadge status={form.status} />
                </div>
                <p className="text-faint text-sm mt-1 truncate">
                  /f/{form.slug} · {counts.data?.[form.id] ?? 0} responses · updated{" "}
                  {new Date(form.updated_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" onClick={() => navigate(`/admin/forms/${form.id}/edit`)}>
                  Edit
                </Button>
                <Button variant="ghost" onClick={() => navigate(`/admin/forms/${form.id}/responses`)}>
                  Responses
                </Button>
                <Button variant="ghost" onClick={() => navigate(`/admin/forms/${form.id}/analytics`)}>
                  Analytics
                </Button>
                <Dropdown.Root>
                  <Dropdown.Trigger asChild>
                    <button className="p-2 text-faint hover:text-ink">
                      <MoreVertical size={18} />
                    </button>
                  </Dropdown.Trigger>
                  <Dropdown.Portal>
                    <Dropdown.Content className="bg-card border border-line rounded-sm p-1 min-w-[200px] z-50">
                      <Dropdown.Item
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-field cursor-pointer outline-none"
                        onClick={() => navigator.clipboard.writeText(`${PUBLIC_BASE}/f/${form.slug}`)}
                      >
                        <Copy size={14} /> Copy public link
                      </Dropdown.Item>
                      <Dropdown.Item
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-field cursor-pointer outline-none"
                        onClick={() => window.open(`/f/${form.slug}`, "_blank")}
                      >
                        <ExternalLink size={14} /> View public page
                      </Dropdown.Item>
                      <Dropdown.Item
                        className="px-3 py-2 text-sm rounded-sm hover:bg-field cursor-pointer outline-none"
                        onClick={() => duplicateForm.mutate(form)}
                      >
                        Duplicate
                      </Dropdown.Item>
                      {form.status === "published" ? (
                        <Dropdown.Item
                          className="px-3 py-2 text-sm rounded-sm hover:bg-field cursor-pointer outline-none"
                          onClick={() => setStatus.mutate({ id: form.id, status: "closed" })}
                        >
                          Close
                        </Dropdown.Item>
                      ) : form.status === "closed" ? (
                        <Dropdown.Item
                          className="px-3 py-2 text-sm rounded-sm hover:bg-field cursor-pointer outline-none"
                          onClick={() => setStatus.mutate({ id: form.id, status: "published" })}
                        >
                          Reopen
                        </Dropdown.Item>
                      ) : (
                        <Dropdown.Item
                          className="px-3 py-2 text-sm rounded-sm hover:bg-field cursor-pointer outline-none"
                          onClick={() => publishForm.mutate(form)}
                        >
                          Publish
                        </Dropdown.Item>
                      )}
                      <Dropdown.Item
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-err/10 text-err cursor-pointer outline-none"
                        onClick={() => setConfirmDelete(form.id)}
                      >
                        <Trash2 size={14} /> Delete
                      </Dropdown.Item>
                    </Dropdown.Content>
                  </Dropdown.Portal>
                </Dropdown.Root>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateFormDialog open={createOpen} onOpenChange={setCreateOpen} existingForms={forms ?? []} />

      {confirmDelete && (
        <ConfirmDeleteDialog
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            deleteForm.mutate(confirmDelete);
            setConfirmDelete(null);
          }}
        />
      )}
    </div>
  );
}

function ConfirmDeleteDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <Card className="p-6 max-w-sm w-full">
        <h2 className="font-head font-bold text-lg mb-2">Delete this form?</h2>
        <p className="text-muted text-sm mb-6">
          This permanently deletes the form and all of its responses. This can't be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </Card>
    </div>
  );
}
