ALTER TABLE "student" ADD COLUMN "include_od_as_present" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "course_variant_course_abbrev_unique" ON "course_variant" USING btree ("course_id","abbrev");--> statement-breakpoint
CREATE UNIQUE INDEX "elective_group_group_label_unique" ON "elective_group" USING btree ("group_id","label");--> statement-breakpoint
CREATE UNIQUE INDEX "elective_option_group_course_unique" ON "elective_option" USING btree ("elective_group_id","course_id");