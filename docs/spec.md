# College Attendance Tracker — Spec v7 (LICET)

Built for Loyola-ICAM College of Engineering and Technology, Chennai.
Timetable format: **Format No. 8a, Rev. 03** · Academic Calendar: **2026–27 Odd (Jul–Dec 2026)**

**Principle:** the timetable says what *should* happen. The student says what happened *differently*. Everything else is computed.

**Second principle: degrade, never block.** Missing calendar, unknown year, unseeded track, a date nobody has configured — the app keeps working on its best guess and says so quietly. It never shows an error screen because data is incomplete, and it never asks a student to fix something before they can see their attendance.

> **Three decisions in section 19 still change the numbers the app produces** and can't be resolved from the timetable or calendar. OD (19.2) is now settled — see below. The other three are still guesses; check them at the first Attendance Verification.

---

## 0. Changes

**v6 → v7:**

| | v6 | v7 |
|---|---|---|
| OD counting | Recommended default | **Resolved.** OD counts as present; toggle switches to counts-as-absent. No third state. |

**v5 → v6:** calendar fully interactive · two "can miss" formulas identified · OD/overall conventions flagged as open · group resolved per date, not current group · exceptions never subtracted independently · logic traps documented.

**v4 → v5:** degrade-never-block · data-driven tracks · softened copy · calendar-assumption warning.

**v3 → v4:** working Saturdays and day orders · denominator iterates dates · instruction ends ~31 Oct · ABSL/Mentoring carry attendance.

**v2 → v3:** 5-day week · course-code keying · merged-cell expansion · elective regex · OpenRouter · manual entry first.

---

## 1. LICET hardcoded configuration

This never varies across sections. Hardcode it; never ask a student.

```ts
export const COLLEGE = {
  name: "Loyola-ICAM College of Engineering and Technology",
  short: "LICET",
  timezone: "Asia/Kolkata",
  workingDays: [1, 2, 3, 4, 5],          // Mon–Fri
  periodsPerDay: 8,
  periodsPerWeek: 40,
  timetableFormat: "8a-rev03",

  periods: [
    { n: 1, start: "08:00", end: "09:00" },   // 60 min
    { n: 2, start: "09:00", end: "09:50" },
    // BREAK 09:50–10:10
    { n: 3, start: "10:10", end: "11:00" },
    { n: 4, start: "11:00", end: "11:50" },
    { n: 5, start: "11:50", end: "12:40" },
    // LUNCH 12:40–13:30
    { n: 6, start: "13:30", end: "14:20" },
    { n: 7, start: "14:20", end: "15:10" },
    { n: 8, start: "15:10", end: "16:00" },
  ],

  breakAfterPeriod: 2,
  lunchAfterPeriod: 5,
  defaultThreshold: 75,
};

export const ODD_SEM_2026 = {
  academicYear: "2026-27",
  label: "Odd (July–December 2026)",

  // Official working-day counts, from the academic calendar
  workingDaysByMonth: { 7: 24, 8: 22, 9: 22, 10: 20, 11: 5 },
  totalWorkingDays: { "II-III": 93, FY: 79 },

  commencement: { "II-III": "2026-07-01", FY: null, IV: null },  // FY/IV: read from sheet
  sepeBegins:   "2026-11-02",   // practical exams — no regular classes
  studyHoliday: "2026-11-07",
  seeBegins:    "2026-11-16",
  reopening:    "2027-01-04",

  attendanceVerification: ["2026-09-16", "2026-10-14"],  // official checkpoints — verify
};
```

**Saturdays are not optional.** Mon–Fri minus holidays gives 22 / 20 / 20 / 19 for Jul–Oct. The official counts are 24 / 22 / 22 / 20. The gap is **seven working Saturdays** already scheduled, before any rain compensation. Build day orders in v1 or nothing reconciles.

Note the sheet itself prints period 5 as `11:50 AM-12:40 AM` — a typo. Don't validate hard against printed times; read the grid, not the clock.

---

## 2. Course codes are the unit of attendance

The legend on this sheet lists **the same code twice** for integrated courses:

| Code | Legend entries | Weekly periods | Treatment |
|---|---|---|---|
| `AD24412` | DVST **and** DVST Lab | 6 | One course, aggregated |
| `CS24512` | CN **and** CN Lab | 6 | One course, aggregated |
| `PCS2411` | FSWD **and** FSWD Lab | (elective) | One course, aggregated |
| `AD24501` | BDA only | 4 | Separate from AD24521 |
| `AD24521` | BDA Lab only | 3 | Its own course |
| `AD24502` | NNDL only | 4 | Separate from AD24522 |
| `AD24522` | DL Lab only | 3 | Its own course |

So `course` is keyed by `(group_id, code)`. A course carries a list of **display variants** (`DVST`, `DVST Lab`) used only for rendering the grid. All percentage math rolls up to the code.

Getting this wrong splits `CN` into two percentages that both disagree with the official record, and it fails silently — no error, just wrong numbers all semester. This is the highest-risk modelling decision in the app.

### Reference: this section's weekly load

