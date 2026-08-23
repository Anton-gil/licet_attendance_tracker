import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { course, electiveGroup, electiveOption, groupMembership, studentElectiveChoice } from "@/db/schema";
import { requireStudent } from "@/lib/auth/require-student";
import { isMemberOfGroup } from "@/lib/auth/is-member-of-group";
import { saveElectiveChoices } from "./actions";

export default async function ElectivesPage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string }>;
}) {
  const student = await requireStudent();
  const { groupId } = await searchParams;
  if (!groupId) redirect("/onboarding");

  // §20-class trap: groupId is client-supplied (a query param). Without
  // this, any signed-in student could browse — and, via the form below,
  // submit choices against — any other section's electives.
  const memberships = await db
    .select({ groupId: groupMembership.groupId })
    .from(groupMembership)
    .where(eq(groupMembership.studentId, student.id));
  if (!isMemberOfGroup(memberships, groupId)) redirect("/onboarding");

  const rows = await db
    .select({
      electiveGroupId: electiveGroup.id,
      label: electiveGroup.label,
      courseId: course.id,
      code: course.code,
      name: course.name,
    })
    .from(electiveGroup)
    .innerJoin(electiveOption, eq(electiveOption.electiveGroupId, electiveGroup.id))
    .innerJoin(course, eq(course.id, electiveOption.courseId))
    .where(eq(electiveGroup.groupId, groupId));

  const existingChoices = await db
    .select()
    .from(studentElectiveChoice)
    .where(eq(studentElectiveChoice.studentId, student.id));
  const choiceByGroup = new Map(existingChoices.map((c) => [c.electiveGroupId, c.courseId]));

  const groups = new Map<string, { label: string; options: { courseId: string; code: string; name: string }[] }>();
  for (const row of rows) {
    const g = groups.get(row.electiveGroupId) ?? { label: row.label, options: [] };
    g.options.push({ courseId: row.courseId, code: row.code, name: row.name });
    groups.set(row.electiveGroupId, g);
  }

  if (groups.size === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
        <p className="text-sm text-gray-600">This section has no electives to choose between.</p>
        <form action={saveElectiveChoices.bind(null, groupId)}>
          <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white">
            Continue to dashboard
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="text-xl font-semibold">Pick your electives</h1>
      <p className="mt-1 text-sm text-gray-600">Changeable later in settings.</p>
      <form action={saveElectiveChoices.bind(null, groupId)} className="mt-6 flex flex-col gap-6">
        {Array.from(groups.entries()).map(([electiveGroupId, g]) => (
          <fieldset key={electiveGroupId} className="flex flex-col gap-2">
            <legend className="text-sm font-medium">{g.label}</legend>
            {g.options.map((opt) => (
              <label key={opt.courseId} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`elective:${electiveGroupId}`}
                  value={opt.courseId}
                  defaultChecked={choiceByGroup.get(electiveGroupId) === opt.courseId}
                  required
                />
                {opt.code} — {opt.name}
              </label>
            ))}
          </fieldset>
        ))}
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white">
          Continue to dashboard
        </button>
      </form>
    </main>
  );
}
