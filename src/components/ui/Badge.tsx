const STATUS_STYLES: Record<string, string> = {
  draft: "text-faint border-line2",
  published: "text-cyan border-cyan/40 bg-cyan-soft",
  closed: "text-err border-err/40",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`mono-label border rounded-sm px-2 py-1 ${STATUS_STYLES[status] ?? "text-muted border-line2"}`}
    >
      {status}
    </span>
  );
}