```
AD24501  BDA         Mon8, Tue2, Thu3, Fri1                 = 4
AD24502  NNDL        Tue3, Tue6, Wed7, Thu1                 = 4
GE24501  PMOM        Mon1, Thu2, Fri4                       = 3
AD24412  DVST(+Lab)  Mon6, Wed1, Wed4-5, Thu4, Fri5         = 6
CS24512  CN(+Lab)    Mon7, Tue1, Tue4-5, Thu5, Fri3         = 6
BS24502  LRAT        Tue7, Fri2                             = 2
FC24501  UHVSL       Mon5                                   = 1
AD24521  BDA Lab     Thu6-7-8                               = 3
AD24522  DL Lab      Fri6-7-8                               = 3
PE-1     AE / FSWD   Mon3-4, Tue8, Wed2, Wed6               = 5
ABSL     —           Mon2, Wed3                             = 2
MENTOR   —           Wed8                                   = 1
                                                       TOTAL = 40 ✓
```

Use this as your parser fixture. It is a known-correct golden file.

---

## 3. Slot types

Every timetable cell resolves to one of four kinds:

| Kind | Example | Has code | Overall attendance | Course percentage |
|---|---|---|---|---|
| `course` | `CS24512 [CN]` | yes | yes | yes |
| `elective` | `PAD2401[AE] / PCS2411[FSWD]` | resolves per student | yes | yes |
| `activity` | `ABSL` | no | **yes** | no |
| `admin` | `MENTORING` | no | **yes** | no |

**Confirmed:** ABSL and Mentoring carry attendance. They count toward the overall denominator like any other period, but never produce a subject-wise percentage — there's no code to attach one to.

So the overall denominator is all 40 periods per week. Group them under a single `Other` line on the dashboard so 3 periods a week don't vanish from view; a student absent for both ABSL slots and Mentoring in one week has lost 3 periods of overall attendance with nothing on screen to explain it.

---

## 4. Electives

Detection rule — no judgment needed:

```
/^([A-Z]{2,4}\d{4,5})\s*\[([^\]]+)\]\s*\/\s*([A-Z]{2,4}\d{4,5})\s*\[([^\]]+)\]$/
```

A cell with a `/` between two coded tokens is an elective slot.

On this sheet, `PE-1` has two options:
- `PAD2401` — AI Engineering [AE] — Mr B Anand
- `PCS2411` — Full Stack Web Application and Development [FSWD] — Lt H Bemesha Smitha

The elective spans both theory and lab slots (Mon P3–4 is the FSWD Lab side), so the student's one choice resolves all 5 weekly periods.

Student picks once at onboarding, changeable in settings. Elective slots are **excluded from crowd verification** — they legitimately differ between classmates. Render them as `Elective — you pick yours`.

---

## 5. Data model

```sql
academic_group (
  id, academic_year,            -- '2026-27'
  department, year, section, semester,
  venue,                        -- 'G33'
  class_advisor,
  wef_date date,                -- from sheet: default semester start
  timetable_status,             -- none|extracting|draft|provisional|verified|disputed
  created_by, created_at,
  unique (academic_year, department, year, section, semester)
)

student (
  id references auth.users, name, email, reg_no,
  semester_start_date,          -- defaults to group.wef_date
  threshold default 75,
  count_activity_slots boolean default true
)

group_membership (
  id, student_id, group_id, valid_from date, valid_to date null
)

-- THE unit of attendance
course (
  id, group_id,
  code text,                    -- 'CS24512'
  name text,                    -- 'Computer Networks'
  faculty text,
  unique (group_id, code)
)

-- display only; never used in math
course_variant (
  id, course_id, abbrev,        -- 'CN' | 'CN LAB'
  is_lab boolean, venue         -- 'B22'
)

elective_group (id, group_id, label)             -- 'PE-1'
elective_option (id, elective_group_id, course_id)
student_elective_choice (
  student_id, elective_group_id, course_id,
  primary key (student_id, elective_group_id)
)

timetable_entry (
  id, group_id,
  day_of_week smallint,         -- 1..5
  period smallint,              -- 1..8
  kind text,                    -- course|elective|activity|admin
  course_variant_id null,
  elective_group_id null,
  label null,                   -- 'ABSL' | 'MENTORING'
  block_id uuid null,           -- shared across a merged lab block
  unique (group_id, day_of_week, period)
)

-- official calendar, per track (FY | II-III | IV)
academic_calendar (
  id, academic_year, track text,
  date date,
  kind text,                    -- instruction|holiday|sepe|see|study_holiday|vacation
  day_order smallint null,      -- 1..5 when a Saturday follows a weekday timetable
  label text null,              -- 'Deepavali', 'CAT-1 Begins'
  unique (academic_year, track, date)
)

-- deviations from the official calendar
calendar_override (
  id,
  scope text,                   -- 'student' | 'group'
  student_id null, group_id null,
  date date,
  kind text,                    -- instruction|holiday
  day_order smallint null,
  reason text null,             -- 'rain', 'moon sighting', 'dept event'
  created_by, created_at,
  unique (scope, coalesce(student_id, group_id), date)
)

-- group overrides need corroboration before they apply to everyone
override_confirmation (
  override_id, student_id, created_at,
  primary key (override_id, student_id)
)

-- EXCEPTIONS ONLY. Present is never written.
attendance_exception (
  id, student_id, date date, period smallint,
  status,                       -- absent|od|leave
  od_reason null,
  created_at,
  unique (student_id, date, period)
)
```

`block_id` keeps merged lab blocks together for UI purposes (tap once to mark the whole 3-period lab absent) while each period still counts individually in the math — which is what you want.

Index: `attendance_exception (student_id, date)`.

---

## 6. Attendance math

**Present is the default and is never stored.** Rows exist only for absent / OD / leave.

### The denominator must iterate dates

