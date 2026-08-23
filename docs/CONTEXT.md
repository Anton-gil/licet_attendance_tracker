# Project context

A single-page-of-truth for picking this project back up cold — new session, new
collaborator, or just you after a few weeks away. For the product spec itself, read
`docs/spec.md` (long — read only the sections you need) and `CLAUDE.md` (the ten hard
invariants — read all of it, it's short). This file is about *state*: what exists, what
doesn't, what's live, what's still open.

Last updated: 2026-08-23 (after the P0 security audit + P1 disclaimers/electives work).

---

## 1. What this is

An attendance **estimator** (never a record — the college portal is truth) for LICET
students, built as a personal/small-scale project by one student for their section and
anyone else who wants to use it. Next.js App Router + Drizzle + Supabase, intended for
Vercel.

The two documents that govern everything:
- `docs/spec.md` — the full product spec (v7), sections 0–20. Timetable format, academic
  calendar, attendance math, extraction pipeline (v2), open product decisions.
- `CLAUDE.md` — ten hard invariants, resolved decisions, forbidden patterns. Read this
  before touching attendance math, the date resolver, or anything server-side that
  queries student data.

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | Server actions, RSC |
| ORM | Drizzle (`postgres` driver) | Lighter cold starts than Prisma on serverless |
| DB / Auth / Storage | Supabase | Postgres + RLS + Auth in one |
| Styling | Tailwind v4 | No component library — plain utility classes |
| Tests | Vitest | Fast, no DB needed for the vast majority of tests |
| Package manager | npm | — |

---

## 3. Live infrastructure

**Supabase project**: `myqqokkkrjlwlxdbdpqk` (region `ap-south-1`). Real project, real
data — not a sandbox.

- All 17 tables migrated, RLS enabled on every one, 24 policies active.
- Calendar seeded: 134 `academic_calendar` rows for track `II-III`, academic year
  `2026-27` (see §7 below — **81 instruction days, not 88** — this is intentional, not a
  bug).
- Auth: email+password, "Confirm email" is ON for this project (verified live) — signup
  requires clicking a confirmation email before a session is issued.

**GitHub**: `https://github.com/Anton-gil/licet_attendance_tracker` — ⚠️ **currently
public**. Was supposed to be private; fix pending (repo → Settings → Danger Zone →
Change visibility). No secrets have ever been committed (verified by searching full git
history for the actual credential strings), so there's no active leak, but this should
still get fixed.

**Local git**: identity is repo-scoped (`Anton-gil <devarjun.28ad@licet.ac.in>`), not
global. Two commits on `master`, both pushed and verified against the remote via
`git ls-remote` (not just trusted local tracking state).

---

## 4. Environment variables

See `.env.example` for the full annotated list. `.env.local` (gitignored, holds real
values) currently has:

| Var | Status |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Set (new-style `sb_publishable_...` key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Set (new-style `sb_secret_...` key) |
| `DATABASE_URL` | Set — **transaction pooler** (`:6543`), correct for app runtime |
| `OPENROUTER_API_KEY` | Not set — only needed for v2 extraction pipeline |
| `RESEND_API_KEY` | Not set — still on Supabase's rate-limited built-in sender (P1 item 8) |

Note on `DATABASE_URL`: for one-off admin operations (`drizzle-kit migrate`, `db:seed`),
use the **session pooler** (`:5432`) instead — pgbouncer's transaction mode is
unreliable for the multi-statement DDL those commands run. Override inline:
`DATABASE_URL='...:5432/postgres' npx drizzle-kit migrate`.

---

## 5. Repository layout

```
CLAUDE.md                    Hard invariants — read before touching attendance math/RLS
docs/spec.md                 Full product spec (v7)
docs/CONTEXT.md              This file
.env.example                 Annotated env var template (no secrets)

drizzle.config.ts            Drizzle Kit config — needs DATABASE_URL
vitest.config.ts             Test config, "@/*" alias -> src/
middleware.ts                Supabase session refresh, runs on every request

src/config/college.ts        Hardcoded COLLEGE + ODD_SEM_2026 constants (spec §1)
src/lib/disclaimers.ts        Exact copy strings from spec §10, one place to audit

src/db/
  schema.ts                  All 17 tables + RLS policies (pgPolicy, inline)
  index.ts                   Drizzle client (pooled connection, prepare:false)
  migrations/                4 migrations, applied to the live DB
  seed/
    calendar-data.ts         Holiday list + instruction/SEPE/SEE date ranges
    build-calendar-rows.ts   Pure: classifies each date -> a calendar row
    assert-calendar.ts       Build-time check (wired into `npm run build`) —
                              no DB needed, pure arithmetic against calendar-data.ts
    seed.ts                  DB-writing seed script (npm run db:seed)

src/lib/date/                 THE date resolver — spec §7.2/§7.4
  types.ts                   DateResolution, ResolverContext, etc.
  ist.ts                     todayIST(), isoWeekday() — the only clock read allowed
  resolve-date-core.ts       Pure fallback chain (6 steps) — fully unit tested
  resolve-date.ts            DB-backed wrapper, single-date lookups

src/lib/attendance/           The attendance engine — spec §6, §11, §19
  types.ts                   ResolvedDay (now carries .confidence), PeriodStats, etc.
  compute.ts                 The date-loop aggregator (OD toggle applied here)
  resolve-days.ts            Bulk pure day-resolution + findMembershipForDate +
                              hasUncertainConfidence — the §20 "group per date" trap
                              lives here, tested directly
  for-student.ts              DB-backed orchestrator: loadBundle() (all queries) +
                              getStudentDashboardData() (past days -> attendance,
                              future days -> remaining period tally)
  recovery.ts                 canMissBuffer/canMissBudget/recover — §19.1/§11 formulas
  risk.ts                    below/fragile/comfortable classification
  electives.ts                DB-backed: findUnresolvedElectiveGroupIds
  unresolved-elective-group-ids.ts   Pure set-difference (mandatory elective gate)
  *.test.ts                  Colocated tests for everything pure above

src/lib/auth/
  require-student.ts          requireStudent() — every protected page starts here;
                              auto-creates the student row on first login
  require-group-membership.ts DB-backed: throws if student isn't in groupId
  is-member-of-group.ts       Pure predicate (split out so it's DB-free to test)
  licet-domain.ts             isLicetEmail()

src/lib/supabase/
  client.ts / server.ts       Anon-key clients (browser / server component) — RLS applies
  middleware.ts               Session-refresh logic used by root middleware.ts
  service-role.ts             Bypasses RLS — currently UNUSED (nothing imports it yet)

src/lib/admin/auth.ts         Crude cookie-based admin gate (sha256 of ADMIN_PASSWORD)

src/fixtures/
  golden-timetable.ts          The spec §2 reference timetable (40 periods/week)
  golden-timetable.test.ts     Checks it sums to 40, course codes merge correctly
  golden-semester.test.ts      END-TO-END: real calendar seed x golden timetable
                              through the real date loop. THE regression test —
                              if this goes red, the date loop is wrong.

src/app/
  page.tsx                    Root: redirect to /dashboard or /auth/login
  layout.tsx                  AppNav + Footer wrap every page
  footer.tsx / app-nav.tsx

  auth/
    login/, signup/            Email+password, LICET domain enforced client-side
    forgot-password/, reset-password/
    callback/route.ts          Handles both signup confirmation AND password recovery
                              (generic `next` param)
    actions.ts                 signOut()

  onboarding/
    page.tsx                   Find-or-create-section (race-safe)
    actions.ts                  joinOrCreateGroup — sets student.semesterStartDate +
                              academicGroup.wefDate on first join
    timetable/                  Manual 5x8 grid builder, per-cell autosave
      actions.ts                 saveCell/finishTimetable — NOW auth+membership gated
                              (P0 audit fix — these had ZERO auth check originally)
    electives/                  Elective picker
      actions.ts                 saveElectiveChoices — NOW validates electiveGroupId
                              belongs to student's own group (P0 audit fix)

  attendance/
    page.tsx                    Day view: prev/next nav, mark present/absent/OD,
                              personal calendar override control — all inline
    period-marker.tsx           Client component, writes DIRECTLY to Supabase
                              (browser, RLS-protected, not through a server action)
    date-override-control.tsx   Same direct-write pattern, calendar_override

  dashboard/
    page.tsx                    Overall %, OD toggle, per-course list. Redirects to
                              /onboarding/electives if any elective unresolved.
    course/[code]/page.tsx      Recovery calculator + budget formula, full disclaimer
    actions.ts                  setIncludeOdAsPresent

  feedback/                    Bug reports + upvotable feature requests
  admin/                       Crude password-gated: groups, bug reports, feature reqs
```

---

## 6. Data model (17 tables)

`academic_group`, `student`, `group_membership` — groups/enrollment, membership has
validity ranges (never use "current group," always resolve per date).

`course`, `course_variant`, `elective_group`, `elective_option`,
`student_elective_choice`, `timetable_entry` — the timetable. Courses key on **code**,
never display name (`CS24512` theory+lab = one course, verified by
`golden-semester.test.ts`).

`calendar_track`, `academic_calendar`, `calendar_override`, `override_confirmation` —
the calendar. Tracks are data, not hardcoded. Overrides: personal (instant, RLS-writable
by the student directly) vs group (needs 2 confirmations, currently unimplemented — v2).

`attendance_exception` — **the only attendance table with rows**. Present is never
stored. Has CHECK constraints (`period_range`, `sane_date`) added in the P0 audit since
writes come directly from the browser with no server route validating them.

`bug_report`, `feature_request`, `feature_vote` — feedback loop.

Full column-level detail: read `src/db/schema.ts` directly, it's well-commented and is
the actual source of truth (this doc will drift, the schema can't).

---

## 7. Known-correct numbers (memorize these, they catch regressions fast)

From the golden semester fixture (`src/fixtures/golden-semester.test.ts`), Jul 1 – Oct
31, zero absences:

- **81** instruction days (not 88 — the 7 working Saturdays aren't seeded, see §9)
- **648** total periods (81 × 8)
- Weekday distribution: **Mon 15, Tue 16, Wed 17, Thu 18, Fri 15** — matches spec §20's
  own worked example exactly
- `FC24501` (UHVSL, 1/week): **15** periods all semester
- `CS24512` (theory+lab merged): **96** periods
- `AD24412` (theory+lab merged): **99** periods
- `648 = 599 (sum of all courses) + 49 (Other: ABSL+MENTORING)` — **not** `per-course sum
  == 648`. An earlier smoke-test checklist got this wrong; the spec (§3) is explicit that
  ABSL/Mentoring never get a course entry.

---

## 8. Architecture decisions worth knowing before you write more server code

**RLS only protects browser-direct writes.** The Drizzle client (`src/db/index.ts`) uses
a privileged connection that bypasses RLS entirely — this is CLAUDE.md invariant 9,
rewritten during the P0 audit to say this explicitly. RLS is real and enforced (verified
against the live project: unauthenticated anon-key requests get 0 rows everywhere), but
it only matters for the handful of tables written directly from the browser via
`@supabase/supabase-js`:

- `attendance_exception` (marking present/absent/OD)
- `calendar_override`, scope=`student` only (personal overrides)
- `student_elective_choice`

Everything else — timetable builder, group creation, admin actions — goes through
Drizzle in server actions, which means **every one of those queries must scope by
studentId/groupId explicitly in code**. Nothing structural catches an unscoped one.

**The P0 audit found two real bugs from exactly this class**, both fixed:
1. `saveCell`/`finishTimetable` (timetable builder) had **no auth check at all** —
   callable by anyone.
2. `saveElectiveChoices` required login but never validated the submitted
   `electiveGroupId` belonged to the student's own group (cross-section write).

Fix pattern: `requireGroupMembership(studentId, groupId)` in
`src/lib/auth/require-group-membership.ts`. **Use this in any new server action that
receives a groupId (or anything scoped to one) from the client.**

**Pure/DB-backed splitting.** Several modules got split into a pure file (unit-testable,
no imports that touch the DB) and a thin DB-backed wrapper, specifically because mixing
them means importing the pure logic for a test drags in `src/db/index.ts`, which throws
if `DATABASE_URL` isn't set. The pattern, repeated three times so far:
- `resolve-date-core.ts` (pure) vs `resolve-date.ts` (DB)
- `is-member-of-group.ts` (pure) vs `require-group-membership.ts` (DB)
- `unresolved-elective-group-ids.ts` (pure) vs `electives.ts` (DB)

Follow this pattern for anything new with meaningful logic beyond "run a query."

**`server-only` package doesn't work under plain `tsx`/`node`.** It resolves via the
`"react-server"` export condition, which only Next.js's own compiler sets. Any one-off
script that imports something with `import "server-only"` in its chain (e.g.
`for-student.ts`) needs `node --conditions=react-server --import tsx <script>`, not
plain `npx tsx <script>`.

---

## 9. Deliberate gaps (not bugs)

- **The 7 working Saturdays are not seeded.** They don't appear in the calendar PDF's
  text layer — only as the gap between printed monthly totals and a plain Mon–Fri week.
  Has to be read off the PDF's shading by eye. Currently: 81 instruction days seeded
  instead of the correct 88. The date resolver's fallback chain handles the gap
  correctly (an unseeded Saturday just isn't in `COLLEGE.workingDays`, so it resolves as
  non-instruction) — this is honestly low, not wrong. When the real dates land, update
  `calendar-data.ts` **and** deliberately update the golden fixture's expected numbers
  (81→88, 648→704, etc.) — don't leave stale numbers passing by accident.
- **FY and IV tracks have no calendar rows.** Only `II-III` is seeded (it's the only
  track with a known commencement date and printed totals in the spec). Students in
  those years fall through to the "borrowed" step of the resolver — verified live, see
  §7 of the audit trail below.

---

## 10. Testing

58 tests, all passing, all fast (~300ms), **none require a database** — this is
deliberate. The handful of things that genuinely need the live DB (cross-student RLS
isolation, mandatory-elective blocking, confidence-disclaimer triggering) were verified
with **one-off scripts run against the real Supabase project during development**, then
deleted — not left as permanent tests, because a test suite that needs live credentials
to run isn't portable. If you need to re-verify one of these, the pattern is:

```ts
import "@/lib/load-env";                 // loads .env.local
import { createClient } from "@supabase/supabase-js";
// ...admin.auth.admin.createUser() to make real test accounts,
// exercise the real production function,
// then delete everything you created.
```

Run with `node --conditions=react-server --import tsx <script>.ts` if it touches
anything importing `server-only`.

Commands:
```bash
npm test                 # vitest run
npm run assert:calendar  # pure, no DB — wired into `npm run build`
npm run db:generate      # after schema.ts changes
npm run db:migrate       # apply to DATABASE_URL (use session pooler)
npm run db:seed          # seed calendar (use session pooler)
```

---

## 11. Status against the spec's own v1 build order (§8)

| # | Item | Status |
|---|---|---|
| 1 | Auth + group/membership schema + RLS | ✅ |
| 2 | Hardcoded `COLLEGE` config | ✅ |
| 3 | Academic calendar (seeded, II-III only) | ✅ (partial — see §9) |
| 4 | Date resolver | ✅ |
| 5 | Manual timetable builder | ✅ |
| 6 | Elective setup | ✅ (now mandatory before dashboard) |
| 7 | Exception-only attendance (day view) | ✅ (calendar **month grid** not built — day-view nav substitutes) |
| 8 | Personal calendar overrides | ✅ |
| 9 | Course-wise + overall %, OD toggle | ✅ |
| 10 | Recovery calculator | ✅ |
| 11 | Disclaimers | ✅ |
| 12 | Bug reports + feature requests | ✅ |
| 13 | Crude admin page | ✅ |

v2 (upload/OCR, crowd verification, group overrides, PWA, simulator, OD workflow, risk
alerts): not started, by design (spec explicitly sequences these after v1).

---

## 12. Open work queue

**P1 remaining** (from the last planning pass — needs a human at a keyboard with a real
inbox, can't be done unattended):
7. Click through the real email flows in a browser: signup confirmation, forgot
   password, resend-if-expired. API-level testing already confirmed the mechanics work;
   never manually verified the actual click-through.
8. Wire Resend (Supabase's built-in sender is rate-limited to a handful/hour).
9. Two-account RLS check specifically on `attendance_exception` — sign in as two real
   students, confirm B can't read A's marks. (The group-membership audit proved the
   *authorization* layer with two live accounts; this is the *RLS* layer specifically,
   still unverified with real signed-in sessions rather than the anon-key check already
   done.)

**P2** (real feature gaps):
10. Month-grid calendar view (spec §11 calls this "primary" — day-view nav is a
    stand-in). Tap-to-override, long-press-drag ranges, undo everything, show affected
    subjects before committing (spec §7.6).
11. Seed the real 7 working Saturdays (needs the PDF, see §9 above).
12. Account deletion (spec §17 privacy requirement — must actually delete).

**P3** (before wider exposure):
- Global error boundary with auto-attached stack (§15)
- Day-order-change notification (§20)
- Bug report screenshot upload (column exists, no UI)
- Admin auth rate limiting (currently one shared password, unlimited attempts)

**Open product decisions** (not code — need real college-policy verification at the
mid-September Attendance Verification, per spec):
- §19.3: overall = total-periods (current) vs mean-of-courses
- §19.4: does `CS24512` theory+lab actually combine on the official portal (current
  assumption: yes)
- CAT-1/CAT-2 weeks: instruction or not (current default: instruction)

---

## 13. If you're an AI picking this up cold

1. Read `CLAUDE.md` in full — it's short and the invariants are non-negotiable.
2. Skim this file's §5 (layout) and §8 (architecture decisions) before writing anything
   that touches the DB.
3. Run `npm test` first — 58 passing is the baseline; if it's not, something's broken
   before you start.
4. Check `git log --oneline` and `git status` before assuming anything about what's
   committed vs. in-progress.
5. `.env.local` has real, live credentials — never print it, never suggest committing
   it, and treat anything you do against `DATABASE_URL` as touching production data (it
   is production data, there's no staging environment).
