# CLAUDE.md

Attendance tracker for LICET students. Next.js (App Router) + Supabase + Drizzle, deployed on Vercel.

Full spec: `docs/spec.md`. Read only the sections relevant to the current task — it's long.

**It is an estimator, not a record.** The college portal is truth. Never write copy that implies otherwise.

---

## Hard invariants

Violating any of these is a bug, even if tests pass.

1. **Present is never stored.** `attendance_exception` holds only `absent` and `od`. A row per present period is wrong.
2. **The denominator iterates dates.** Never `weekly_count × working_days` — day orders make that wrong. One loop over instruction dates, resolving `effective_dow` per date.
3. **Exceptions are looked up inside the loop.** Never `count(*)` them and subtract. A date later marked as a holiday orphans its rows and an independent count keeps subtracting them.
4. **Never delete orphaned exceptions.** Days flip back to working; the absence must come back with them.
5. **One date resolver.** `resolveDate(date, student) → { isInstruction, effectiveDow, confidence }`. Every consumer calls it. No `getDay()` anywhere else in the codebase.
6. **Group is resolved per date**, from `group_membership` validity ranges — not from the student's current group.
7. **Courses key on course code.** `CS24512` theory and `CS24512` lab are one course. Never key on display name.
8. **Degrade, never block.** Missing calendar, unseeded track, unknown date → fall through to the best guess and badge the confidence. Never an error screen, never a blocking setup step.
9. **RLS protects browser-direct writes only** (`attendance_exception`, `calendar_override`, `student_elective_choice`). All server-side queries run through a privileged connection that bypasses RLS and **must scope by `studentId` explicitly**. An unscoped server query is a data leak; nothing structural will catch it.
10. **Dates are Postgres `DATE`, resolved in `Asia/Kolkata`.** Vercel runs UTC; after 18:30 IST the server is already on tomorrow.

---

## Resolved decisions

Do not re-litigate these in code. If something seems to need a different answer, ask. OD (row 1) is confirmed by the person who owns this project — the rest are defaults pending verification against the college's actual rules.

| Question | Answer |
|---|---|
| OD counting | **Two states only.** Default: counts as present (`num = denom − absent`). Toggle `Include OD as present` OFF: counts as absent (`num = denom − absent − od`). No third "excluded from denominator" state — don't add one. One toggle drives overall %, every course %, and the recovery calculator together. Persist per student. |
| Overall attendance | **Total periods**: `sum(present) / sum(conducted)`. Not mean-of-courses. |
| "Can miss N more" | Headline the **buffer**: `floor(present/target − conducted)`. Budget formula on the detail screen only, labelled differently. |
| Integrated courses | Theory + lab sharing a code are **one course**. Behind flag `SPLIT_LAB_BY_CODE = false`. |
| ABSL / Mentoring | Count toward **overall only**. No course percentage. Shown as `Other`. |
| Statuses | `absent` and `od` only. No `leave` status — the simulator never writes. |

---

## Forbidden patterns

- `new Date()` for "today" — use the IST helper
- `date.getDay()` outside the date resolver
- Any calculation that assumes a 5-day week or uniform weekly distribution (`weekly_count × working_days`) — day orders and uneven weekdays break both; the denominator must iterate dates (see spec §6, §20)
- Counting `attendance_exception` rows with an independent `count(*)` and subtracting the result from a denominator — look them up from inside the date loop instead (spec §6, §20)
- Deleting an `attendance_exception` row because its date became a holiday — keep it; the day may flip back to working (spec §20)
- Using `student.current_group` (or any "current group" shortcut) instead of resolving `group_membership` by validity range for the date in question (spec §6, §20)
- A third OD state ("excluded from the denominator") — only the two toggle states exist (spec §6, §19.2)
- A `leave` status anywhere in the schema or UI — only `absent` and `od` (spec §20)
- Keying a course by display name/abbreviation instead of course code — `CS24512` theory and lab must resolve to one course (spec §2)
- Blocking rendering on missing/unseeded calendar, track, or timetable data — always fall through the confidence chain and badge it, never show an error screen (spec §7.2, §7.3)
- Reading the recovery calculator's "classes needed" against calendar days instead of remaining **instruction** periods (spec §7.8, §11)
- A `"use server"` action that trusts a client-supplied id (`groupId`, `electiveGroupId`, ...) without checking it belongs to the calling student — the action is a public endpoint no matter what UI happens to call it; the page's own auth check does not protect it. Every mutation needs its own `requireStudent()` and, for anything scoped to a group, `requireGroupMembership()` (`src/lib/auth/require-group-membership.ts`). Found and fixed in `saveCell`/`finishTimetable` (had *no* auth check at all) and `saveElectiveChoices` (had auth, not group-ownership) — see invariant 9.