The v3 formula — `weekly_count × working_days` — is **wrong**, and day orders are why. If five of the seven working Saturdays follow a Wednesday day order, Wednesday's courses gain five extra sessions and Monday's gain none. Multiplying a weekly count by a day count silently redistributes those sessions evenly across every course.

```
for each date d in [semester_start, as_of]:
    resolve d through overrides → official calendar
    skip unless kind = 'instruction'

    group = membership covering d          ← NOT the student's current group
    timetable = group's timetable
    effective_dow = day_order ?? weekday(d)

    for each timetable_entry where day_of_week = effective_dow:
        resolve electives to this student's choice
        exception = lookup(student, d, period)     ← may be absent
        accumulate into denominator[course] and status counts
```

**The loop is the only source of truth.** Never count exceptions independently and subtract — always look them up *from inside* the loop. If you run `SELECT count(*) FROM attendance_exception WHERE student_id = …` and subtract that, then a date later marked as a holiday leaves an orphaned absence row that keeps subtracting from a denominator it's no longer part of, and the percentage silently goes wrong. Intersect, never subtract.

**Keep orphaned exceptions.** Don't delete an absence when its date becomes a holiday — if the day flips back to working, the absence should come back with it.

**Resolve the group per date, not per student.** `group_membership` has validity ranges for a reason. A student who transfers section in September should have July–August computed against their old timetable. Using `student.current_group` for the whole range is wrong, and it's an easy mistake because it looks right until someone transfers.

**OD resolution: settled.** Two states, not three — no "excluded entirely" mode in the product, even though it's listed below for completeness.

```
default   OD counts as present:   numerator = denominator − absent
toggle    OD counts as absent:    numerator = denominator − absent − od
```

The `OD excluded entirely` convention (`(denominator − od) − absent`) is a third option that exists mathematically but is **not implemented** — it produces a percentage that can move in either direction when toggled, which is confusing on its own dashboard. Don't add it later without a specific reason; two clearly-labeled states beat three ambiguous ones.

Same loop produces overall attendance, counting `activity` and `admin` slots but attributing them to no course.

**Cache this per student per day.** It's a loop over ~90 dates × 8 periods — trivial, but it runs on every dashboard load. Memoize keyed on `(student_id, as_of_date, override_version)` and invalidate when an override or the timetable changes.

Storage stays tiny regardless: ~50–150 exception rows per student per semester, no summary tables, no drift. "Assume present from July 1" remains a no-op — zero writes.

Because `AD24412` covers both DVST and DVST Lab, its denominator is naturally 6/week. No special-casing.

### Sanity numbers for this semester

93 official working days for II & III Year, minus the 5 SEPE days (Nov 2–6, practical exams, no regular timetable) = **~88 instruction days × 8 = ~704 periods**. Use this to sanity-check your engine: if a student with zero absences shows anything other than 100%, or the December denominator exceeds ~704, the date loop is wrong.

---

## 7. Academic calendar and day orders

The calendar is not reference data — it is the denominator. Every attendance number in the app is wrong if this is wrong.

### 7.1 Tracks are data, not code

The official calendar runs separate counts per group of years — the Odd 2026 sheet shows **FY** (79 working days) and **II & III Year** (93), with IV Year carrying its own commencement and unit-completion dates. First and second year calendars will land later and may split further.

So don't hardcode three. Make it a table:

```sql
calendar_track (
  id, academic_year, key,        -- 'FY' | 'II-III' | 'IV' | whatever arrives later
  label, applies_to_years int[], -- [2,3]
  source_note,                   -- 'from LICET Odd 2026 PDF, p1'
  confidence                     -- official | partial | inferred
)
```

A group resolves its track by year of study. Adding a new one later is a row, not a deploy.

### 7.2 Fallback chain — the app always renders

Resolution for any date, stopping at the first hit:

```
1. personal override                     → confidence: exact
2. confirmed group override              → confidence: exact
3. official calendar for this track      → confidence: official
4. official calendar for any track       → confidence: borrowed
   in the same academic year
5. Mon–Fri, minus the general LICET       → confidence: inferred
   holiday list
6. Mon–Fri                               → confidence: guessed
```

Nothing in this chain fails. A first-year student who signs up before you've seeded their calendar lands on step 4 or 5, sees numbers immediately, and gets quietly upgraded when the real calendar arrives — no migration, because storage is exception-only and everything recomputes.

**Surface the confidence, don't gate on it.** A small line under the percentage:

> *Working days taken from the II & III Year calendar — your year may differ.*

and a dismissible one-liner when a whole month is inferred. That's it. No modals, no setup wizard, no blocking.

### 7.3 Unknown cases

| Situation | Behaviour |
|---|---|
| No calendar for the track | Borrow another track's, badge it `borrowed` |
| Date past the seeded range | Assume Mon–Fri instruction |
| Working Saturday, day order unknown | **Skip the day.** Guessing wrong adds periods to specific courses and skews them; skipping under-counts everything proportionally, so percentages stay roughly right |
| Holiday not in the seed | Treat as instruction until someone overrides |
| No timetable yet | App runs with zero courses — calendar, notes and settings all work |
| Course code unparseable | Keep it as a course with the raw text as its name |

The pattern throughout: when unsure, prefer the error that spreads evenly over the one that lands on one course.

### 7.4 Day orders

A working Saturday follows some weekday's timetable. The official calendar prints this directly — one November entry reads `Day Order: Wednesday`.

