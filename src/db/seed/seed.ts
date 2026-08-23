/**
 * Seeds calendar_track and academic_calendar. Run with `npm run db:seed`
 * against a real DATABASE_URL — this talks to Postgres, unlike
 * assert-calendar.ts which is pure and DB-free.
 */
import "@/lib/load-env";
import { db } from "@/db";
import { academicCalendar, calendarTrack } from "@/db/schema";
import { ACADEMIC_YEAR, CALENDAR_TRACKS } from "./calendar-data";
import { buildIIIIICalendarRows } from "./build-calendar-rows";

async function main() {
  console.log(`Seeding calendar tracks for ${ACADEMIC_YEAR}...`);
  for (const track of CALENDAR_TRACKS) {
    await db
      .insert(calendarTrack)
      .values({
        academicYear: ACADEMIC_YEAR,
        key: track.key,
        label: track.label,
        appliesToYears: track.appliesToYears,
        sourceNote: track.sourceNote,
        confidence: track.confidence,
      })
      .onConflictDoUpdate({
        target: [calendarTrack.academicYear, calendarTrack.key],
        set: {
          label: track.label,
          appliesToYears: track.appliesToYears,
          sourceNote: track.sourceNote,
          confidence: track.confidence,
        },
      });
  }

  const rows = buildIIIIICalendarRows();
  console.log(`Seeding ${rows.length} academic_calendar rows for II-III...`);
  for (const row of rows) {
    await db
      .insert(academicCalendar)
      .values(row)
      .onConflictDoUpdate({
        target: [academicCalendar.academicYear, academicCalendar.track, academicCalendar.date],
        set: {
          kind: row.kind,
          dayOrder: row.dayOrder,
          label: row.label,
          isProvisional: row.isProvisional,
        },
      });
  }

  console.log("Done. FY and IV tracks have no calendar rows yet — see calendar-data.ts.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
