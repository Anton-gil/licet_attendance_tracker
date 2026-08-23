/**
 * Data model per docs/spec.md §5.
 *
 * `attendance_exception` is the only attendance table with rows — present is
 * never stored (CLAUDE.md invariant 1). Everything else is either reference
 * data (calendar, timetable) or resolved per-date by the date resolver
 * (src/lib/date/resolve-date.ts), never by a stored summary.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

// ---------------------------------------------------------------------------
// Enums — closed vocabularies called out explicitly in the spec.
// ---------------------------------------------------------------------------

export const timetableStatusEnum = pgEnum("timetable_status", [
  "none",
  "extracting",
  "draft",
  "provisional",
  "verified",
  "disputed",
]);

export const slotKindEnum = pgEnum("slot_kind", [
  "course",
  "elective",
  "activity",
  "admin",
]);

export const calendarKindEnum = pgEnum("calendar_kind", [
  "instruction",
  "holiday",
  "sepe",
  "see",
  "study_holiday",
  "vacation",
]);

// calendar_override only ever carries the two kinds a student can toggle
// between (§7.6) — instruction (working) or holiday.
export const overrideKindEnum = pgEnum("override_kind", [
  "instruction",
  "holiday",
]);

export const overrideScopeEnum = pgEnum("override_scope", [
  "student",
  "group",
]);

// §20 "leave as a status is redundant" — absent | od only, no leave.
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "absent",
  "od",
]);

// §11 — OD reason is a short enum, not free text (also §17 privacy).
export const odReasonEnum = pgEnum("od_reason", [
  "college_event",
  "sports",
  "placement",
  "medical",
  "other",
]);

export const bugStatusEnum = pgEnum("bug_status", [
  "new",
  "triaged",
  "fixed",
  "wontfix",
]);

export const featureStatusEnum = pgEnum("feature_status", [
  "open",
  "planned",
  "building",
  "shipped",
]);

// §7.1 confidence of a calendar_track's source data.
export const trackConfidenceEnum = pgEnum("track_confidence", [
  "official",
  "partial",
  "inferred",
]);

// ---------------------------------------------------------------------------
// Groups, membership, students
// ---------------------------------------------------------------------------

export const academicGroup = pgTable(
  "academic_group",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    academicYear: text("academic_year").notNull(), // '2026-27'
    department: text("department").notNull(),
    year: smallint("year").notNull(),
    section: text("section").notNull(),
    semester: smallint("semester").notNull(),
    venue: text("venue"),
    classAdvisor: text("class_advisor"),
    wefDate: date("wef_date"),
    timetableStatus: timetableStatusEnum("timetable_status")
      .notNull()
      .default("none"),
    createdBy: uuid("created_by").references(() => authUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("academic_group_unique").on(
      table.academicYear,
      table.department,
      table.year,
      table.section,
      table.semester,
    ),
    // Timetable/reference data: any authenticated member of the group can
    // read it. Writes go through server routes (service role) only, per
    // §12 — no insert/update/delete policy for the authenticated role.
    pgPolicy("academic_group_select_member", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (
        select 1 from group_membership gm
        where gm.group_id = ${table.id} and gm.student_id = ${authUid}
      )`,
    }),
  ],
).enableRLS();

export const student = pgTable(
  "student",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    regNo: text("reg_no"),
    semesterStartDate: date("semester_start_date"),
    threshold: smallint("threshold").notNull().default(75),
    countActivitySlots: boolean("count_activity_slots").notNull().default(true),
    // The OD toggle (spec §19.2, resolved) — one switch, persisted per
    // student, drives overall %, every course %, and the recovery
    // calculator together. Never computed independently per screen.
    includeOdAsPresent: boolean("include_od_as_present").notNull().default(true),
  },
  (table) => [
    pgPolicy("student_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.id}`,
    }),
    pgPolicy("student_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.id}`,
    }),
    pgPolicy("student_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.id}`,
      withCheck: sql`${authUid} = ${table.id}`,
    }),
  ],
).enableRLS();

export const groupMembership = pgTable(
  "group_membership",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => student.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => academicGroup.id, { onDelete: "cascade" }),
    validFrom: date("valid_from").notNull(),
    validTo: date("valid_to"),
  },
  (table) => [
    index("group_membership_student_idx").on(table.studentId, table.validFrom),
    index("group_membership_group_idx").on(table.groupId),
    pgPolicy("group_membership_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.studentId}`,
    }),
  ],
).enableRLS();

// ---------------------------------------------------------------------------
// Courses — the unit of attendance (§2). Keyed on (group_id, code), never
// on display name.
// ---------------------------------------------------------------------------

export const course = pgTable(
  "course",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => academicGroup.id, { onDelete: "cascade" }),
    code: text("code").notNull(), // 'CS24512'
    name: text("name").notNull(),
    faculty: text("faculty"),
  },
  (table) => [
    uniqueIndex("course_group_code_unique").on(table.groupId, table.code),
    pgPolicy("course_select_member", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (
        select 1 from group_membership gm
        where gm.group_id = ${table.groupId} and gm.student_id = ${authUid}
      )`,
    }),
  ],
).enableRLS();

// Display only — never used in attendance math (§2, §5).
export const courseVariant = pgTable(
  "course_variant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    abbrev: text("abbrev").notNull(), // 'CN' | 'CN LAB'
    isLab: boolean("is_lab").notNull().default(false),
    venue: text("venue"),
  },
  (table) => [
    index("course_variant_course_idx").on(table.courseId),
    uniqueIndex("course_variant_course_abbrev_unique").on(table.courseId, table.abbrev),
    pgPolicy("course_variant_select_member", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (
        select 1 from course c
        join group_membership gm on gm.group_id = c.group_id
        where c.id = ${table.courseId} and gm.student_id = ${authUid}
      )`,
    }),
  ],
).enableRLS();

// ---------------------------------------------------------------------------
// Electives (§4)
// ---------------------------------------------------------------------------

export const electiveGroup = pgTable(
  "elective_group",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => academicGroup.id, { onDelete: "cascade" }),
    label: text("label").notNull(), // 'PE-1'
  },
  (table) => [
    uniqueIndex("elective_group_group_label_unique").on(table.groupId, table.label),
    pgPolicy("elective_group_select_member", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (
        select 1 from group_membership gm
        where gm.group_id = ${table.groupId} and gm.student_id = ${authUid}
      )`,
    }),
  ],
).enableRLS();

export const electiveOption = pgTable(
  "elective_option",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    electiveGroupId: uuid("elective_group_id")
      .notNull()
      .references(() => electiveGroup.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("elective_option_group_idx").on(table.electiveGroupId),
    uniqueIndex("elective_option_group_course_unique").on(table.electiveGroupId, table.courseId),
    pgPolicy("elective_option_select_member", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (
        select 1 from elective_group eg
        join group_membership gm on gm.group_id = eg.group_id
        where eg.id = ${table.electiveGroupId} and gm.student_id = ${authUid}
      )`,
    }),
  ],
).enableRLS();

// Student picks once at onboarding, changeable in settings (§4). Own row
// only — full CRUD for the owning student, matching the "escape hatch"
// nature of settings changes.
export const studentElectiveChoice = pgTable(
  "student_elective_choice",
  {
    studentId: uuid("student_id")
      .notNull()
      .references(() => student.id, { onDelete: "cascade" }),
    electiveGroupId: uuid("elective_group_id")
      .notNull()
      .references(() => electiveGroup.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("student_elective_choice_pk").on(
      table.studentId,
      table.electiveGroupId,
    ),
    pgPolicy("student_elective_choice_all_own", {
      for: "all",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.studentId}`,
      withCheck: sql`${authUid} = ${table.studentId}`,
    }),
  ],
).enableRLS();

// ---------------------------------------------------------------------------
// Timetable (§1, §3)
// ---------------------------------------------------------------------------

export const timetableEntry = pgTable(
  "timetable_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => academicGroup.id, { onDelete: "cascade" }),
    dayOfWeek: smallint("day_of_week").notNull(), // 1..5, Mon..Fri
    period: smallint("period").notNull(), // 1..8
    kind: slotKindEnum("kind").notNull(),
    courseVariantId: uuid("course_variant_id").references(
      () => courseVariant.id,
      { onDelete: "set null" },
    ),
    electiveGroupId: uuid("elective_group_id").references(
      () => electiveGroup.id,
      { onDelete: "set null" },
    ),
    label: text("label"), // 'ABSL' | 'MENTORING' for activity/admin slots
    blockId: uuid("block_id"), // shared across a merged lab block
  },
  (table) => [
    uniqueIndex("timetable_entry_slot_unique").on(
      table.groupId,
      table.dayOfWeek,
      table.period,
    ),
    pgPolicy("timetable_entry_select_member", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (
        select 1 from group_membership gm
        where gm.group_id = ${table.groupId} and gm.student_id = ${authUid}
      )`,
    }),
  ],
).enableRLS();

// ---------------------------------------------------------------------------
// Academic calendar (§7) — reference data, not attendance data. Readable by
// every authenticated student regardless of group.
// ---------------------------------------------------------------------------

export const calendarTrack = pgTable(
  "calendar_track",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    academicYear: text("academic_year").notNull(),
    key: text("key").notNull(), // 'FY' | 'II-III' | 'IV' | ...
    label: text("label").notNull(),
    appliesToYears: integer("applies_to_years").array().notNull(),
    sourceNote: text("source_note"),
    confidence: trackConfidenceEnum("confidence").notNull().default("official"),
  },
  (table) => [
    uniqueIndex("calendar_track_unique").on(table.academicYear, table.key),
    pgPolicy("calendar_track_select_all", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

export const academicCalendar = pgTable(
  "academic_calendar",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    academicYear: text("academic_year").notNull(),
    track: text("track").notNull(), // calendar_track.key for this academic year
    date: date("date").notNull(),
    kind: calendarKindEnum("kind").notNull(),
    dayOrder: smallint("day_order"), // 1..5 when a Saturday follows a weekday timetable
    label: text("label"),
    isProvisional: boolean("is_provisional").notNull().default(false),
  },
  (table) => [
    uniqueIndex("academic_calendar_unique").on(
      table.academicYear,
      table.track,
      table.date,
    ),
    index("academic_calendar_date_idx").on(table.date),
    pgPolicy("academic_calendar_select_all", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

// ---------------------------------------------------------------------------
// Calendar overrides (§7.5, §7.6) — deviations from the official calendar.
// Personal overrides are the escape hatch: instant, private, no confirmation
// needed, so students may write their own rows directly under RLS. Group
// overrides need two confirmations (override_confirmation) before they take
// effect for the whole group, which is orchestrated server-side — no direct
// insert policy for scope='group'.
// ---------------------------------------------------------------------------

export const calendarOverride = pgTable(
  "calendar_override",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scope: overrideScopeEnum("scope").notNull(),
    studentId: uuid("student_id").references(() => student.id, {
      onDelete: "cascade",
    }),
    groupId: uuid("group_id").references(() => academicGroup.id, {
      onDelete: "cascade",
    }),
    date: date("date").notNull(),
    kind: overrideKindEnum("kind").notNull(),
    dayOrder: smallint("day_order"),
    reason: text("reason"), // 'rain', 'moon sighting', 'dept event'
    createdBy: uuid("created_by")
      .notNull()
      .references(() => authUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // §20: `unique (scope, coalesce(student_id, group_id), date)` needs an
    // expression index / partial uniques, not a plain constraint.
    uniqueIndex("calendar_override_student_unique")
      .on(table.studentId, table.date)
      .where(sql`${table.scope} = 'student'`),
    uniqueIndex("calendar_override_group_unique")
      .on(table.groupId, table.date)
      .where(sql`${table.scope} = 'group'`),
    index("calendar_override_date_idx").on(table.date),
    pgPolicy("calendar_override_select_relevant", {
      for: "select",
      to: authenticatedRole,
      using: sql`
        (${table.scope} = 'student' and ${table.studentId} = ${authUid})
        or (${table.scope} = 'group' and exists (
          select 1 from group_membership gm
          where gm.group_id = ${table.groupId} and gm.student_id = ${authUid}
        ))
      `,
    }),
    pgPolicy("calendar_override_write_personal", {
      for: "all",
      to: authenticatedRole,
      using: sql`${table.scope} = 'student' and ${table.studentId} = ${authUid}`,
      withCheck: sql`${table.scope} = 'student' and ${table.studentId} = ${authUid}`,
    }),
  ],
).enableRLS();

// Group overrides need corroboration before they apply to everyone (§7.5).
export const overrideConfirmation = pgTable(
  "override_confirmation",
  {
    overrideId: uuid("override_id")
      .notNull()
      .references(() => calendarOverride.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => student.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("override_confirmation_pk").on(
      table.overrideId,
      table.studentId,
    ),
    pgPolicy("override_confirmation_select_group", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (
        select 1 from calendar_override co
        join group_membership gm on gm.group_id = co.group_id
        where co.id = ${table.overrideId} and gm.student_id = ${authUid}
      )`,
    }),
    pgPolicy("override_confirmation_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.studentId}`,
    }),
  ],
).enableRLS();

// ---------------------------------------------------------------------------
// Attendance — exceptions only. Present is never written (invariant 1).
// ---------------------------------------------------------------------------

export const attendanceException = pgTable(
  "attendance_exception",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => student.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    period: smallint("period").notNull(),
    status: attendanceStatusEnum("status").notNull(),
    odReason: odReasonEnum("od_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("attendance_exception_unique").on(
      table.studentId,
      table.date,
      table.period,
    ),
    index("attendance_exception_student_date_idx").on(
      table.studentId,
      table.date,
    ),
    // These writes go browser → Supabase directly (no server route in the
    // middle to validate the payload) — RLS covers *who* can write,
    // these CHECKs cover *what*. `status` itself is already the
    // attendanceStatusEnum type, so 'leave' is rejected at the type level,
    // not just by convention.
    check("period_range", sql`${table.period} between 1 and 8`),
    check("sane_date", sql`${table.date} between '2020-01-01' and '2035-01-01'`),
    pgPolicy("attendance_exception_all_own", {
      for: "all",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.studentId}`,
      withCheck: sql`${authUid} = ${table.studentId}`,
    }),
  ],
).enableRLS();

// ---------------------------------------------------------------------------
// Bug reports (§15) and feature requests (§16)
// ---------------------------------------------------------------------------

export const bugReport = pgTable(
  "bug_report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").references(() => student.id, {
      onDelete: "set null",
    }),
    groupId: uuid("group_id").references(() => academicGroup.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    expected: text("expected"),
    actual: text("actual"),
    screenshotPath: text("screenshot_path"),
    context: jsonb("context"),
    status: bugStatusEnum("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    pgPolicy("bug_report_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.studentId}`,
    }),
    pgPolicy("bug_report_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.studentId}`,
    }),
  ],
).enableRLS();

export const featureRequest = pgTable(
  "feature_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").references(() => student.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    status: featureStatusEnum("status").notNull().default("open"),
    voteCount: integer("vote_count").notNull().default(0),
    mergedInto: uuid("merged_into"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.mergedInto],
      foreignColumns: [table.id],
    }),
    // Public status board (§16) — every authenticated student can browse
    // and upvote; only the author can edit their own request. Vote counts
    // are maintained server-side (service role), not by client update.
    pgPolicy("feature_request_select_all", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy("feature_request_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.studentId}`,
    }),
  ],
).enableRLS();

export const featureVote = pgTable(
  "feature_vote",
  {
    requestId: uuid("request_id")
      .notNull()
      .references(() => featureRequest.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => student.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("feature_vote_pk").on(table.requestId, table.studentId),
    pgPolicy("feature_vote_select_all", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy("feature_vote_all_own", {
      for: "all",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.studentId}`,
      withCheck: sql`${authUid} = ${table.studentId}`,
    }),
  ],
).enableRLS();