Model it as `day_order` on the calendar row: `1..5`, meaning "run this weekday's timetable today." Resolution is `effective_dow = day_order ?? weekday(date)`, and every consumer — day view, denominator loop, simulator — goes through that one function. Never call `date.getDay()` anywhere else in the codebase.

Day orders also apply to weekday swaps, not just Saturdays. If a Monday is lost to a college event and made up on a later date, that's the same mechanism.

### 7.5 Override scopes

Chennai in October–December means the northeast monsoon, and the calendar says so explicitly:

> *loss of classes due to various extra/co-curricular activities … and due to heavy rains/flooding may be compensated by conducting classes on Saturdays.*

So the printed calendar is a plan, not a record. Expect several deviations a semester: unplanned rain holidays, compensating Saturdays announced days ahead, moon-sighting shifts on Milad-un-Nabi and Muharram, department events that cancel an afternoon.

**Two scopes:**

- **Personal** — takes effect immediately, private, no confirmation. Always available, always wins over everything else. This is the escape hatch that keeps the app usable when reality diverges and nobody has updated anything.
- **Group** — one student proposes, **two more confirm**, then it applies to everyone in the group who hasn't set a personal override for that date. Same pattern as timetable verification, and it means the first person to hear about a rain holiday fixes it for the whole section.

Resolution order: `personal override → confirmed group override → official calendar`.

### 7.6 The calendar is interactive

The published calendar is a starting guess. Every date in the app is editable by the student, in both directions, with no announcement required and no admin involved.

**Any date, two taps:**

```
Sat 12 Sep                            [ Undo ]

  ○ Holiday
  ● Working day  →  follows  [ Wednesday ▾ ]
  ○ Reset to official calendar

  adds: DVST · PE-1 · ABSL · DVST Lab ×2 · PE-1 · NNDL · MENTORING

  [ Just for me ]        [ Tell my class ]
```

Both directions matter equally:

- **Unannounced working Saturday** → mark working, pick the day order. Common in Nov–Dec when the college is making up rain days.
- **Announced holiday that didn't happen** → mark working.
- **Working day that became a holiday** — rain, flooding, a college event, a bandh → mark holiday. Chennai's northeast monsoon makes this routine from October.
- **Festival shifted a day** — moon-sighting holidays especially → move it.

**Interactions:**

- Tap a date in the month grid → the sheet above.
- Long-press and drag → select a range, apply one change to all of it. ("Whole week was flooded.")
- Overridden dates render visibly different from official ones — a dot, a different border — so a student can see at a glance what they've changed.
- **Undo on every change**, and a `Reset to official calendar` on both a single date and the whole month. People will mis-tap.
- Show the effect before committing: which subjects the change adds or removes. A wrong day order is obvious once you see `DVST Lab ×2` appear on a day you know was Thursday.
- Changing a date recomputes instantly — no save button, no reload.

**Two scopes, always visible on the sheet:**

- **Just for me** — instant, private, no confirmation, always wins. This is the escape hatch that keeps the app usable when reality and the calendar diverge and nobody has updated anything.
- **Tell my class** — proposes it to the group; two more students confirm and it applies to everyone who hasn't set their own override for that date. Push to the group on confirmation: *"Sat 12 Sep is now a working day (Wednesday order)."*

**Don't ask permission to be wrong.** If a student marks something the app thinks is a holiday as working, just do it. No "are you sure, the official calendar says…". They're standing in the classroom; the app is reading a PDF from June.

### 7.7 Overrides — resolution

### 7.8 Instruction days vs working days

Not every working day runs the timetable:

| Period | Kind | Timetable runs? |
|---|---|---|
| Jul 1 – ~Oct 31 | `instruction` | yes |
| Nov 2–6 | `sepe` | no — practical exams |
| Nov 7–15 | `study_holiday` | no |
| Nov 16 – Dec | `see` | no — semester end exams |

Only `instruction` days enter the denominator. Counting the 5 SEPE days would inflate every percentage's denominator by 40 periods.

**This is also what keeps the recovery calculator sane.** "Attend the next 28 classes" is nonsense if instruction ends on 31 October and there are twelve periods left. Count remaining `instruction` periods, not calendar days — that's a correctness fix, not a tone one.

But keep the delivery light. It's an estimate off a calendar that may have moved:

> Around 96 periods left before instruction ends (~31 Oct). Attending all of them puts DVST near 71%.

Not a verdict, no instructions, no next steps. Show the number and let them decide.

**CAT weeks are an open question.** CAT-1 and CAT-2 are internal exams counted as working days. Whether the regular timetable runs alongside them is a college practice I can't determine from the sheet — worth finding out, and if it doesn't, mark those dates `kind='exam'` in the seed. Until then they count as instruction, which is the safe default.

### 7.9 Seed data

Ship the calendar pre-loaded. It's one table, it serves every student in the college, and it's the single highest-leverage thing you can do for onboarding — a student who has to enter 93 dates will not use your app.

Known holidays for Odd 2026 (**verify each against the official PDF before seeding** — these are read off a scan):

```
2026-07-31  St Ignatius of Loyola SJ     (Fri)
2026-08-15  Independence Day             (Sat)
2026-08-26  Milad-un-Nabi                (Wed)  ← moon sighting, may shift ±1
2026-09-04  Krishna Jayanthi             (Fri)
2026-09-14  Vinayakar Chathurthi         (Mon)
2026-10-02  Gandhi Jayanthi              (Fri)
2026-10-19  Ayutha Pooja                 (Mon)
2026-10-20  Vijaya Dasami                (Tue)
2026-11-08  Deepavali                    (Sun)
2026-12-25  Christmas                    (Fri)
```

