export default function MemberLoading() {
  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-2">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-8 w-72 max-w-full" />
        <div className="skeleton h-3 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="card h-[116px] p-5">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton mt-5 h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="card h-[320px] p-6">
          <div className="skeleton h-4 w-40" />
          <div className="mt-6 space-y-4">
            {[0, 1, 2].map((key) => (
              <div key={key} className="skeleton h-16 w-full" />
            ))}
          </div>
        </div>
        <div className="card h-[320px] p-6">
          <div className="skeleton h-4 w-28" />
          <div className="mt-6 space-y-3">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="skeleton h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
