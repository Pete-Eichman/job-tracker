export default function DashboardLoading() {
  return (
    <div className="min-h-screen px-4 py-6 sm:p-8 bg-bg">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header skeleton */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="h-8 w-40 bg-surface-2 rounded-lg animate-pulse" />
            <div className="h-3 w-48 bg-surface-2 rounded animate-pulse" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="h-[30px] w-24 bg-surface-2 rounded-lg animate-pulse" />
            <div className="h-[30px] w-20 bg-surface-2 rounded-lg animate-pulse" />
            <div className="h-[30px] w-20 bg-surface-2 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Extract form skeleton */}
        <div className="flex gap-2">
          <div className="flex-1 h-10 bg-surface rounded-lg border border-border animate-pulse" />
          <div className="h-10 w-24 bg-surface-2 rounded-lg animate-pulse" />
        </div>

        {/* Filter bar skeleton */}
        <div className="h-24 bg-surface rounded-xl border border-border animate-pulse" />

        {/* Card skeletons */}
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="h-5 w-3/4 bg-surface-2 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-surface-2 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-surface-2 rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-9 h-9 rounded-full bg-surface-2 animate-pulse" />
                  <div className="h-6 w-20 rounded-full bg-surface-2 animate-pulse" />
                  <div className="w-7 h-7 rounded-md bg-surface-2 animate-pulse" />
                </div>
              </div>
              <div className="flex gap-1.5">
                <div className="h-5 w-16 bg-surface-2 rounded-md animate-pulse" />
                <div className="h-5 w-20 bg-surface-2 rounded-md animate-pulse" />
                <div className="h-5 w-14 bg-surface-2 rounded-md animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
