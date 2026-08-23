CREATE TYPE "public"."attendance_status" AS ENUM('absent', 'od');--> statement-breakpoint
CREATE TYPE "public"."bug_status" AS ENUM('new', 'triaged', 'fixed', 'wontfix');--> statement-breakpoint
CREATE TYPE "public"."calendar_kind" AS ENUM('instruction', 'holiday', 'sepe', 'see', 'study_holiday', 'vacation');--> statement-breakpoint
CREATE TYPE "public"."feature_status" AS ENUM('open', 'planned', 'building', 'shipped');--> statement-breakpoint
CREATE TYPE "public"."od_reason" AS ENUM('college_event', 'sports', 'placement', 'medical', 'other');--> statement-breakpoint
CREATE TYPE "public"."override_kind" AS ENUM('instruction', 'holiday');--> statement-breakpoint
CREATE TYPE "public"."override_scope" AS ENUM('student', 'group');--> statement-breakpoint
CREATE TYPE "public"."slot_kind" AS ENUM('course', 'elective', 'activity', 'admin');--> statement-breakpoint
CREATE TYPE "public"."timetable_status" AS ENUM('none', 'extracting', 'draft', 'provisional', 'verified', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."track_confidence" AS ENUM('official', 'partial', 'inferred');--> statement-breakpoint
CREATE TABLE "academic_calendar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year" text NOT NULL,
	"track" text NOT NULL,
	"date" date NOT NULL,
	"kind" "calendar_kind" NOT NULL,
	"day_order" smallint,
	"label" text,
	"is_provisional" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academic_calendar" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "academic_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year" text NOT NULL,
	"department" text NOT NULL,
	"year" smallint NOT NULL,
	"section" text NOT NULL,
	"semester" smallint NOT NULL,
	"venue" text,
	"class_advisor" text,
	"wef_date" date,
	"timetable_status" timetable_status DEFAULT 'none' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academic_group" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "attendance_exception" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"date" date NOT NULL,
	"period" smallint NOT NULL,
	"status" "attendance_status" NOT NULL,
	"od_reason" "od_reason",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_exception" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bug_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid,
	"group_id" uuid,
	"description" text NOT NULL,
	"expected" text,
	"actual" text,
	"screenshot_path" text,
	"context" jsonb,
	"status" "bug_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bug_report" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "calendar_override" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" "override_scope" NOT NULL,
	"student_id" uuid,
	"group_id" uuid,
	"date" date NOT NULL,
	"kind" "override_kind" NOT NULL,
	"day_order" smallint,
	"reason" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_override" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "calendar_track" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"applies_to_years" integer[] NOT NULL,
	"source_note" text,
	"confidence" "track_confidence" DEFAULT 'official' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_track" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "course" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"faculty" text
);
--> statement-breakpoint
ALTER TABLE "course" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "course_variant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"abbrev" text NOT NULL,
	"is_lab" boolean DEFAULT false NOT NULL,
	"venue" text
);
--> statement-breakpoint
ALTER TABLE "course_variant" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "elective_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "elective_group" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "elective_option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elective_group_id" uuid NOT NULL,
	"course_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "elective_option" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "feature_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" "feature_status" DEFAULT 'open' NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL,
	"merged_into" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feature_request" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "feature_vote" (
	"request_id" uuid NOT NULL,
	"student_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feature_vote" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "group_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date
);
--> statement-breakpoint
ALTER TABLE "group_membership" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "override_confirmation" (
	"override_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "override_confirmation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "student" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"reg_no" text,
	"semester_start_date" date,
	"threshold" smallint DEFAULT 75 NOT NULL,
	"count_activity_slots" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "student_elective_choice" (
	"student_id" uuid NOT NULL,
	"elective_group_id" uuid NOT NULL,
	"course_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_elective_choice" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "timetable_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"period" smallint NOT NULL,
	"kind" "slot_kind" NOT NULL,
	"course_variant_id" uuid,
	"elective_group_id" uuid,
	"label" text,
	"block_id" uuid
);
--> statement-breakpoint
ALTER TABLE "timetable_entry" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "academic_group" ADD CONSTRAINT "academic_group_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_exception" ADD CONSTRAINT "attendance_exception_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_report" ADD CONSTRAINT "bug_report_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_report" ADD CONSTRAINT "bug_report_group_id_academic_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."academic_group"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_override" ADD CONSTRAINT "calendar_override_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_override" ADD CONSTRAINT "calendar_override_group_id_academic_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."academic_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_override" ADD CONSTRAINT "calendar_override_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course" ADD CONSTRAINT "course_group_id_academic_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."academic_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_variant" ADD CONSTRAINT "course_variant_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elective_group" ADD CONSTRAINT "elective_group_group_id_academic_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."academic_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elective_option" ADD CONSTRAINT "elective_option_elective_group_id_elective_group_id_fk" FOREIGN KEY ("elective_group_id") REFERENCES "public"."elective_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elective_option" ADD CONSTRAINT "elective_option_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_request" ADD CONSTRAINT "feature_request_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_request" ADD CONSTRAINT "feature_request_merged_into_feature_request_id_fk" FOREIGN KEY ("merged_into") REFERENCES "public"."feature_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_vote" ADD CONSTRAINT "feature_vote_request_id_feature_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."feature_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_vote" ADD CONSTRAINT "feature_vote_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_membership" ADD CONSTRAINT "group_membership_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_membership" ADD CONSTRAINT "group_membership_group_id_academic_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."academic_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "override_confirmation" ADD CONSTRAINT "override_confirmation_override_id_calendar_override_id_fk" FOREIGN KEY ("override_id") REFERENCES "public"."calendar_override"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "override_confirmation" ADD CONSTRAINT "override_confirmation_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student" ADD CONSTRAINT "student_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_elective_choice" ADD CONSTRAINT "student_elective_choice_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_elective_choice" ADD CONSTRAINT "student_elective_choice_elective_group_id_elective_group_id_fk" FOREIGN KEY ("elective_group_id") REFERENCES "public"."elective_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_elective_choice" ADD CONSTRAINT "student_elective_choice_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entry" ADD CONSTRAINT "timetable_entry_group_id_academic_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."academic_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entry" ADD CONSTRAINT "timetable_entry_course_variant_id_course_variant_id_fk" FOREIGN KEY ("course_variant_id") REFERENCES "public"."course_variant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entry" ADD CONSTRAINT "timetable_entry_elective_group_id_elective_group_id_fk" FOREIGN KEY ("elective_group_id") REFERENCES "public"."elective_group"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_calendar_unique" ON "academic_calendar" USING btree ("academic_year","track","date");--> statement-breakpoint
CREATE INDEX "academic_calendar_date_idx" ON "academic_calendar" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "academic_group_unique" ON "academic_group" USING btree ("academic_year","department","year","section","semester");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_exception_unique" ON "attendance_exception" USING btree ("student_id","date","period");--> statement-breakpoint
CREATE INDEX "attendance_exception_student_date_idx" ON "attendance_exception" USING btree ("student_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_override_student_unique" ON "calendar_override" USING btree ("student_id","date") WHERE "calendar_override"."scope" = 'student';--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_override_group_unique" ON "calendar_override" USING btree ("group_id","date") WHERE "calendar_override"."scope" = 'group';--> statement-breakpoint
CREATE INDEX "calendar_override_date_idx" ON "calendar_override" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_track_unique" ON "calendar_track" USING btree ("academic_year","key");--> statement-breakpoint
CREATE UNIQUE INDEX "course_group_code_unique" ON "course" USING btree ("group_id","code");--> statement-breakpoint
CREATE INDEX "course_variant_course_idx" ON "course_variant" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "elective_option_group_idx" ON "elective_option" USING btree ("elective_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_vote_pk" ON "feature_vote" USING btree ("request_id","student_id");--> statement-breakpoint
CREATE INDEX "group_membership_student_idx" ON "group_membership" USING btree ("student_id","valid_from");--> statement-breakpoint
CREATE INDEX "group_membership_group_idx" ON "group_membership" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "override_confirmation_pk" ON "override_confirmation" USING btree ("override_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_elective_choice_pk" ON "student_elective_choice" USING btree ("student_id","elective_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "timetable_entry_slot_unique" ON "timetable_entry" USING btree ("group_id","day_of_week","period");--> statement-breakpoint
CREATE POLICY "academic_calendar_select_all" ON "academic_calendar" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "academic_group_select_member" ON "academic_group" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from group_membership gm
        where gm.group_id = "academic_group"."id" and gm.student_id = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "attendance_exception_all_own" ON "attendance_exception" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "attendance_exception"."student_id") WITH CHECK ((select auth.uid()) = "attendance_exception"."student_id");--> statement-breakpoint
CREATE POLICY "bug_report_select_own" ON "bug_report" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "bug_report"."student_id");--> statement-breakpoint
CREATE POLICY "bug_report_insert_own" ON "bug_report" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "bug_report"."student_id");--> statement-breakpoint
CREATE POLICY "calendar_override_select_relevant" ON "calendar_override" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
        ("calendar_override"."scope" = 'student' and "calendar_override"."student_id" = (select auth.uid()))
        or ("calendar_override"."scope" = 'group' and exists (
          select 1 from group_membership gm
          where gm.group_id = "calendar_override"."group_id" and gm.student_id = (select auth.uid())
        ))
      );--> statement-breakpoint
CREATE POLICY "calendar_override_write_personal" ON "calendar_override" AS PERMISSIVE FOR ALL TO "authenticated" USING ("calendar_override"."scope" = 'student' and "calendar_override"."student_id" = (select auth.uid())) WITH CHECK ("calendar_override"."scope" = 'student' and "calendar_override"."student_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "calendar_track_select_all" ON "calendar_track" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "course_select_member" ON "course" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from group_membership gm
        where gm.group_id = "course"."group_id" and gm.student_id = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "course_variant_select_member" ON "course_variant" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from course c
        join group_membership gm on gm.group_id = c.group_id
        where c.id = "course_variant"."course_id" and gm.student_id = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "elective_group_select_member" ON "elective_group" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from group_membership gm
        where gm.group_id = "elective_group"."group_id" and gm.student_id = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "elective_option_select_member" ON "elective_option" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from elective_group eg
        join group_membership gm on gm.group_id = eg.group_id
        where eg.id = "elective_option"."elective_group_id" and gm.student_id = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "feature_request_select_all" ON "feature_request" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "feature_request_insert_own" ON "feature_request" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "feature_request"."student_id");--> statement-breakpoint
CREATE POLICY "feature_vote_select_all" ON "feature_vote" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "feature_vote_all_own" ON "feature_vote" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "feature_vote"."student_id") WITH CHECK ((select auth.uid()) = "feature_vote"."student_id");--> statement-breakpoint
CREATE POLICY "group_membership_select_own" ON "group_membership" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "group_membership"."student_id");--> statement-breakpoint
CREATE POLICY "override_confirmation_select_group" ON "override_confirmation" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from calendar_override co
        join group_membership gm on gm.group_id = co.group_id
        where co.id = "override_confirmation"."override_id" and gm.student_id = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "override_confirmation_insert_own" ON "override_confirmation" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "override_confirmation"."student_id");--> statement-breakpoint
CREATE POLICY "student_select_own" ON "student" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "student"."id");--> statement-breakpoint
CREATE POLICY "student_update_own" ON "student" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "student"."id") WITH CHECK ((select auth.uid()) = "student"."id");--> statement-breakpoint
CREATE POLICY "student_elective_choice_all_own" ON "student_elective_choice" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "student_elective_choice"."student_id") WITH CHECK ((select auth.uid()) = "student_elective_choice"."student_id");--> statement-breakpoint
CREATE POLICY "timetable_entry_select_member" ON "timetable_entry" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from group_membership gm
        where gm.group_id = "timetable_entry"."group_id" and gm.student_id = (select auth.uid())
      ));