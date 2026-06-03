export default function Loading() {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-7 bg-chip rounded-lg w-48 mb-2" />
      <div className="h-4 bg-chip rounded w-64 mb-6" />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-panel rounded-xl border border-line p-4">
            <div className="h-8 bg-chip rounded mb-2" />
            <div className="h-3 bg-chip rounded w-2/3" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-panel rounded-xl border border-line p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-chip rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-chip rounded w-1/2 mb-2" />
                <div className="h-3 bg-chip rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
