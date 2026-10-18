import { CheckIcon, ClockIcon, LockIcon, ShieldCheckIcon } from "@/components/ui/icons";

export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]" aria-hidden="true">
      <div className="pointer-events-none absolute -inset-10 rounded-[48px] bg-[radial-gradient(closest-side,rgba(139,92,246,0.26),transparent)] blur-2xl" />
      <div className="pointer-events-none absolute -right-14 top-10 h-52 w-52 animate-float-slow rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative animate-float rounded-[26px] border border-white/12 bg-[#080d1e]/90 p-2 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
        <div className="rounded-[20px] border border-white/7 bg-[#0a1022] p-5">
          <div className="flex items-center justify-between border-b border-white/7 pb-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-400/70" />
              <span className="h-2 w-2 rounded-full bg-amber-300/70" />
              <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
              <span className="ml-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                Application flow
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
              <LockIcon size={9} />
              Private
            </span>
          </div>

          <div className="mt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Step 2 of 3 · Questions</p>
            <div className="mt-3 flex items-center gap-1.5">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full ${
                    step <= 2
                      ? "bg-[linear-gradient(90deg,var(--brand-from),var(--brand-to))]"
                      : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.028] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-snow">Tell us about yourself</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                  Experience, strengths, and why Top Cloud.
                </p>
              </div>
              <span className="rounded-full border border-rose-400/20 bg-rose-400/[0.07] px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-rose-300">
                Required
              </span>
            </div>
            <div className="mt-3.5 h-[70px] rounded-xl border border-white/8 bg-black/20 p-3">
              <div className="h-1.5 w-4/5 rounded-full bg-white/12" />
              <div className="mt-2 h-1.5 w-3/5 rounded-full bg-white/8" />
              <div className="mt-2 h-1.5 w-2/5 rounded-full bg-white/5" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[9px] text-muted">Saved securely · answers locked after submit</span>
              <span className="rounded-lg bg-[linear-gradient(120deg,var(--brand-from),var(--brand-to))] px-3 py-1.5 text-[9.5px] font-semibold text-white">
                Continue
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="status-badge status-pending !text-[9px]">Pending</span>
            <span className="status-badge status-reviewing !text-[9px]">Reviewing</span>
            <span className="status-badge status-consideration !text-[9px]">Under consideration</span>
            <span className="status-badge status-approved !text-[9px]">Approved</span>
          </div>
        </div>
      </div>

      <div className="absolute -left-5 top-24 hidden w-[178px] animate-float rounded-2xl border border-white/12 bg-[#0c1228]/95 p-3.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:block [animation-delay:1.2s]">
        <div className="flex items-center gap-2 text-emerald-300">
          <ShieldCheckIcon size={14} />
          <span className="text-[9.5px] font-semibold uppercase tracking-wide">Private notes</span>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-mist">
          Reviewer discussion stays internal. Only published feedback reaches you.
        </p>
      </div>

      <div className="absolute -bottom-5 right-2 w-[210px] animate-float rounded-2xl border border-white/12 bg-[#0c1228]/95 p-3.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:right-[-24px] [animation-delay:0.6s]">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">Reference</span>
          <span className="inline-flex items-center gap-1 text-[8.5px] text-emerald-300">
            <CheckIcon size={9} />
            Submitted
          </span>
        </div>
        <p className="mt-1.5 font-mono text-[12px] font-semibold tracking-wide text-snow">TC-2026-••••</p>
        <div className="mt-2 flex items-center gap-1.5 text-[9px] text-muted">
          <ClockIcon size={10} />
          Status updates appear instantly
        </div>
      </div>
    </div>
  );
}
