import { requireStudent } from "@/lib/auth/require-student";
import { db } from "@/db";
import { groupMembership } from "@/db/schema";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { todayIST } from "@/lib/date/ist";
import { redirect } from "next/navigation";
import { FULL_DISCLAIMER } from "@/lib/disclaimers";
import { joinOrCreateGroup } from "./actions";

export default async function OnboardingPage() {
  const student = await requireStudent();

  const today = todayIST();
  const active = await db
    .select({ groupId: groupMembership.groupId })
    .from(groupMembership)
    .where(
      and(
        eq(groupMembership.studentId, student.id),
        lte(groupMembership.validFrom, today),
        or(isNull(groupMembership.validTo), gte(groupMembership.validTo, today)),
      ),
    )
    .limit(1);

  if (active[0]) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-xl font-semibold">Find your section</h1>
        <p className="mt-1 text-sm text-gray-600">
          If your section already exists you&apos;ll join it. Otherwise you&apos;ll be the first to set up its
          timetable.
        </p>
      </div>
      <form action={joinOrCreateGroup} className="flex flex-col gap-3">
        <Field label="Department" name="department" placeholder="AD" />
        <Field label="Year" name="year" type="number" min={1} max={4} placeholder="3" />
        <Field label="Section" name="section" placeholder="A" />
        <Field label="Semester" name="semester" type="number" min={1} max={8} placeholder="5" />
        <button type="submit" className="mt-2 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white">
          Continue
        </button>
      </form>
      <p className="text-xs text-gray-400">{FULL_DISCLAIMER}</p>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        min={min}
        max={max}
        className="rounded border border-gray-300 px-3 py-2 text-sm font-normal"
      />
    </label>
  );
}