Mark the moon-sighting holidays `is_provisional` in the seed so the UI can prompt: *"Milad-un-Nabi may shift — confirm the date."*

**The seven working Saturdays are not in the PDF's text layer** — they show up only as the gap between the printed monthly totals (24/22/22/20) and a plain Mon–Fri week (22/20/20/19). Read them off the shading by eye and seed them explicitly.

Then assert, **at build time only**, that computed working days match the printed totals per month. That one check regression-tests the whole calendar. At runtime it's a warning on the admin page, never anything a student sees — a mismatched total means your seed is slightly off, not that the app should stop.

Seed what you have, ship, fill in the rest. A partially-seeded calendar is far better than none, and step 4 of the fallback chain covers whatever's missing.

### 7.10 Attendance Verification checkpoints

The calendar schedules **Attendance Verification-I and II** for higher semesters — roughly mid-September and mid-October. These are the days the official record gets checked.

Build a prompt for them:

> **Attendance verification is today.** Compare your official percentage with what's here and fix any gaps — this is the number that counts.

With a two-field form to enter the official overall figure. Store it and show the delta on the dashboard afterwards: *"Your estimate ran 2.1% high at the last verification."* A student who knows the drift direction can use the app properly; one who doesn't will either panic or get complacent.

This is the reconciliation point the app otherwise lacks, and the college schedules it for you twice a semester. Do not skip it.

---

## 8. Build order

### v1 — manual entry only

1. Auth (LICET domain) + group/membership schema + **RLS before any client code**
2. Hardcoded `COLLEGE` config
3. **Academic calendar** — seed Odd 2026 with holidays, the seven working Saturdays and their day orders, SEPE/SEE blocks. Assert monthly totals match 24/22/22/20/5
4. **Date resolver** — one function, `date → {is_instruction, effective_dow}`. Everything downstream calls it
5. **Manual timetable builder** — 5×8 grid, tap a cell, pick or create a course by code
6. Elective setup
7. Exception-only attendance: calendar view, day view, range-mark
8. **Personal calendar overrides** — the escape hatch; ship before group overrides
9. Course-wise + overall percentages (via the date loop), OD toggle
10. Recovery calculator with remaining-instruction-periods feasibility check
11. Disclaimers
12. Bug reports + feature requests
13. Crude admin page

Steps 3 and 4 come before the timetable deliberately. The calendar is the denominator; building attendance math on a naive Mon–Fri week means rewriting it once the first working Saturday lands, and by then students have data.

Manual entry is a day of work, is the permanent fallback for every extraction failure, and lets you validate the entire attendance engine before touching a vision API. Building OCR first means debugging OCR before you know whether your math is right.

**Make manual entry fast**, since it's the primary path at launch: autocomplete codes from other groups in the same department, drag to fill a merged lab block, duplicate-a-day, and a running `38/40` counter that turns green at 40. That counter alone catches most manual mistakes.

### v2 — upload

14. Extraction pipeline (section 9)
15. Crowd verification
16. **Group calendar overrides** with two-confirmation propagation + push
17. **Attendance Verification prompts** (mid-Sep, mid-Oct) with official-figure entry and drift display
18. PWA install + 16:10 reminder
19. Leave simulator
20. OD workflow
21. Risk alerts

---

## 9. Extraction pipeline

```
Upload (PDF/JPG/PNG/HEIC)
  ↓ client: HEIC→JPEG, downscale ~2000px, respect EXIF rotation
Supabase Storage (private)
  ↓ hash → cache hit? reuse, skip to draft
extraction_job (queued)
  ↓ background worker — never the request path
PDF → render 200 DPI
  ↓
Stage 1: LEGEND  → [{code, name, abbrev, faculty, venue, is_lab}]
Stage 2: GRID    → per-cell {raw_text, col_start, col_end, day}
  ↓
Expand colspans → one row per period
Join raw_text → legend by code
Merge duplicate codes into one course + variants
  ↓
Deterministic validation (9.2)
  ↓ pass                    ↓ fail
status=draft            retry → switch model → manual entry (pre-filled)
```

### 9.1 Model calls via OpenRouter

One API surface, built-in fallback. Config:

```ts
{
  models: [
    "google/gemini-2.5-flash",       // primary: cheap, strong on tables
    "anthropic/claude-sonnet-4.5",   // fallback: different failure modes
  ],
  temperature: 0,
  response_format: { type: "json_schema", json_schema: TIMETABLE_SCHEMA },
}
```

OpenRouter's `models` array fails over automatically on error or refusal. Set `X-Title` and a spend limit on the key.

**Two stages, not one.** Course codes, faculty and venues live in the legend tables at the bottom of the sheet — and there are **two side-by-side legend tables**, left and right. A naive single-shot read grabs the left one and drops half the courses. Extract both halves explicitly.

**Inject known constraints into the prompt:** 5 days, 8 periods, break after P2, lunch after P5, expected total 40, the `CODE [ABBR]` cell pattern, the `/` elective pattern, and the department's known codes from other groups.

**Ask for raw cell text verbatim** plus column span. Fuzzy-match score against the legend becomes your confidence signal — deterministic and free. Don't ask the model to self-report confidence; it's badly calibrated.

**Colspan is the hard part.** Tell the model explicitly to report `col_start` and `col_end` per cell by aligning against the hour header row, and that lab blocks commonly span 2–3 columns. Then expand server-side. This is where extraction will fail most often.

