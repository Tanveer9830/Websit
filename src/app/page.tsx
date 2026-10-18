import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { brandFromSettings } from "@/lib/brand";
import { getPageSession } from "@/lib/page-auth";
import { isAdminLike } from "@/lib/permissions";
import { STATUS_META, type ApplicationStatus } from "@/lib/constants";
import { PublicNav } from "@/components/public/public-nav";
import { PublicFooter } from "@/components/public/footer";
import { HeroPreview } from "@/components/public/hero-preview";
import {
  ActivityIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  BadgeCheckIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardIcon,
  ClockIcon,
  DatabaseIcon,
  FileTextIcon,
  HashIcon,
  LayersIcon,
  LockIcon,
  MessageIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  UserIcon,
  ZapIcon,
} from "@/components/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: { absolute: `${settings.brandName} — Staff Applications` },
    description: settings.description,
  };
}

const STATUS_STAGES: ApplicationStatus[] = [
  "PENDING",
  "REVIEWING",
  "UNDER_CONSIDERATION",
  "APPROVED",
  "ON_HOLD",
  "REJECTED",
];

const FAQ = [
  {
    q: "Who can apply for a staff role?",
    a: "Anyone with a Top Cloud member account can apply. Registration is free, public, and always creates a normal member account — never an administrator. Admin access is granted only by the owner.",
  },
  {
    q: "Do I need to verify my email first?",
    a: "The default setup lets you apply immediately after registering. The owner can require a verified email, and verification links are single-use and expire after 24 hours.",
  },
  {
    q: "Can I edit or resubmit my application?",
    a: "Submitted answers are locked by default so reviewers can trust what they read. If the owner enables multiple applications, you can start a fresh one after a decision. Every submission gets its own reference number.",
  },
  {
    q: "Can I see the reviewers' internal notes?",
    a: "No. Internal notes live in a separate, admin-only record. Applicants see their status history and only the feedback an administrator explicitly publishes to them.",
  },
  {
    q: "What happens when the application form changes?",
    a: "Each application stores a snapshot of the question wording, options, type, and required flag it was answered against. Publishing a new form version never rewrites historical applications.",
  },
  {
    q: "How is my password protected?",
    a: "Passwords are hashed with Argon2id and never stored, logged, or returned by an API. Sessions are HTTP-only cookies, login attempts are rate limited, and password resets use single-use hashed tokens.",
  },
];

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-xl font-semibold text-snow sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted">{label}</p>
    </div>
  );
}

