import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { groupMembership } from "@/db/schema";
import { requireStudent } from "@/lib/auth/require-student";
import { getStudentDashboardData } from "@/lib/attendance/for-student";
import { canMissBuffer } from "@/lib/attendance/recovery";
import { riskState } from "@/lib/attendance/risk";
import { todayIST } from "@/lib/date/ist";
import { redirect } from "next/navigation";
import { OdToggle } from "./od-toggle";

const RISK_STYLE: Record<string, string> = {
  below: "text-amber-700",
  fragile: "text-amber-700",
  comfortable: "text-gray-900",
  "no-data": "text-gray-400",
};

export default async function DashboardPage() {
  const student = await requireStudent();

  const today = todayIST();
  const active = await db
    .select({ id: groupMembership.id })
    .from(groupMembership)
    .where(
      and(
        eq(groupMembership.studentId, student.id),
        lte(groupMembership.validFrom, today),
        or(isNull(groupMembership.validTo), gte(groupMembership.validTo, today)),
      ),
    )
    .limit(1);
  if (!active[0]) redirect("/onboarding");

  const { attendance, remaining, asOf } = await getStudentDashboardData(student, today);
  const target = student.threshold;

  const overallRisk = riskState(attendance.overall.percentage, attendance.overall.present, attendance.overall.conducted, target);
  const overallBuffer = canMissBuffer({ present: attendance.overall.present, conducted: attendance.overall.conducted, targetPercent: target });

  const courseCodes = Object.keys(attendance.courses).sort();

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your attendance</h1>
        <Link href="/attendance" className="text-sm text-gray-500">
          Mark today →
        </Link>
      </div>

      <section className="mb-6 rounded border border-gray-200 p-4">
        <div className="flex items-baseline justify-between">
          <p className={`text-3xl font-semibold ${RISK_STYLE[overallRisk]}`}>
            {attendance.overall.percentage === null ? "—" : `${attendance.overall.percentage.toFixed(1)}%`}
          </p>
          <p className="text-sm text-gray-500">overall · target {target}%</p>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {attendance.overall.percentage === null
            ? "No instruction days recorded yet."
            : overallRisk === "below"
              ? `${overallBuffer} more absences before it's back over ${target}%.`
              : `Can miss ${overallBuffer} more and stay at/above ${target}%.`}
        </p>
        <OdToggle current={student.includeOdAsPresent} />
      </section>

      <h2 className="mb-2 text-sm font-medium text-gray-500">Courses</h2>
      <ul className="mb-6 flex flex-col gap-2">
        {courseCodes.map((code) => {
          const stats = attendance.courses[code];
          const risk = riskState(stats.percentage, stats.present, stats.conducted, target);
          const buffer = canMissBuffer({ present: stats.present, conducted: stats.conducted, targetPercent: target });
          return (
            <li key={code}>
              <Link
                href={`/dashboard/course/${code}`}
                className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 hover:bg-gray-50"
              >
                <span className="text-sm">{code}</span>
                <span className="text-right text-sm">
                  <span className={`font-medium ${RISK_STYLE[risk]}`}>
                    {stats.percentage === null ? "—" : `${stats.percentage.toFixed(1)}%`}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">can miss {buffer}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-gray-400">
        Estimate based on your timetable and the published academic calendar, as of {asOf}. Working days, holidays
        and exam dates are assumed and may have changed — substitutions and cancelled classes aren&apos;t tracked,
        so your official attendance will differ. {remaining.overall} instruction periods left this semester.
      </p>
    </main>
  );
}
