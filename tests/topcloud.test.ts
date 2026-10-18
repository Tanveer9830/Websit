import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { answers, applications, auditLogs, users } from "@/db/schema";
import * as loginRoute from "@/app/api/auth/login/route";
import * as registerRoute from "@/app/api/auth/register/route";
import * as logoutRoute from "@/app/api/auth/logout/route";
import * as meRoute from "@/app/api/me/route";
import * as passwordRoute from "@/app/api/account/password/route";
import * as formRoute from "@/app/api/form/route";
import * as applicationsRoute from "@/app/api/applications/route";
import * as applicationDetailRoute from "@/app/api/applications/[id]/route";
import * as adminApplicationsRoute from "@/app/api/admin/applications/route";
import * as adminApplicationDetailRoute from "@/app/api/admin/applications/[id]/route";
import * as adminStatusRoute from "@/app/api/admin/applications/[id]/status/route";
import * as adminNotesRoute from "@/app/api/admin/applications/[id]/notes/route";
import * as adminFeedbackRoute from "@/app/api/admin/applications/[id]/feedback/route";
import * as adminQuestionsRoute from "@/app/api/admin/questions/route";
import * as adminQuestionRoute from "@/app/api/admin/questions/[id]/route";
import * as adminReorderRoute from "@/app/api/admin/questions/reorder/route";
import * as adminPublishRoute from "@/app/api/admin/questions/publish/route";
import * as adminMembersRoute from "@/app/api/admin/members/route";
import * as adminRoleRoute from "@/app/api/admin/members/[id]/role/route";
import * as adminMemberStatusRoute from "@/app/api/admin/members/[id]/status/route";
import * as adminAuditRoute from "@/app/api/admin/audit/route";
import { answersForForm, runSeed, TestClient, type PublicForm } from "./helpers";

const OWNER_PASSWORD = "Owner-Pass-2026";
const MEMBER_PASSWORD = "MemberPass123";
const OTHER_PASSWORD = "OtherMember123";
const REVIEWER_PASSWORD = "ReviewerPass2026";

const owner = new TestClient("10.10.0.1");
const member = new TestClient("10.10.0.2");
const other = new TestClient("10.10.0.3");
const rateLimited = new TestClient("10.10.0.99");

let ownerId = "";
let memberId = "";
let otherId = "";
let applicationId = "";
let applicationReference = "";
let renamedQuestionId = "";
let newQuestionId = "";

