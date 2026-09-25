export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-field rounded ${className}`} />;
}