### 9.2 Deterministic validation

| Rule | Catches |
|---|---|
| **Weekly periods sum to exactly 40** | Collapsed merged cells — the single best check |
| Grid is exactly 5 × 8, no gaps | Dropped rows/columns |
| Every cell resolves to a legend entry, or is `ABSL`/`MENTORING` | Hallucinated abbreviations |
| Each course appears **1–8** times/week | Duplicated or dropped cells (floor is 1: UHVSL) |
| Lab variants appear in runs of 2–3 | Colspan misread |
| Codes match `^[A-Z]{2,4}\d{4,5}$` | OCR digit errors |
| Legend has both left and right tables | Half-read legend |
| Duplicate codes merge into one course | Integrated theory+lab handled |

Rule failures highlight those cells in the verification UI. Structural failures trigger retry.

### 9.3 Failure handling

| Failure | Response |
|---|---|
| 429 / 5xx | Backoff, 2–3 attempts |
| Still failing | OpenRouter falls to next model |
| Malformed JSON | One re-ask with the schema violation quoted |
| Validation fails twice | Manual entry, **pre-filled with best partial extraction** |
| Everything fails | Manual entry, blank grid — always reachable |

Optional: run both models and diff. Disagreeing cells are your uncertain cells; more reliable than self-reported confidence, and pennies. Worth it since one bad timetable poisons a whole section.

### 9.4 Job hygiene

- Idempotent — a retry must never double-write a timetable
- Rate limit uploads: 5/day/student, 10 MB cap, **only when the group has no timetable**
- Hash-dedupe: classmates upload the identical PDF constantly
- Detect `Format No.` / `Revision No.` from the header; if it isn't `8a / 03`, warn that the parser may be stale

### 9.5 Verification UI

Show the grid with low-confidence cells highlighted, the `x/40` counter, and the legend side by side. Checking 6 flagged cells gets done; checking 48 gets a blind Confirm tap.

Log `uploaded_by` and `confirmed_by`.

**Crowd verification:** uploader confirms → `provisional` (fully usable, banner says not double-checked). Next two students see one prompt — *"Does this match your timetable?"* with electives greyed out. Two confirms → `verified`. A rejection asks which day/period is wrong, flags for admin, never auto-edits. Show at most twice per student, dismissible.

Never block usage on verification state.

---

## 10. Scope and disclaimer

Known, accepted drift:

- Working days, holidays and exam dates are **assumed from the published academic calendar**, which changes — rain holidays, compensating Saturdays, shifted festival dates, department events
- Your year may follow a different calendar than the one loaded
- Substitutions and swaps attribute to the timetable subject, not what was actually taught
- Cancelled classes are not tracked
- Extra/makeup classes are not tracked

Dashboard, persistent:

> Estimate based on your timetable. Not official.

When the calendar is `borrowed`, `inferred` or `guessed`, add a quiet line under it:

> Working days assumed from the academic calendar — your year's may differ.

Onboarding + recovery calculator, full:

> These numbers are estimated from your class timetable and the published academic calendar. Working days, holidays and exam dates are assumed and may have changed — and substitutions or cancelled classes aren't tracked, so your official attendance will differ. Treat this as a rough picture, and check the college portal for the real number.

Footer: *built by a student, not affiliated with or endorsed by LICET.*

---

## 11. Features

**Calendar** is primary. Day colours: full present / partial / full absent / OD / holiday / before-start. Day view lists 8 periods with subjects; merged lab blocks tap as one unit but count as 2–3.

**Recovery calculator:**

```
needed = ceil((target × total − present) ÷ (1 − target))
```

Check it against remaining **instruction** periods, or you'll produce numbers larger than the semester has left. That's the bug fix; the copy stays soft:

> About 14 more classes to reach 75% — roughly 96 periods left before instruction ends.

When the target isn't reachable, say it plainly and stop there:

> 75% isn't reachable for DVST from here — attending everything left lands around 71%.

No advice, no "talk to your advisor", no urgency. The student knows what to do with the number better than the app does, and the number is an estimate anyway.

**Lead with "can miss N more", not the percentage.** It's what students actually want, and on this timetable it varies enormously — 6-period courses like CN and DVST are forgiving, `FC24501 (UHVSL)` at 1 period/week much less so. Surface that asymmetry.

**Risk states:** below threshold / one absence from dropping / comfortable margin. Neutral colours and neutral wording — `DVST 74% · below 75%`, not a red alarm. It's an estimate; presenting it as a crisis is both stressful and frequently wrong.

**Simulator:** pick future dates, see projected overall and per-course. Nothing written unless confirmed. Show per-course impact — a Thursday leave costs 3 BDA Lab periods, a Monday leave costs the only UHVSL of the week.

**OD:** date + periods + reason as a **short enum** (College event / Sports / Placement / Medical / Other). Dashboard toggle: `Include OD as present`, on by default (see 19.2) — one switch drives the overall percentage, every course-wise percentage, and the recovery calculator together.

---

## 12. Infra

- **Next.js on Vercel**, App Router, server actions
- **Supabase** — Postgres + Auth + Storage + RLS
- **Drizzle** — lighter cold starts than Prisma on serverless
- **Inngest or QStash** for extraction jobs
- **OpenRouter** for vision
- **Resend** for mail — Supabase's built-in sender is rate-limited to a handful per hour and will stall signups on launch day. Test that LICET's mail server doesn't spam-filter it
- **PostHog** free tier — you need to see where onboarding drops off

**Non-negotiable:**