describe("Top Cloud — security and workflow integration", () => {
  it("1. seeds exactly one owner with an Argon2id temporary password", async () => {
    const owners = await db.select().from(users).where(eq(users.role, "OWNER"));
    expect(owners).toHaveLength(1);
    const seeded = owners[0]!;
    ownerId = seeded.id;
    expect(seeded.username).toBe("admin");
    expect(seeded.passwordHash).toMatch(/^\$argon2id\$/);
    expect(seeded.mustChangePassword).toBe(true);
    expect(seeded.isDisabled).toBe(false);
    expect(seeded.emailVerifiedAt).not.toBeNull();

    const bootstrap = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "OWNER_BOOTSTRAP"));
    expect(bootstrap).toHaveLength(1);
    expect(bootstrap[0]!.targetId).toBe(seeded.id);
  });

  it("2. forces the seeded owner to replace the temporary password before admin access", async () => {
    const login = await owner.post(loginRoute.POST, "/api/auth/login", {
      identifier: "admin",
      password: "admin",
    });
    expect(login.status).toBe(200);
    expect(login.data.user.mustChangePassword).toBe(true);
    expect(login.data.redirect).toBe("/admin/change-password");

    const blocked = await owner.get(adminApplicationsRoute.GET, "/api/admin/applications");
    expect(blocked.status).toBe(403);
    expect(blocked.data.error.code).toBe("PASSWORD_CHANGE_REQUIRED");

    const changed = await owner.post(passwordRoute.POST, "/api/account/password", {
      currentPassword: "admin",
      newPassword: OWNER_PASSWORD,
    });
    expect(changed.status).toBe(200);
    expect(changed.data.redirect).toBe("/admin");

    const relogin = await owner.post(loginRoute.POST, "/api/auth/login", {
      identifier: "admin",
      password: OWNER_PASSWORD,
    });
    expect(relogin.status).toBe(200);
    expect(relogin.data.user.mustChangePassword).toBe(false);
    expect(relogin.data.user.id).toBe(ownerId);

    const oldPassword = await owner.post(loginRoute.POST, "/api/auth/login", {
      identifier: "admin",
      password: "admin",
    });
    expect(oldPassword.status).toBe(401);
  });

  it("3. never resets or recreates the owner when the deployment is re-run", async () => {
    const [before] = await db.select().from(users).where(eq(users.id, ownerId));
    const output = runSeed();
    expect(output).toContain("existing owner preserved");
    const [after] = await db.select().from(users).where(eq(users.id, ownerId));

    expect(after!.passwordHash).toBe(before!.passwordHash);
    expect(after!.username).toBe("admin");
    expect(after!.role).toBe("OWNER");
    expect(after!.mustChangePassword).toBe(false);
    expect(await db.select().from(users).where(eq(users.role, "OWNER"))).toHaveLength(1);

    const login = await owner.post(loginRoute.POST, "/api/auth/login", {
      identifier: "admin",
      password: OWNER_PASSWORD,
    });
    expect(login.status).toBe(200);
    expect(login.data.user.mustChangePassword).toBe(false);
  });

  it("4. registers members, issues a session and supports login/logout", async () => {
    const registration = await member.post(registerRoute.POST, "/api/auth/register", {
      username: "starling",
      email: "starling@example.com",
      password: MEMBER_PASSWORD,
    });
    expect(registration.status).toBe(201);
    expect(registration.data.user.role).toBe("MEMBER");
    expect(registration.data.user.mustChangePassword).toBe(false);
    memberId = registration.data.user.id;

    const me = await member.get(meRoute.GET, "/api/me");
    expect(me.status).toBe(200);
    expect(me.data.user.id).toBe(memberId);
    expect(me.data.user.role).toBe("MEMBER");

    const logout = await member.post(logoutRoute.POST, "/api/auth/logout", {});
    expect(logout.status).toBe(200);

    const afterLogout = await member.get(meRoute.GET, "/api/me");
    expect(afterLogout.status).toBe(401);

    const wrongPassword = await member.post(loginRoute.POST, "/api/auth/login", {
      identifier: "starling",
      password: "definitely-wrong-1",
    });
    expect(wrongPassword.status).toBe(401);

    const login = await member.post(loginRoute.POST, "/api/auth/login", {
      identifier: "starling",
      password: MEMBER_PASSWORD,
    });
    expect(login.status).toBe(200);
    expect(login.data.redirect).toBe("/dashboard");
    expect(login.data.user.role).toBe("MEMBER");
  });

  it("5. lets a member submit an application and read their own snapshot", async () => {
    const publicForm = await member.get(formRoute.GET, "/api/form");
    expect(publicForm.status).toBe(200);
    const form = publicForm.data as PublicForm;
    expect(form.form).not.toBeNull();
    expect(form.form!.version).toBe(1);
    expect(form.form!.questions.length).toBeGreaterThan(5);

    const submission = await member.post(applicationsRoute.POST, "/api/applications", {
      position: form.config.positions[1] ?? form.config.positions[0],
      discordUsername: "starling",
      discordId: "123456789012345678",
      answers: answersForForm(form.form),
    });
    expect(submission.status).toBe(201);
    applicationId = submission.data.application.id;
    applicationReference = submission.data.application.reference;
    expect(applicationReference).toMatch(/^TC-\d{4}-[A-Z2-9]{6}$/);
    expect(submission.data.application.status).toBe("PENDING");

    const detail = await member.get(applicationDetailRoute.GET, `/api/applications/${applicationId}`, {
      params: { id: applicationId },
    });
    expect(detail.status).toBe(200);
    expect(detail.data.application.reference).toBe(applicationReference);
    expect(detail.data.application.formVersion).toBe(1);
    expect(detail.data.application.answers).toHaveLength(form.form!.questions.length);
    expect(detail.data.application.feedback).toEqual([]);

    const [stored] = await db.select().from(applications).where(eq(applications.id, applicationId));
    expect(stored!.userId).toBe(memberId);
    expect(stored!.status).toBe("PENDING");
    const snapshots = await db.select().from(answers).where(eq(answers.applicationId, applicationId));
    expect(snapshots).toHaveLength(form.form!.questions.length);
  });

  it("6. blocks a member from reading another member's application", async () => {
    const registration = await other.post(registerRoute.POST, "/api/auth/register", {
      username: "ember",
      email: "ember@example.com",
      password: OTHER_PASSWORD,
    });
    expect(registration.status).toBe(201);
    otherId = registration.data.user.id;

    const forbidden = await other.get(applicationDetailRoute.GET, `/api/applications/${applicationId}`, {
      params: { id: applicationId },
    });
    expect(forbidden.status).toBe(404);
    expect(forbidden.data.error.code).toBe("NOT_FOUND");

    const own = await other.get(meRoute.GET, "/api/me");
    expect(own.status).toBe(200);
    expect(own.data.user.id).toBe(otherId);
  });

  it("7. rejects member attempts to change their own application status", async () => {
    const attempt = await member.post(
      adminStatusRoute.POST,
      `/api/admin/applications/${applicationId}/status`,
      { status: "APPROVED", note: "I approve myself" },
      { params: { id: applicationId } },
    );
    expect(attempt.status).toBe(403);

    const [stored] = await db.select().from(applications).where(eq(applications.id, applicationId));
    expect(stored!.status).toBe("PENDING");
  });

  it("8. blocks members from managing the application form", async () => {
    const list = await member.get(adminQuestionsRoute.GET, "/api/admin/questions");
    expect(list.status).toBe(403);

    const create = await member.post(adminQuestionsRoute.POST, "/api/admin/questions", {
      type: "SHORT_TEXT",
      title: "Should never exist",
      required: true,
      enabled: true,
    });
    expect(create.status).toBe(403);

    const publish = await member.post(adminPublishRoute.POST, "/api/admin/questions/publish", {});
    expect(publish.status).toBe(403);
  });

  it("9. lets the owner build, edit and reorder the dynamic question form", async () => {
    const initial = await owner.get(adminQuestionsRoute.GET, "/api/admin/questions");
    expect(initial.status).toBe(200);
    expect(initial.data.draft.version).toBe(2);
    expect(initial.data.published.version).toBe(1);

    const shortText = initial.data.draft.questions.find(
      (question: { title: string }) => question.title === "What should we call you?",
    );
    expect(shortText).toBeDefined();
    renamedQuestionId = shortText.id;

    const updated = await owner.patch(
      adminQuestionRoute.PATCH,
      `/api/admin/questions/${renamedQuestionId}`,
      {
        type: shortText.type,
        title: "What would you like us to call you?",
        description: shortText.description,
        placeholder: shortText.placeholder,
        required: shortText.required,
        enabled: shortText.enabled,
        options: shortText.options,
      },
      { params: { id: renamedQuestionId } },
    );
    expect(updated.status).toBe(200);
    expect(updated.data.question.title).toBe("What would you like us to call you?");

    const created = await owner.post(adminQuestionsRoute.POST, "/api/admin/questions", {
      type: "RADIO",
      title: "Where do you spend most of your time?",
      description: "This helps us understand your community experience.",
      placeholder: "",
      required: true,
      enabled: true,
      options: ["Discord", "Reddit", "In-game", "Other forums"],
    });
    expect(created.status).toBe(201);
    newQuestionId = created.data.question.id;

    const current = await owner.get(adminQuestionsRoute.GET, "/api/admin/questions");
    const ids = current.data.draft.questions.map((question: { id: string }) => question.id);
    const reordered = [newQuestionId, ...ids.filter((id: string) => id !== newQuestionId)];
    const reorder = await owner.post(adminReorderRoute.POST, "/api/admin/questions/reorder", {
      ids: reordered,
    });
    expect(reorder.status).toBe(200);

    const after = await owner.get(adminQuestionsRoute.GET, "/api/admin/questions");
    expect(after.data.draft.questions[0].id).toBe(newQuestionId);
    expect(after.data.hasUnpublishedChanges).toBe(true);
  });

  it("10. allows an authorized administrator to review applications without granting extra powers", async () => {
    const promotion = await owner.post(
      adminRoleRoute.POST,
      `/api/admin/members/${otherId}/role`,
      { role: "ADMIN", permissions: ["REVIEW_APPLICATIONS"] },
      { params: { id: otherId } },
    );
    expect(promotion.status).toBe(200);
    expect(promotion.data.member.role).toBe("ADMIN");
    expect(promotion.data.member.mustChangePassword).toBe(true);

    const blocked = await other.post(loginRoute.POST, "/api/auth/login", {
      identifier: "ember",
      password: OTHER_PASSWORD,
      admin: true,
    });
    expect(blocked.status).toBe(200);
    expect(blocked.data.user.mustChangePassword).toBe(true);
    expect(blocked.data.redirect).toBe("/admin/change-password");

    const stillBlocked = await other.get(adminApplicationsRoute.GET, "/api/admin/applications");
    expect(stillBlocked.status).toBe(403);
    expect(stillBlocked.data.error.code).toBe("PASSWORD_CHANGE_REQUIRED");

    const password = await other.post(passwordRoute.POST, "/api/account/password", {
      currentPassword: OTHER_PASSWORD,
      newPassword: REVIEWER_PASSWORD,
    });
    expect(password.status).toBe(200);
    expect(password.data.redirect).toBe("/admin");

    const list = await other.get(adminApplicationsRoute.GET, "/api/admin/applications?sort=newest");
    expect(list.status).toBe(200);
    expect(list.data.applications.some((row: { id: string }) => row.id === applicationId)).toBe(true);

    const detail = await other.get(
      adminApplicationDetailRoute.GET,
      `/api/admin/applications/${applicationId}`,
      { params: { id: applicationId } },
    );
    expect(detail.status).toBe(200);
    expect(detail.data.application.applicant.username).toBe("starling");
    expect(detail.data.application.answers.length).toBeGreaterThan(5);

    const questionList = await other.get(adminQuestionsRoute.GET, "/api/admin/questions");
    expect(questionList.status).toBe(403);
    const questionCreate = await other.post(adminQuestionsRoute.POST, "/api/admin/questions", {
      type: "SHORT_TEXT",
      title: "Unauthorized question",
    });
    expect(questionCreate.status).toBe(403);
    const memberList = await other.get(adminMembersRoute.GET, "/api/admin/members");
    expect(memberList.status).toBe(403);
  });

  it("11. persists status changes with admin attribution and a complete history", async () => {
    const reviewing = await other.post(
      adminStatusRoute.POST,
      `/api/admin/applications/${applicationId}/status`,
      { status: "REVIEWING", note: "First pass complete." },
      { params: { id: applicationId } },
    );
    expect(reviewing.status).toBe(200);
    expect(reviewing.data.application.status).toBe("REVIEWING");

    const considering = await owner.post(
      adminStatusRoute.POST,
      `/api/admin/applications/${applicationId}/status`,
      { status: "UNDER_CONSIDERATION", note: "Shortlisted for a follow-up." },
      { params: { id: applicationId } },
    );
    expect(considering.status).toBe(200);
    expect(considering.data.application.status).toBe("UNDER_CONSIDERATION");

    const adminDetail = await owner.get(
      adminApplicationDetailRoute.GET,
      `/api/admin/applications/${applicationId}`,
      { params: { id: applicationId } },
    );
    expect(adminDetail.status).toBe(200);
    const history = adminDetail.data.application.history;
    expect(history.map((entry: { to: string }) => entry.to)).toEqual([
      "PENDING",
      "REVIEWING",
      "UNDER_CONSIDERATION",
    ]);
    expect(history[1].actor).toBe("ember");
    expect(history[2].actor).toBe("admin");
    expect(history[1].note).toBe("First pass complete.");

    const memberDetail = await member.get(applicationDetailRoute.GET, `/api/applications/${applicationId}`, {
      params: { id: applicationId },
    });
    expect(memberDetail.status).toBe(200);
    expect(memberDetail.data.application.status).toBe("UNDER_CONSIDERATION");
    expect(
      memberDetail.data.application.history.map((entry: { status: string }) => entry.status),
    ).toEqual(["PENDING", "REVIEWING", "UNDER_CONSIDERATION"]);

    const [stored] = await db.select().from(applications).where(eq(applications.id, applicationId));
    expect(stored!.status).toBe("UNDER_CONSIDERATION");
  });

  it("12. never leaks internal reviewer notes through member responses", async () => {
    const secret = "INTERNAL-ONLY-do-not-leak-7f4c";
    const note = await other.post(
      adminNotesRoute.POST,
      `/api/admin/applications/${applicationId}/notes`,
      { body: secret },
      { params: { id: applicationId } },
    );
    expect(note.status).toBe(201);
    expect(note.data.note.visibility).toBe("INTERNAL");

    const adminDetail = await other.get(
      adminApplicationDetailRoute.GET,
      `/api/admin/applications/${applicationId}`,
      { params: { id: applicationId } },
    );
    expect(adminDetail.status).toBe(200);
    expect(JSON.stringify(adminDetail.data)).toContain(secret);
    expect(
      adminDetail.data.application.notes.some(
        (entry: { visibility: string; body: string }) => entry.visibility === "INTERNAL" && entry.body === secret,
      ),
    ).toBe(true);

    const feedbackText = "Thanks for applying — we are reviewing your application carefully.";
    const feedback = await other.post(
      adminFeedbackRoute.POST,
      `/api/admin/applications/${applicationId}/feedback`,
      { body: feedbackText },
      { params: { id: applicationId } },
    );
    expect(feedback.status).toBe(201);
    expect(feedback.data.note.published).toBe(true);

    const memberDetail = await member.get(applicationDetailRoute.GET, `/api/applications/${applicationId}`, {
      params: { id: applicationId },
    });
    expect(memberDetail.status).toBe(200);
    const serialised = JSON.stringify(memberDetail.data);
    expect(serialised).not.toContain(secret);
    expect(memberDetail.data.application.notes).toBeUndefined();
    expect(memberDetail.data.application.feedback).toHaveLength(1);
    expect(memberDetail.data.application.feedback[0].body).toBe(feedbackText);
  });

  it("13. rejects unauthorized role changes and protects the owner account", async () => {
    const memberAttempt = await member.post(
      adminRoleRoute.POST,
      `/api/admin/members/${otherId}/role`,
      { role: "MEMBER" },
      { params: { id: otherId } },
    );
    expect(memberAttempt.status).toBe(403);

    const adminAttempt = await other.post(
      adminRoleRoute.POST,
      `/api/admin/members/${memberId}/role`,
      { role: "ADMIN", permissions: ["REVIEW_APPLICATIONS"] },
      { params: { id: memberId } },
    );
    expect(adminAttempt.status).toBe(403);

    const demoteOwner = await owner.post(
      adminRoleRoute.POST,
      `/api/admin/members/${ownerId}/role`,
      { role: "MEMBER" },
      { params: { id: ownerId } },
    );
    expect(demoteOwner.status).toBe(403);
    expect(demoteOwner.data.error.code).toBe("OWNER_PROTECTED");

    const disableOwner = await owner.post(
      adminMemberStatusRoute.POST,
      `/api/admin/members/${ownerId}/status`,
      { disabled: true },
      { params: { id: ownerId } },
    );
    expect(disableOwner.status).toBe(403);
    expect(disableOwner.data.error.code).toBe("OWNER_PROTECTED");

    const invalidOwnerGrant = await owner.post(
      adminRoleRoute.POST,
      `/api/admin/members/${otherId}/role`,
      { role: "OWNER" },
      { params: { id: otherId } },
    );
    expect(invalidOwnerGrant.status).toBe(422);

    const emptyPermissions = await owner.post(
      adminRoleRoute.POST,
      `/api/admin/members/${memberId}/role`,
      { role: "ADMIN", permissions: [] },
      { params: { id: memberId } },
    );
    expect(emptyPermissions.status).toBe(422);

    const [ownerRecord] = await db.select().from(users).where(eq(users.id, ownerId));
    const [reviewerRecord] = await db.select().from(users).where(eq(users.id, otherId));
    expect(ownerRecord!.role).toBe("OWNER");
    expect(reviewerRecord!.role).toBe("ADMIN");
  });

  it("14. keeps historical application snapshots intact after republishing the form", async () => {
    const before = await member.get(applicationDetailRoute.GET, `/api/applications/${applicationId}`, {
      params: { id: applicationId },
    });
    const historicalTitles = before.data.application.answers.map((answer: { question: string }) => answer.question);
    expect(historicalTitles).toContain("What should we call you?");
    expect(before.data.application.formVersion).toBe(1);

    const publish = await owner.post(adminPublishRoute.POST, "/api/admin/questions/publish", {});
    expect(publish.status).toBe(200);
    expect(publish.data.publishedVersion).toBe(2);

    const liveForm = await member.get(formRoute.GET, "/api/form");
    expect(liveForm.status).toBe(200);
    expect(liveForm.data.form.version).toBe(2);
    const liveTitles = liveForm.data.form.questions.map((question: { title: string }) => question.title);
    expect(liveTitles).toContain("What would you like us to call you?");
    expect(liveTitles).toContain("Where do you spend most of your time?");

    const after = await member.get(applicationDetailRoute.GET, `/api/applications/${applicationId}`, {
      params: { id: applicationId },
    });
    expect(after.status).toBe(200);
    expect(after.data.application.formVersion).toBe(1);
    expect(after.data.application.answers.map((answer: { question: string }) => answer.question)).toEqual(
      historicalTitles,
    );
    expect(JSON.stringify(after.data.application.answers)).not.toContain(
      "What would you like us to call you?",
    );
    expect(after.data.application.status).toBe("UNDER_CONSIDERATION");

    const snapshots = await db.select().from(answers).where(eq(answers.applicationId, applicationId));
    expect(snapshots.map((answer) => answer.questionTitle)).toEqual(historicalTitles);

    const freshDraft = await owner.get(adminQuestionsRoute.GET, "/api/admin/questions");
    expect(freshDraft.status).toBe(200);
    expect(freshDraft.data.draft.version).toBe(3);
    expect(freshDraft.data.published.version).toBe(2);
  });

  it("15. records an audit trail and restricts it to permitted admins", async () => {
    const audit = await owner.get(adminAuditRoute.GET, "/api/admin/audit?page=1");
    expect(audit.status).toBe(200);
    expect(audit.data.logs.length).toBeGreaterThan(5);
    const actions = new Set(audit.data.logs.map((log: { action: string }) => log.action));
    expect(actions.has("OWNER_BOOTSTRAP")).toBe(true);
    expect(actions.has("APPLICATION_SUBMITTED")).toBe(true);
    expect(actions.has("APPLICATION_STATUS_CHANGED")).toBe(true);
    expect(actions.has("ADMIN_PROMOTED")).toBe(true);
    expect(actions.has("FORM_PUBLISHED")).toBe(true);

    const serialised = JSON.stringify(audit.data);
    expect(serialised).not.toContain(OWNER_PASSWORD);
    expect(serialised).not.toContain("passwordHash");

    const forbidden = await other.get(adminAuditRoute.GET, "/api/admin/audit");
    expect(forbidden.status).toBe(403);
  });

  it("16. rate-limits repeated failed logins", async () => {
    let lastStatus = 0;
    for (let attempt = 0; attempt < 9; attempt += 1) {
      const response = await rateLimited.post(loginRoute.POST, "/api/auth/login", {
        identifier: "nobody-ratelimit",
        password: `wrong-password-${attempt}`,
      });
      lastStatus = response.status;
    }
    expect(lastStatus).toBe(429);
  });

  it("17. enforces CSRF and origin checks on state-changing requests", async () => {
    const noCsrf = await member.raw(logoutRoute.POST, "/api/auth/logout", {
      method: "POST",
      body: {},
      csrf: false,
    });
    expect(noCsrf.status).toBe(403);
    expect(noCsrf.data.error.code).toBe("CSRF_FAILED");

    const badOrigin = await member.raw(logoutRoute.POST, "/api/auth/logout", {
      method: "POST",
      body: {},
      csrf: true,
      origin: "https://evil.example",
    });
    expect(badOrigin.status).toBe(403);
    expect(badOrigin.data.error.code).toBe("ORIGIN_REJECTED");

    const stillSignedIn = await member.get(meRoute.GET, "/api/me");
    expect(stillSignedIn.status).toBe(200);
    expect(stillSignedIn.data.user.id).toBe(memberId);
  });
});
