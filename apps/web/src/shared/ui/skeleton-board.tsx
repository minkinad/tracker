export function SkeletonBoard() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, colIdx) => (
        <div key={colIdx} className="rounded-xl border border-black/[0.08] bg-white/82 p-4 shadow-sm">
          <div className="mb-4 h-5 w-24 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((__, taskIdx) => (
              <div key={taskIdx} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