- **Pooled connection string** (Supavisor, transaction mode). Serverless + Postgres = connection exhaustion at 4pm when everyone opens the app. This is the most common way this exact stack falls over.
- **Compute "today" in `Asia/Kolkata`.** Vercel runs UTC; after 18:30 IST the server is already on tomorrow. Store dates as Postgres `DATE`.
- **Cache timetable + calendar hard**, tag-based revalidation. Removes ~90% of reads.
- **Nightly `pg_dump`** to object storage. Students will not re-enter a semester of absences.
- Supabase free tier pauses after ~7 days idle — matters during build gaps and semester breaks.

**RLS on every table before any client code.** `attendance_exception` and `student_elective_choice`: `auth.uid() = student_id`. Timetable tables: readable by group members, writes via server routes only. Service role key never reaches the client.

---

## 13. PWA and notifications

Installable, offline-tolerant — campus wifi is bad and the app should open with cached numbers on no network.

Daily reminder ~16:10 (right after P8 ends): *"Mark today's absences"*, two taps from the notification. This does more for retention than the simulator.

iOS web push requires add-to-home-screen (16.4+) and is flaky; Android is fine. Plan for ~60–70% reach. Ask for permission on **day 2**, not at signup.

---

## 14. Admin

You are the "authorized user" from the original spec. Build this in week two or you'll field disputes over WhatsApp all semester.

- Groups and timetable states
- Direct timetable editing
- Queue of `disputed` timetables with rejection notes
- Failed extraction jobs with source file, to fix and re-run
- Bug reports and feature requests

Password-protected page is enough.

---

## 15. Bug reporting

Settings + persistent footer link.

**Auto-attach** (a raw text box gets you "it doesn't work"): build SHA, device/OS/browser, current route, student + group id, timetable status, recent client errors, timestamp with timezone.

**Ask for:** what you were doing, what you expected, what happened. Three short fields, optional screenshot.

```sql
bug_report (
  id, student_id, group_id,
  description, expected, actual,
  screenshot_path null, context jsonb,
  status,                        -- new|triaged|fixed|wontfix
  created_at
)
```

Global error boundary offers "Report this" with the stack pre-filled. **Notify the reporter when it's fixed** — cheapest goodwill available, and it keeps reports coming.

---

## 16. Feature suggestions

Same entry point, second tab.

- Title + description, **upvotes**, sorted by votes
- Dedupe: search as they type, nudge toward upvoting an existing one
- Public status: `open → planned → building → shipped`
- Ship the shipped list — students seeing their suggestion go live is free retention

```sql
feature_request (
  id, student_id, title, description,
  status, vote_count, merged_into null, created_at
)
feature_vote (request_id, student_id, primary key (request_id, student_id))
```

---

## 17. Privacy

You're holding students' self-reported skipped classes tied to real identities.

- OD reasons as enum, not free text
- Don't retain what you don't compute with
- Explicit: student-built, unaffiliated, not shared with faculty or administration
- Account deletion that actually deletes
- Don't log request bodies containing attendance data

---

## 18. Pre-launch checklist

**Calendar — build time**
- [ ] Seeded monthly working days match 24 / 22 / 22 / 20 / 5 (assertion in CI, warning on admin page, never user-facing)
- [ ] All seven working Saturdays seeded with day orders
- [ ] SEPE / study holiday / SEE days excluded from the denominator

**Calendar — runtime**
- [ ] App renders with **no calendar seeded at all** — falls through to Mon–Fri, badges `guessed`
- [ ] App renders for a year with no track seeded — borrows another, badges `borrowed`
- [ ] Working Saturday with unknown day order is skipped, not guessed
- [ ] Dates past the seeded range assume Mon–Fri instruction
- [ ] Confidence badge shown; nothing gated behind it
- [ ] `effective_dow` resolved in exactly one place; no stray `getDay()` calls
- [ ] Personal override beats group override beats official calendar
- [ ] Group override needs two confirmations before it applies
- [ ] Zero-absence student shows exactly 100%
- [ ] Recovery calculator counts remaining **instruction** periods
- [ ] Moon-sighting holidays flagged provisional and editable
- [ ] Adding a track later requires no code change and no migration

