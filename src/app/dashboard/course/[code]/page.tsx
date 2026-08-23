import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth/require-student";
import { getStudentDashboardData } from "@/lib/attendance/for-student";
import { canMissBudget, canMissBuffer, recover } from "@/lib/attendance/recovery";
import { todayIST } from "@/lib/date/ist";

export default async function CourseDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const student = await requireStudent();
  const { code } = await params;

  const { attendance, remaining } = await getStudentDashboardData(student, todayIST());
  const stats = attendance.courses[code];
  if (!stats) notFound();

  const target = student.threshold;
  const remainingPeriods = remaining.perCourse[code] ?? 0;

  const buffer = canMissBuffer({ present: stats.present, conducted: stats.conducted, targetPercent: target });
  const budget = canMissBudget({ present: stats.present, conducted: stats.conducted, targetPercent: target, remainingPeriods });
  const recovery = recover({
    present: stats.present,
    conducted: stats.conducted,
    targetPercent: target,
    remainingInstructionPeriods: remainingPeriods,
  });

  return (
    <main className="mx-auto max-w-lg px-6 py-8">
      <Link href="/dashboard" className="text-sm text-gray-500">
        ← Dashboard
      </Link>
      <h1 className="mt-2 text-xl font-semibold">{code}</h1>
      <p className="text-3xl font-semibold">{stats.percentage === null ? "—" : `${stats.percentage.toFixed(1)}%`}</p>
      <p className="mt-1 text-sm text-gray-600">
        {stats.present} present of {stats.conducted} conducted ({stats.absent} absent, {stats.od} OD).
      </p>

      <div className="mt-6 rounded border border-gray-200 p-4 text-sm">
        <p>
          <strong>Can miss {buffer} more</strong> right now and stay at/above {target}%.
        </p>
        <p className="mt-1 text-gray-600">
          Across the rest of the semester: {budget}, if you attend everything else in between.
        </p>
      </div>

      <div className="mt-4 rounded border border-gray-200 p-4 text-sm">
        {recovery.reachable ? (
          recovery.needed === 0 ? (
            <p>Already at or above {target}%.</p>
          ) : (
            <p>
              About {recovery.needed} more classes to reach {target}% — roughly {remainingPeriods} periods left for
              this course before instruction ends.
            </p>
          )
        ) : (
          <p>
            {target}% isn&apos;t reachable for {code} from here — attending everything left lands around{" "}
            {recovery.bestCasePercentage.toFixed(1)}%.
          </p>
        )}
      </div>

      <p className="mt-6 text-xs text-gray-400">Estimate based on your timetable. Not official.</p>
    </main>
  );
}