export default async function HomePage() {
  const [settings, auth] = await Promise.all([getSettings(), getPageSession()]);
  const brand = brandFromSettings(settings);
  const signedIn = Boolean(auth);
  const panelAccess = Boolean(auth && isAdminLike(auth.user));
  const primaryHref = signedIn ? (panelAccess ? "/admin" : "/apply") : "/register";
  const primaryLabel = signedIn ? (panelAccess ? "Open admin panel" : "Start your application") : "Start your application";

  return (
    <div className="overflow-x-hidden">
      <PublicNav brand={brand} signedIn={signedIn} panelAccess={panelAccess} />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden pb-16 pt-32 sm:pt-36 lg:pb-24 lg:pt-40">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-70" />
          <div className="pointer-events-none absolute -left-40 top-24 h-[420px] w-[420px] animate-drift rounded-full bg-brand/20 blur-[130px]" />
          <div className="pointer-events-none absolute -right-32 top-52 h-[360px] w-[360px] rounded-full bg-azure/15 blur-[120px]" />

          <div className="container-tc relative grid items-center gap-16 lg:grid-cols-[1.06fr_0.94fr] lg:gap-10">
            <div className="animate-fade-up">
              <div className="eyebrow">
                <span className="relative flex h-1.5 w-1.5">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${settings.applicationsOpen ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${settings.applicationsOpen ? "bg-emerald-400" : "bg-amber-400"}`} />
                </span>
                {settings.applicationsOpen ? "Applications are open" : "Applications are paused"}
                <span className="text-white/20">/</span>
                <span className="normal-case tracking-normal text-mist">Staff program</span>
              </div>

              <h1 className="mt-6 font-display text-[clamp(2.7rem,6.2vw,4.9rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-snow">
                Big things happen
                <br />
                <span className="gradient-text">at the top.</span>
              </h1>

              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-mist sm:text-base">
                {brand.name} is hiring the people who make our community feel like home. Apply for a staff role,
                follow your review in real time, and hear back from an actual human — not a void.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={primaryHref} className="btn btn-primary btn-lg group">
                  {primaryLabel}
                  <ArrowRightIcon size={17} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a href="#how-it-works" className="btn btn-secondary btn-lg">
                  See how it works
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs text-mist">
                <span className="inline-flex items-center gap-1.5">
                  <CheckIcon size={13} className="text-emerald-300" />
                  Human-reviewed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <LockIcon size={13} className="text-brand-bright" />
                  Private by design
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ZapIcon size={13} className="text-cyan-300" />
                  Real-time status
                </span>
              </div>

              <div className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/8 pt-6">
                <Fact value="06" label="Live statuses" />
                <Fact value="08" label="Question types" />
                <Fact value="01" label="Owner-controlled panel" />
              </div>
            </div>

            <div className="relative animate-fade-up pb-12 lg:pb-0 [animation-delay:180ms]">
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* ROLES */}
        <section id="roles" className="relative scroll-mt-28 border-y border-white/7 bg-white/[0.015] py-10">
          <div className="container-tc flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted">Where you could land</p>
              <p className="mt-1 font-display text-lg font-medium text-snow">
                Small team. Real ownership. Zero busywork.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.positionsEnabled && settings.positions.length > 0 ? (
                settings.positions.map((position) => (
                  <span
                    key={position}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-mist transition hover:border-brand/30 hover:text-snow"
                  >
                    <span className="h-1 w-1 rounded-full bg-brand-bright" />
                    {position}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted">Positions are announced before each round.</span>
              )}
            </div>
          </div>
        </section>

        {/* FEATURES BENTO */}
        <section className="container-tc py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">More signal, less guesswork</p>
            <h2 className="mt-5 font-display text-3xl font-semibold leading-tight text-snow sm:text-[2.65rem]">
              A recruitment portal that
              <span className="gradient-text"> actually shows its work.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-mist sm:text-base">
              Every question, status, note, and permission is stored in the database — and enforced on the server.
              This is the real panel, not a mockup.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <article className="card card-hover card-glow group relative overflow-hidden p-6 md:col-span-2">
              <div className="relative z-10 flex h-full flex-col justify-between gap-8 sm:flex-row sm:items-center">
                <div className="max-w-md">
                  <span className="mb-5 inline-grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-brand/15 text-brand-bright">
                    <LayersIcon size={20} />
                  </span>
                  <h3 className="font-display text-xl font-semibold text-snow">Your form. Your rules.</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mist">
                    Build the application visually — short text, paragraphs, email, numbers, dropdowns, single choice,
                    checkboxes, and yes/no. Reorder, require, disable, preview, and publish without touching code.
                  </p>
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-2">
                  {["Short text", "Paragraph", "Email", "Number", "Dropdown", "Single choice", "Checkboxes", "Yes / no"].map(
                    (type) => (
                      <span
                        key={type}
                        className="rounded-lg border border-white/8 bg-white/[0.035] px-2.5 py-1.5 text-[10px] text-mist"
                      >
                        {type}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </article>

            <article className="card card-hover p-6">
              <span className="mb-5 inline-grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-cyan-400/10 text-cyan-300">
                <ActivityIcon size={20} />
              </span>
              <h3 className="font-display text-lg font-semibold text-snow">A status you can trust</h3>
              <p className="mt-2 text-sm leading-relaxed text-mist">
                Six database-backed statuses. Every change keeps its timestamp and the administrator responsible — so a
                decision is never a mystery.
              </p>
            </article>

            <article className="card card-hover p-6">
              <span className="mb-5 inline-grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-emerald-400/10 text-emerald-300">
                <ShieldCheckIcon size={20} />
              </span>
              <h3 className="font-display text-lg font-semibold text-snow">Private by construction</h3>
              <p className="mt-2 text-sm leading-relaxed text-mist">
                Internal reviewer notes are a separate record from applicant feedback. Member endpoints never serialize
                them — hiding a button isn&apos;t the security model.
              </p>
            </article>

            <article className="card card-hover p-6">
              <span className="mb-5 inline-grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-amber-300/10 text-amber-200">
                <DatabaseIcon size={20} />
              </span>
              <h3 className="font-display text-lg font-semibold text-snow">Real data, not decoration</h3>
              <p className="mt-2 text-sm leading-relaxed text-mist">
                Dashboard counts come from the same tables that power review. Search by reference, username, or Discord
                ID. Filter, sort, and paginate the live queue.
              </p>
            </article>

            <article className="card card-hover p-6">
              <span className="mb-5 inline-grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-rose-400/10 text-rose-300">
                <LockIcon size={20} />
              </span>
              <h3 className="font-display text-lg font-semibold text-snow">Owner-grade control</h3>
              <p className="mt-2 text-sm leading-relaxed text-mist">
                The owner can grant granular admin permissions, disable accounts, and change panel branding. The owner
                account itself is protected from demotion and takeover.
              </p>
            </article>

            <article className="card card-hover p-6">
              <span className="mb-5 inline-grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-sky-400/10 text-sky-300">
                <HashIcon size={20} />
              </span>
              <h3 className="font-display text-lg font-semibold text-snow">Receipts included</h3>
              <p className="mt-2 text-sm leading-relaxed text-mist">
                Status changes, question edits, role grants, and settings updates land in an append-only audit log.
                Sensitive values are redacted before they touch it.
              </p>
            </article>
          </div>
        </section>

        {/* STATUS PIPELINE */}
        <section className="relative overflow-hidden py-24">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/8 blur-[140px]" />
          <div className="container-tc relative">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
              <div>
                <p className="eyebrow">The whole picture</p>
                <h2 className="mt-5 font-display text-3xl font-semibold leading-tight text-snow sm:text-[2.6rem]">
                  Six stages.
                  <br />
                  <span className="gradient-text">Zero mystery.</span>
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-mist">
                  Your dashboard shows the current status and its full history. What each stage means is fixed — no
                  cryptic codes, no vanishing threads.
                </p>
                <Link href={signedIn ? "/my-applications" : "/register"} className="btn btn-secondary mt-7">
                  {signedIn ? "View my applications" : "Create a member account"}
                  <ArrowUpRightIcon size={15} />
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {STATUS_STAGES.map((status, index) => {
                  const meta = STATUS_META[status];
                  return (
                    <div
                      key={status}
                      className="card-soft group flex items-start gap-3.5 p-4 transition hover:border-white/15 hover:bg-white/[0.045]"
                    >
                      <span className="mt-0.5 font-mono text-[10px] text-muted">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <span className={`status-badge ${meta.cssClass}`}>{meta.label}</span>
                        <p className="mt-2 text-[11.5px] leading-relaxed text-mist">{meta.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="scroll-mt-28 border-y border-white/7 bg-white/[0.015] py-24">
          <div className="container-tc">
            <div className="max-w-xl">
              <p className="eyebrow">From hello to decision</p>
              <h2 className="mt-5 font-display text-3xl font-semibold leading-tight text-snow sm:text-[2.6rem]">
                Three steps.
                <span className="gradient-text"> No black box.</span>
              </h2>
            </div>

            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {[
                {
                  icon: <UserIcon size={22} />,
                  step: "01",
                  title: "Make it official",
                  body: "Create a member account with a username, email, and a properly hashed password. Your unique member ID is permanent and shown in your profile.",
                  note: "Takes about a minute",
                  href: "/register",
                  link: "Create account",
                },
                {
                  icon: <FileTextIcon size={22} />,
                  step: "02",
                  title: "Tell us who you are",
                  body: "Answer the live staff form — built and published by the owner, versioned in the database. Review every answer before you submit and keep your reference number.",
                  note: "Answers are locked after submit",
                  href: signedIn ? "/apply" : "/register",
                  link: "Open the form",
                },
                {
                  icon: <CalendarIcon size={22} />,
                  step: "03",
                  title: "Watch it move",
                  body: "Your dashboard shows every application, its real-time status, submission and update dates, and any feedback a reviewer has explicitly published to you.",
                  note: "Status history included",
                  href: signedIn ? "/my-applications" : "/login",
                  link: signedIn ? "My applications" : "Sign in",
                },
              ].map((item) => (
                <article key={item.step} className="card card-hover group relative overflow-hidden p-6">
                  <span className="absolute right-5 top-4 font-display text-4xl font-semibold text-white/[0.04]">
                    {item.step}
                  </span>
                  <span className="mb-5 inline-grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(139,92,246,0.18),rgba(59,130,246,0.1))] text-brand-bright">
                    {item.icon}
                  </span>
                  <h3 className="font-display text-lg font-semibold text-snow">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mist">{item.body}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-white/7 pt-4">
                    <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted">
                      <BadgeCheckIcon size={12} className="text-emerald-300" />
                      {item.note}
                    </span>
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-bright transition hover:text-white"
                    >
                      {item.link}
                      <ArrowRightIcon size={12} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* SECURITY */}
        <section id="security" className="container-tc scroll-mt-28 py-24">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="eyebrow">
                <ShieldCheckIcon size={13} />
                Security, not theatre
              </p>
              <h2 className="mt-5 font-display text-3xl font-semibold leading-tight text-snow sm:text-[2.6rem]">
                Built like it holds
                <span className="gradient-text"> real people&apos;s trust.</span>
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-mist">
                Applications contain personal stories, contact details, and Discord handles. The platform treats them
                accordingly — at the database, API, and page layers.
              </p>

              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  ["Argon2id password hashing", "Owasp-grade parameters. Never plaintext, never logged."],
                  ["Server-side authorization", "Every protected route and API call checks the role and permission."],
                  ["Private notes by default", "Reviewer discussion is a separate, admin-only record."],
                  ["Hashed one-time tokens", "Email verification and reset links are single-use and expire."],
                  ["CSRF + rate limiting", "Double-submit tokens, origin checks, and attempt limits."],
                  ["Audit trail", "Important admin actions are recorded with a timestamp."],
                ].map(([title, body]) => (
                  <li key={title} className="flex gap-3 rounded-xl border border-white/7 bg-white/[0.025] p-3.5">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/10 text-emerald-300">
                      <CheckIcon size={11} />
                    </span>
                    <div>
                      <p className="text-[12.5px] font-semibold text-snow">{title}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-azure/10 blur-3xl" />
              <div className="card glow-ring relative overflow-hidden p-1.5">
                <div className="rounded-[14px] border border-white/6 bg-[#060a16]">
                  <div className="flex items-center justify-between border-b border-white/7 px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-white/15" />
                      <span className="h-2 w-2 rounded-full bg-white/15" />
                      <span className="h-2 w-2 rounded-full bg-white/15" />
                    </div>
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">
                      request flow · illustrative
                    </span>
                    <LockIcon size={12} className="text-emerald-300" />
                  </div>
                  <div className="space-y-4 p-5 font-mono text-[11px] leading-relaxed">
                    <div>
                      <p className="text-sky-300">POST /api/auth/login</p>
                      <p className="text-muted">├─ rate_limit · identifier + ip</p>
                      <p className="text-muted">├─ argon2id.verify(password) <span className="text-emerald-300">✓</span></p>
                      <p className="text-muted">├─ session · HttpOnly · SameSite=Lax</p>
                      <p className="text-muted">└─ audit · LOGIN_SUCCESS</p>
                    </div>
                    <div>
                      <p className="text-violet-300">GET /api/admin/applications/:id</p>
                      <p className="text-muted">
                        ├─ requireAdmin(&quot;REVIEW_APPLICATIONS&quot;) <span className="text-emerald-300">✓</span>
                      </p>
                      <p className="text-muted">├─ role ∈ &#123; OWNER, ADMIN &#125;</p>
                      <p className="text-muted">
                        └─ internal_notes → admin response <span className="text-rose-300">only</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-emerald-300">GET /api/applications/:id</p>
                      <p className="text-muted">
                        ├─ where.id = :id <span className="text-white/25">AND</span> where.userId = session.user.id
                      </p>
                      <p className="text-muted">
                        └─ notes.visibility = &quot;APPLICANT&quot; <span className="text-white/25">AND</span> published = true
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-white/7 px-4 py-3">
                    <p className="flex items-center gap-2 text-[10px] text-muted">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                      Ownership enforced in the query — not in the browser.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-28 border-t border-white/7 bg-white/[0.012] py-24">
          <div className="container-tc grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow">Questions, answered</p>
              <h2 className="mt-5 font-display text-3xl font-semibold leading-tight text-snow sm:text-[2.5rem]">
                The fine print,
                <span className="gradient-text"> minus the fog.</span>
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-mist">
                Still curious? Write to{" "}
                <a href={`mailto:${brand.supportEmail}`} className="font-medium text-brand-bright hover:text-white">
                  {brand.supportEmail}
                </a>{" "}
                — a real person reads it.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                <span className="badge badge-dot text-emerald-300">No hidden accounts</span>
                <span className="badge badge-dot text-brand-bright">Owner-controlled</span>
                <span className="badge badge-dot text-cyan-300">Human review</span>
              </div>
            </div>

            <div className="divide-y divide-white/7 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
              {FAQ.map((item) => (
                <details key={item.q} className="group px-5 sm:px-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[13.5px] font-medium text-snow [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDownIcon
                      size={16}
                      className="shrink-0 text-muted transition-transform duration-300 group-open:rotate-180"
                    />
                  </summary>
                  <p className="pb-5 pr-6 text-[12.5px] leading-relaxed text-mist">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container-tc py-24">
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(120deg,rgba(139,92,246,0.16),rgba(59,130,246,0.1))] px-6 py-16 text-center sm:px-12">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[560px] -translate-x-1/2 rounded-full bg-brand/25 blur-[100px]" />
            <div className="relative mx-auto max-w-2xl">
              <span className="inline-grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/[0.08] text-brand-bright">
                <SparklesIcon size={22} />
              </span>
              <h2 className="mt-6 font-display text-3xl font-semibold leading-tight text-snow sm:text-[2.9rem]">
                The view is better
                <span className="gradient-text"> from up here.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-mist sm:text-base">
                Bring your curiosity, your craft, and your favourite emoji. We&apos;ll bring a real process and a
                straight answer.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href={primaryHref} className="btn btn-primary btn-lg group">
                  {primaryLabel}
                  <ArrowRightIcon size={17} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link href={signedIn ? "/dashboard" : "/login"} className="btn btn-secondary btn-lg">
                  {signedIn ? "My dashboard" : "I already have an account"}
                </Link>
              </div>
              <p className="mt-6 inline-flex items-center gap-2 text-[11px] text-muted">
                <ClockIcon size={12} />
                Applications are {settings.applicationsOpen ? "currently open" : "paused right now"} · reviewed by the
                owner and authorized admins
              </p>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter brand={brand} applicationsOpen={settings.applicationsOpen} positions={settings.positions} />
    </div>
  );
}