**Timetable**
- [ ] Weekly total = 40 checked on manual entry and extraction (warn, don't block)
- [ ] Duplicate course codes merge into one course (verify `CS24512` shows **one** percentage, not two)
- [ ] Merged lab blocks expand to individual periods
- [ ] ABSL/Mentoring counted in overall, excluded from course percentages, visible as `Other`
- [ ] Pooled connection string, load-tested concurrently
- [ ] "Today" in `Asia/Kolkata`
- [ ] RLS tested with a second account
- [ ] Service role key absent from client bundles
- [ ] Resend wired, test mail reaches a LICET address not spam
- [ ] Extraction runs as background job
- [ ] OpenRouter fallback verified by forcing primary to fail
- [ ] Manual entry reachable from every point in the upload flow
- [ ] Recovery calculator returns "not achievable" correctly
- [ ] Backup running, restore tested once
- [ ] Disclaimer on dashboard and recovery calculator
- [ ] Upload rate limit and size cap enforced
- [ ] Elective slots excluded from crowd verification
- [ ] Student moved between groups keeps correct recomputed history
- [ ] Parser passes the section 2 golden fixture

---

## 19. Open decisions

These four cannot be answered from the timetable or the calendar. Each one changes the numbers the app shows. Pick a default, ship, and correct later — but know they're guesses, and check them at the first Attendance Verification.

### 19.1 What does "can miss N more" mean?

Two defensible formulas, and they disagree badly. Real numbers, CS24512 at 52 present of 56 conducted with 40 periods left:

| Question | Formula | Answer |
|---|---|---|
| **Buffer** — how many can I miss before I drop below 75% right now | `present/target − conducted` | **13** |
| **Budget** — how many can I miss across the rest of the semester and still finish at 75% | `present + remaining − target×(conducted + remaining)` | **20** |

Both are correct; they answer different questions. Showing one number without saying which is how students get burned.

**Recommendation:** headline the buffer (13) — it's the conservative one and it's what "can I skip tomorrow" means. Offer the budget on the course detail screen as *"across the rest of the semester: 20."*

Guard the recovery formula too: `target = 1` divides by zero, and an already-above-target student produces a negative `needed` that must clamp to 0.

### 19.2 How does OD count? — **Resolved**

Default: OD counts as present. A toggle switches to OD counts as absent. From the same 100-period example:

| State | Result |
|---|---|
| Default — OD counts as present | 90 / 100 = **90.0%** |
| Toggle on — OD counts as absent | 80 / 100 = **80.0%** |

The "excluded from the denominator" convention (88.9% in the earlier draft) is dropped — it can move the percentage in either direction depending on the student's OD ratio, which is confusing for a two-state toggle. Two clear states beat three ambiguous ones.

**Toggle copy**, on the dashboard next to the overall percentage:

```
[ ● Include OD as present ]
```

ON (default) → OD counts as present, 90.0% in the example.
OFF → OD counts as absent, 80.0% in the example.

Same toggle setting applies to every course-wise percentage and the recovery calculator simultaneously — one switch, one source of truth, never computed independently per screen. Persist it per student; don't reset it each session.

### 19.3 How is overall attendance computed?

Two methods, and they differ materially here because weekly loads are so uneven — DVST has 99 sessions this semester, UHVSL has 15:

- **Total periods:** `sum(present) / sum(conducted)` across everything. Heavy courses dominate.
- **Mean of courses:** average the per-course percentages. A single bad UHVSL day weighs as much as a bad DVST month.

**Recommendation:** total periods as the headline, since that's the more common institutional practice, and it's also what the ABSL/Mentoring slots require — they have no course to average.

### 19.4 Do CS24512 theory and lab combine?

They share a course code, so v3 onward treats them as one course. If the portal shows them separately despite the shared code, key by `(code, is_lab)` instead. Make this a **config flag**, not a schema assumption, so flipping it is one line rather than a migration.

Also open: whether the regular timetable runs during CAT-1 and CAT-2 weeks. Until known, those days count as instruction — the safe default.

---

## 20. Logic traps

Things that look right and aren't. Each one fails silently.

**Counting exceptions outside the loop.** Covered in section 6, repeated because it's the worst one: a date that becomes a holiday orphans its absence rows, and an independent `count(*)` keeps subtracting them from a denominator they left.

**Using the current group for the whole semester.** `group_membership` validity ranges exist; the loop must use them. Looks correct until the first section transfer.

**Deleting orphaned exceptions.** Keep them. Days flip back.

**Day-order changes re-attribute absences.** Absences key on `(date, period)`, not on course — which is *correct*, since the student was absent for period 4 whatever was taught in it. But if a Saturday's day order is corrected from Wednesday to Thursday, those absences quietly move to different subjects. Notify: *"Sat 12 Sep changed to Thursday order — your absences that day now apply to DVST and CN."*

**Elective changes are retroactive.** Recomputing the whole semester is right when someone fixes a mis-tap at onboarding, and wrong for a genuine mid-semester switch. Confirm before applying: *"This recalculates your whole semester."* Genuine switches are rare enough not to model.

**`leave` as a status is redundant.** The simulator never writes, so `absent | od` covers everything. Drop `leave` and use a reason field if you need the distinction — a third status that behaves identically to `absent` is a bug waiting to happen.

**Uneven weekdays.** Jul 1 – Oct 31 gives Mon 15, Tue 16, Wed 17, Thu 18, Fri 15 instruction days. A Monday-heavy course gets ~17% fewer sessions than a Thursday-heavy one, before any working Saturdays skew it further. Any calculation that assumes "about 18 weeks of everything" is wrong. The date loop handles this; nothing else does.

**Low-frequency courses are volatile.** `FC24501 (UHVSL)` runs once a week — **15 sessions all semester**. One absence costs 6.67%; four puts it under 75%. Compare `AD24412 (DVST)` at 99 sessions where one absence costs 1.01%. This is the strongest argument for leading with "can miss N" instead of a percentage: the percentages look similar, the risk is nothing alike.

**Race on first upload.** Two students from a new group uploading at the same moment. Unique constraint on the group's timetable, and the loser gets *"already configured"* rather than an error.

**Offline writes need a queue.** A PWA that lets someone mark absences on campus wifi and silently drops them is worse than one that's online-only. Queue locally, sync on reconnect, last-write-wins on `(student, date, period)`.

**Notifications on non-instruction days.** The 16:10 reminder must respect the calendar — no pings during study holiday, SEE, or on a date the student marked as a holiday.

**`unique (scope, coalesce(student_id, group_id), date)`** needs an expression index, or split it into two partial unique indexes. It won't work as written on a plain constraint.

**Semester boundaries.** `as_of` must clamp to the semester end, or a student opening the app in January sees a denominator that has kept growing.
