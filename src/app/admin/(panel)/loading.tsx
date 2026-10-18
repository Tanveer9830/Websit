export default function AdminLoading() {
  return (
    <div className="space-y-6 pt-1">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-8 w-64 max-w-full" />
          <div className="skeleton h-3 w-96 max-w-full" />
        </div>
        <div className="skeleton h-9 w-28" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((key) => (
          <div key={key} className="card h-[104px] p-4">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton mt-4 h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="card h-[400px] p-6">
          <div className="skeleton h-4 w-40" />
          <div className="mt-6 space-y-3">
            {[0, 1, 2, 3, 4].map((key) => (
              <div key={key} className="skeleton h-14 w-full" />
            ))}
          </div>
        </div>
        <div className="card h-[400px] p-6">
          <div className="skeleton h-4 w-32" />
          <div className="mt-6 space-y-4">
            {[0, 1, 2, 3, 4].map((key) => (
              <div key={key} className="skeleton h-9 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
