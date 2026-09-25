import { ReactNode } from "react";

export function EmptyState({
  eyebrow,
  message,
  action,
}: {
  eyebrow: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-16 px-6 border border-line rounded bg-card">
      <span className="mono-label text-cyan">{eyebrow}</span>
      <p className="text-muted max-w-sm">{message}</p>
      {action}
    </div>
  );
}
