"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import type { FormQuestion } from "@/lib/form";
import { Alert } from "@/components/ui/alert";
import { CopyButton } from "@/components/ui/copy-button";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardIcon,
  ClockIcon,
  FileTextIcon,
  HashIcon,
  LayoutIcon,
  LockIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@/components/ui/icons";

type Errors = Record<string, string>;
type AnswerValue = string | string[];

type SubmitResponse = {
  application: { id: string; reference: string; status: string; submittedAt: string };
  message: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NUMBER_RE = /^-?\d{1,15}(\.\d{1,6})?$/;

function isAnswered(value: AnswerValue | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value && value.trim());
}

function displayAnswer(question: FormQuestion, value: AnswerValue | undefined): string {
  if (!isAnswered(value)) return "Not answered";
  if (Array.isArray(value)) return value.join(" · ");
  return value ?? "Not answered";
}

export function ApplyWizard({
  questions,
  formVersion,
  config,
  user,
}: {
  questions: FormQuestion[];
  formVersion: number;
  config: {
    positionsEnabled: boolean;
    positions: string[];
    collectDiscord: boolean;
    requireVerifiedEmail: boolean;
  };
  user: { username: string; email: string; emailVerified: boolean };
}) {
  const showIntro = config.positionsEnabled || config.collectDiscord;
  const steps = showIntro ? ["About you", "Questions", "Review"] : ["Questions", "Review"];
  const questionStep = showIntro ? 1 : 0;
  const reviewStep = steps.length - 1;

  const [step, setStep] = useState(0);
  const [position, setPosition] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [discordId, setDiscordId] = useState("");
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<SubmitResponse["application"] | null>(null);
  const [touched, setTouched] = useState(false);

  const dirty = useMemo(
    () =>
      touched ||
      Boolean(position) ||
      Boolean(discordUsername) ||
      Boolean(discordId) ||
      Object.values(answers).some((value) =>
        Array.isArray(value) ? value.length > 0 : Boolean(value),
      ),
    [touched, position, discordUsername, discordId, answers],
  );

  useEffect(() => {
    if (!dirty || result) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, result]);

  function setAnswer(questionId: string, value: AnswerValue) {
    setTouched(true);
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setErrors((current) => {
      if (!current[questionId]) return current;
      const next = { ...current };
      delete next[questionId];
      return next;
    });
    setFormError(null);
  }

  function toggleCheckbox(questionId: string, option: string) {
    const current = answers[questionId];
    const list = Array.isArray(current) ? current : [];
    const next = list.includes(option) ? list.filter((item) => item !== option) : [...list, option];
    setAnswer(questionId, next);
  }

  function introErrors(): Errors {
    const next: Errors = {};
    if (config.positionsEnabled) {
      if (!position) next.position = "Choose the team you're applying for.";
      else if (!config.positions.includes(position)) next.position = "Choose a position from the list.";
    }
    if (discordUsername.trim() && !/^[A-Za-z0-9._-]{1,64}$/.test(discordUsername.trim())) {
      next.discordUsername = "Use letters, numbers, dots, dashes or underscores (max 64).";
    }
    if (discordId.trim() && !/^\d{1,32}$/.test(discordId.trim())) {
      next.discordId = "A Discord ID contains digits only (max 32).";
    }
    return next;
  }

  function questionErrors(): Errors {
    const next: Errors = {};
    for (const question of questions) {
      const value = answers[question.id];
      if (!isAnswered(value)) {
        if (question.required) next[question.id] = "This question is required.";
        continue;
      }
      if (question.type === "CHECKBOX" && Array.isArray(value)) {
        if (value.some((item) => !question.options.includes(item))) {
          next[question.id] = "Choose options from the list.";
        }
        continue;
      }
      const text = typeof value === "string" ? value.trim() : "";
      if (text.length > (question.type === "LONG_TEXT" ? 4000 : 500)) {
        next[question.id] =
          question.type === "LONG_TEXT" ? "Keep this under 4,000 characters." : "Keep this under 500 characters.";
      } else if (question.type === "EMAIL" && !EMAIL_RE.test(text)) {
        next[question.id] = "Enter a valid email address.";
      } else if (question.type === "NUMBER" && !NUMBER_RE.test(text)) {
        next[question.id] = "Enter a valid number.";
      } else if (
        (question.type === "SELECT" || question.type === "RADIO") &&
        !question.options.includes(text)
      ) {
        next[question.id] = "Choose one of the listed options.";
      } else if (question.type === "YES_NO" && text !== "Yes" && text !== "No") {
        next[question.id] = "Choose Yes or No.";
      }
    }
    return next;
  }

  function goNext() {
    setFormError(null);
    if (showIntro && step === 0) {
      const found = introErrors();
      setErrors(found);
      if (Object.keys(found).length > 0) return;
      setStep(questionStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (step === questionStep) {
      const found = questionErrors();
      setErrors(found);
      if (Object.keys(found).length > 0) {
        setFormError("Some answers need your attention before you can review.");
        return;
      }
      setStep(reviewStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goBack() {
    setFormError(null);
    setStep((current) => Math.max(0, current - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;
    setFormError(null);

    const intro = introErrors();
    const questionIssues = questionErrors();
    const allErrors = { ...intro, ...questionIssues };
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setFormError("Please fix the highlighted fields before submitting.");
      if (Object.keys(intro).length > 0 && showIntro) setStep(0);
      else if (Object.keys(questionIssues).length > 0) setStep(questionStep);
      return;
    }
    if (!confirmed) {
      setFormError("Confirm that your answers are final before submitting.");
      return;
    }

    setWorking(true);
    try {
      const payloadAnswers: Record<string, unknown> = {};
      for (const question of questions) {
        const value = answers[question.id];
        if (value !== undefined) payloadAnswers[question.id] = value;
      }
      const data = await apiFetch<SubmitResponse>("/api/applications", {
        method: "POST",
        body: {
          position: config.positionsEnabled ? position : null,
          discordUsername: config.collectDiscord ? discordUsername.trim() || null : null,
          discordId: config.collectDiscord ? discordId.trim() || null : null,
          answers: payloadAnswers,
        },
      });
      setResult(data.application);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFormError(error.message);
        const fields = error.fields;
        const answerFields: Errors = {};
        let firstAnswerField = false;
        for (const [key, message] of Object.entries(fields)) {
          if (questions.some((question) => question.id === key)) {
            answerFields[key] = message;
            firstAnswerField = true;
          }
        }
        setErrors({ ...fields, ...answerFields });
        if (Object.keys(fields).some((key) => ["position", "discordUsername", "discordId"].includes(key))) {
          setStep(0);
        } else if (firstAnswerField) {
          setStep(questionStep);
        }
        if (error.code === "EMAIL_NOT_VERIFIED") {
          setFormError("Verify your email address first, then return to this form.");
        }
      } else {
        setFormError("Could not submit your application. Please try again.");
      }
      setWorking(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card relative overflow-hidden p-7 text-center sm:p-10">
          <div className="pointer-events-none absolute left-1/2 top-0 h-52 w-80 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="relative mx-auto grid h-20 w-20 place-items-center">
            <span className="absolute inset-0 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08]" />
            <span className="absolute inset-2 rounded-full border border-emerald-400/15" />
            <CheckCircleIcon size={38} className="relative text-emerald-300 [animation:checkPop_.55s_ease]" />
          </div>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Application received
          </p>
          <h2 className="mt-2 font-display text-[28px] font-semibold text-snow">You&apos;re in the queue.</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-mist">
            Thank you, {user.username}. A reviewer will read every answer. Your status will update in your dashboard —
            no refreshing your inbox required.
          </p>

          <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-white/10 bg-black/25 p-4">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted">Reference number</p>
            <div className="mt-1.5 flex items-center justify-center gap-2">
              <span className="font-mono text-lg font-semibold tracking-wide text-snow">{result.reference}</span>
              <CopyButton value={result.reference} iconOnly />
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <StatusBadge status={result.status} />
              <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                <LockIcon size={10} />
                Answers locked
              </span>
            </div>
          </div>

          <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">
            <Link href={`/my-applications/${result.id}`} className="btn btn-primary">
              View my application
              <ArrowRightIcon size={15} />
            </Link>
            <Link href="/dashboard" className="btn btn-secondary">
              <LayoutIcon size={15} />
              Dashboard
            </Link>
          </div>
          <p className="mt-5 text-[10.5px] text-muted">
            Keep this reference safe. It identifies your application in any support conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-white/8 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-brand/12 text-brand-bright">
            <FileTextIcon size={16} />
          </span>
          <div>
            <p className="text-[11.5px] font-semibold text-snow">Staff application</p>
            <p className="text-[10px] text-muted">
              Form v{formVersion} · {questions.length} question{questions.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2 sm:max-w-xs">
          <div className="flex items-center justify-between text-[9.5px] font-medium uppercase tracking-[0.12em] text-muted">
            <span>
              Step {step + 1} of {steps.length}
            </span>
            <span>{steps[step]}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand-from),var(--brand-to))] transition-all duration-500"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_270px] lg:items-start">
        <div className="card p-5 sm:p-7">
          {formError ? (
            <div className="mb-5">
              <Alert tone="danger" title="Almost there">{formError}</Alert>
            </div>
          ) : null}

          {showIntro && step === 0 ? (
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-bright">About you</p>
                <h2 className="mt-1.5 font-display text-xl font-semibold text-snow">
                  First, the basics.
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  These details are shown to reviewers alongside your answers. Nothing here is public.
                </p>
              </div>

              {config.positionsEnabled ? (
                <div>
                  <label htmlFor="position" className="field-label">
                    <span>
                      Which team are you applying for? <span className="text-rose-300">*</span>
                    </span>
                  </label>
                  <select
                    id="position"
                    name="position"
                    className={`select ${errors.position ? "input-error" : ""}`}
                    value={position}
                    onChange={(event) => {
                      setPosition(event.target.value);
                      setTouched(true);
                      setErrors((current) => ({ ...current, position: "" }));
                    }}
                    aria-invalid={Boolean(errors.position)}
                  >
                    <option value="">Select a team…</option>
                    {config.positions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {errors.position ? <p className="form-error">{errors.position}</p> : null}
                </div>
              ) : null}

              {config.collectDiscord ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="discordUsername" className="field-label">
                      <span>Discord username</span>
                      <span className="text-[10px] font-normal text-muted">Optional</span>
                    </label>
                    <input
                      id="discordUsername"
                      name="discordUsername"
                      value={discordUsername}
                      onChange={(event) => {
                        setDiscordUsername(event.target.value);
                        setTouched(true);
                        setErrors((current) => ({ ...current, discordUsername: "" }));
                      }}
                      className={`input ${errors.discordUsername ? "input-error" : ""}`}
                      placeholder="yourname"
                      maxLength={64}
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                    {errors.discordUsername ? (
                      <p className="form-error">{errors.discordUsername}</p>
                    ) : (
                      <p className="form-hint">Helps reviewers find you later.</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="discordId" className="field-label">
                      <span>Discord user ID</span>
                      <span className="text-[10px] font-normal text-muted">Optional</span>
                    </label>
                    <input
                      id="discordId"
                      name="discordId"
                      value={discordId}
                      onChange={(event) => {
                        setDiscordId(event.target.value);
                        setTouched(true);
                        setErrors((current) => ({ ...current, discordId: "" }));
                      }}
                      className={`input ${errors.discordId ? "input-error" : ""}`}
                      placeholder="123456789012345678"
                      inputMode="numeric"
                      maxLength={32}
                      spellCheck={false}
                    />
                    {errors.discordId ? (
                      <p className="form-error">{errors.discordId}</p>
                    ) : (
                      <p className="form-hint">Digits only. Never shown publicly.</p>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-white/7 bg-white/[0.025] p-3.5">
                <div className="flex items-start gap-2.5">
                  <ShieldCheckIcon size={15} className="mt-0.5 shrink-0 text-emerald-300" />
                  <p className="text-[10.5px] leading-relaxed text-muted">
                    Submitting as <span className="font-medium text-mist">{user.username}</span> ({user.email}
                    {user.emailVerified ? ", verified" : ""}). Your unique member account links every application to you.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {step === questionStep ? (
            <div className="space-y-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-bright">Your answers</p>
                  <h2 className="mt-1.5 font-display text-xl font-semibold text-snow">Tell us your story.</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Required questions are marked. You can review everything before submitting.
                  </p>
                </div>
                <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] text-muted sm:inline">
                  {questions.filter((question) => question.required).length} required
                </span>
              </div>

              <div className="space-y-6">
                {questions.map((question, index) => {
                  const value = answers[question.id];
                  const error = errors[question.id];
                  const describedBy = `${question.id}-desc ${error ? `${question.id}-error` : ""}`.trim();
                  return (
                    <div key={question.id} className="scroll-mt-24" id={`question-${question.id}`}>
                      <div className="mb-2 flex items-start gap-2.5">
                        <span className="mt-0.5 font-mono text-[10px] text-muted">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <label
                            htmlFor={`question-input-${question.id}`}
                            className="block text-[13px] font-medium leading-snug text-snow"
                          >
                            {question.title}
                            {question.required ? <span className="ml-1 text-rose-300">*</span> : null}
                          </label>
                          {question.description ? (
                            <p id={`${question.id}-desc`} className="mt-0.5 text-[11px] leading-relaxed text-muted">
                              {question.description}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {question.type === "LONG_TEXT" ? (
                        <>
                          <textarea
                            id={`question-input-${question.id}`}
                            className={`textarea ${error ? "input-error" : ""}`}
                            placeholder={question.placeholder}
                            value={typeof value === "string" ? value : ""}
                            onChange={(event) => setAnswer(question.id, event.target.value)}
                            maxLength={4000}
                            aria-invalid={Boolean(error)}
                            aria-describedby={describedBy}
                            rows={6}
                          />
                          <div className="mt-1 flex items-center justify-between">
                            {error ? (
                              <p id={`${question.id}-error`} className="form-error">{error}</p>
                            ) : (
                              <span />
                            )}
                            <span className="text-[9.5px] text-muted">
                              {typeof value === "string" ? value.length : 0}/4000
                            </span>
                          </div>
                        </>
                      ) : question.type === "SELECT" ? (
                        <>
                          <select
                            id={`question-input-${question.id}`}
                            className={`select ${error ? "input-error" : ""}`}
                            value={typeof value === "string" ? value : ""}
                            onChange={(event) => setAnswer(question.id, event.target.value)}
                            aria-invalid={Boolean(error)}
                            aria-describedby={describedBy}
                          >
                            <option value="">{question.placeholder || "Choose an option…"}</option>
                            {question.options.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                          {error ? <p id={`${question.id}-error`} className="form-error">{error}</p> : null}
                        </>
                      ) : question.type === "RADIO" ? (
                        <div
                          role="radiogroup"
                          aria-label={question.title}
                          aria-describedby={describedBy}
                          aria-invalid={Boolean(error)}
                          className="space-y-2"
                        >
                          {question.options.map((option) => (
                            <label
                              key={option}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-[12.5px] transition ${
                                value === option
                                  ? "border-brand/50 bg-brand/10 text-snow"
                                  : "border-white/8 bg-white/[0.02] text-mist hover:border-white/15 hover:bg-white/[0.035]"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                value={option}
                                checked={value === option}
                                onChange={() => setAnswer(question.id, option)}
                                className="h-4 w-4"
                              />
                              <span>{option}</span>
                              {value === option ? <CheckIcon size={14} className="ml-auto text-brand-bright" /> : null}
                            </label>
                          ))}
                          {error ? <p id={`${question.id}-error`} className="form-error">{error}</p> : null}
                        </div>
                      ) : question.type === "CHECKBOX" ? (
                        <div
                          role="group"
                          aria-label={question.title}
                          aria-describedby={describedBy}
                          className="grid gap-2 sm:grid-cols-2"
                        >
                          {question.options.map((option) => {
                            const list = Array.isArray(value) ? value : [];
                            const checked = list.includes(option);
                            return (
                              <label
                                key={option}
                                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3.5 text-[12px] transition ${
                                  checked
                                    ? "border-brand/50 bg-brand/10 text-snow"
                                    : "border-white/8 bg-white/[0.02] text-mist hover:border-white/15 hover:bg-white/[0.035]"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleCheckbox(question.id, option)}
                                  className="h-4 w-4 rounded"
                                />
                                <span>{option}</span>
                              </label>
                            );
                          })}
                          {error ? <p id={`${question.id}-error`} className="form-error sm:col-span-2">{error}</p> : null}
                        </div>
                      ) : question.type === "YES_NO" ? (
                        <div
                          role="radiogroup"
                          aria-label={question.title}
                          aria-describedby={describedBy}
                          className="flex gap-2"
                        >
                          {["Yes", "No"].map((option) => (
                            <label
                              key={option}
                              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border p-3.5 text-[12.5px] transition ${
                                value === option
                                  ? "border-brand/50 bg-brand/10 text-snow"
                                  : "border-white/8 bg-white/[0.02] text-mist hover:border-white/15"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                value={option}
                                checked={value === option}
                                onChange={() => setAnswer(question.id, option)}
                                className="h-4 w-4"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                          {error ? <p id={`${question.id}-error`} className="form-error">{error}</p> : null}
                        </div>
                      ) : (
                        <>
                          <input
                            id={`question-input-${question.id}`}
                            type={question.type === "EMAIL" ? "email" : "text"}
                            inputMode={question.type === "NUMBER" ? "decimal" : undefined}
                            className={`input ${error ? "input-error" : ""}`}
                            placeholder={question.placeholder}
                            value={typeof value === "string" ? value : ""}
                            onChange={(event) => setAnswer(question.id, event.target.value)}
                            maxLength={question.type === "NUMBER" ? 30 : 500}
                            aria-invalid={Boolean(error)}
                            aria-describedby={describedBy}
                          />
                          {error ? <p id={`${question.id}-error`} className="form-error">{error}</p> : null}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === reviewStep ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-bright">Review</p>
              <h2 className="mt-1.5 font-display text-xl font-semibold text-snow">One last look.</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Check your answers carefully. Once submitted, they are locked and attached to reference number
                generation.
              </p>

              <dl className="mt-6 divide-y divide-white/7 overflow-hidden rounded-2xl border border-white/8">
                {config.positionsEnabled ? (
                  <div className="flex flex-col gap-1 bg-white/[0.025] px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Team</dt>
                    <dd className="text-[12.5px] font-medium text-snow sm:text-right">{position || "—"}</dd>
                  </div>
                ) : null}
                {config.collectDiscord && (discordUsername || discordId) ? (
                  <div className="flex flex-col gap-1 bg-white/[0.025] px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Discord</dt>
                    <dd className="text-[12.5px] text-snow sm:text-right">
                      {discordUsername || "—"}
                      {discordId ? <span className="block font-mono text-[10px] text-muted">ID {discordId}</span> : null}
                    </dd>
                  </div>
                ) : null}
                {questions.map((question) => {
                  const value = answers[question.id];
                  return (
                    <div key={question.id} className="px-4 py-3.5">
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">
                        {question.title}
                      </dt>
                      <dd className="mt-1.5 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-snow">
                        {Array.isArray(value) ? (
                          value.length > 0 ? (
                            <span className="flex flex-wrap gap-1.5">
                              {value.map((item) => (
                                <span key={item} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-mist">
                                  {item}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-muted">Not answered</span>
                          )
                        ) : (
                          displayAnswer(question, value)
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-4">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-0.5 h-4 w-4"
                  required
                />
                <span className="text-[11.5px] leading-relaxed text-mist">
                  I confirm these answers are mine and final. I understand that I can&apos;t edit them after submitting,
                  and that internal reviewer notes will never be shown to me.
                </span>
              </label>
            </div>
          ) : null}

          <div className="mt-7 flex flex-col-reverse gap-2.5 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {step > 0 ? (
                <button type="button" onClick={goBack} className="btn btn-ghost btn-sm" disabled={working}>
                  <ArrowLeftIcon size={14} />
                  Back
                </button>
              ) : (
                <span className="hidden text-[10px] text-muted sm:inline-flex sm:items-center sm:gap-1.5">
                  <LockIcon size={11} />
                  Your answers are private to authorized reviewers
                </span>
              )}
            </div>
            {step < reviewStep ? (
              <button type="button" onClick={goNext} className="btn btn-primary">
                Continue
                <ArrowRightIcon size={15} />
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={working || !confirmed}>
                {working ? <Spinner size={15} /> : <CheckCircleIcon size={15} />}
                {working ? "Submitting…" : "Submit application"}
              </button>
            )}
          </div>
        </div>

        <aside className="hidden space-y-4 lg:block">
          <div className="card p-4">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-muted">Application checklist</p>
            <ul className="mt-3 space-y-2.5">
              {[
                { label: "Choose your team", done: position || !config.positionsEnabled },
                { label: "Answer the questions", done: questions.every((q) => !q.required || isAnswered(answers[q.id])) },
                { label: "Review & submit", done: false },
              ].map((item, index) => (
                <li key={item.label} className="flex items-center gap-2.5 text-[11px]">
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[9px] ${
                      item.done
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                        : "border-white/10 bg-white/[0.03] text-muted"
                    }`}
                  >
                    {item.done ? <CheckIcon size={10} /> : index + 1}
                  </span>
                  <span className={item.done ? "text-mist" : "text-muted"}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-snow">
              <HashIcon size={12} className="text-brand-bright" />
              What you&apos;ll get
            </p>
            <ul className="mt-2.5 space-y-2 text-[10.5px] leading-relaxed text-muted">
              <li className="flex gap-2"><CheckCircleIcon size={12} className="mt-0.5 shrink-0 text-emerald-300" /> A unique TC reference number</li>
              <li className="flex gap-2"><ClockIcon size={12} className="mt-0.5 shrink-0 text-cyan-300" /> Live status + full history</li>
              <li className="flex gap-2"><ClipboardIcon size={12} className="mt-0.5 shrink-0 text-brand-bright" /> Published reviewer feedback</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[linear-gradient(140deg,rgba(139,92,246,0.12),rgba(59,130,246,0.04))] p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-snow">
              <SparklesIcon size={12} className="text-brand-bright" />
              A small tip
            </p>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-mist">
              Specifics beat adjectives. Tell us what you&apos;ve actually built, moderated, or shipped — the team reads
              every word.
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}
