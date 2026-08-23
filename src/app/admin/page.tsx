import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { academicGroup, bugReport, featureRequest } from "@/db/schema";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { logoutAdmin } from "./actions";
import { BugStatusSelect } from "./bug-status-select";
import { FeatureStatusSelect } from "./feature-status-select";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const [groups, bugs, features] = await Promise.all([
    db.select().from(academicGroup).orderBy(desc(academicGroup.createdAt)),
    db.select().from(bugReport).orderBy(desc(bugReport.createdAt)),
    db.select().from(featureRequest).orderBy(desc(featureRequest.voteCount)),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin</h1>
        <form action={logoutAdmin}>
          <button type="submit" className="text-sm text-gray-500">
            Sign out
          </button>
        </form>
      </div>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Groups &amp; timetable status</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="border-b p-2">Group</th>
              <th className="border-b p-2">Semester</th>
              <th className="border-b p-2">Timetable</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id}>
                <td className="border-b p-2">
                  {g.department} {g.year}
                  {g.section}
                </td>
                <td className="border-b p-2">{g.semester}</td>
                <td className="border-b p-2">{g.timetableStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Bug reports</h2>
        <ul className="flex flex-col gap-2">
          {bugs.map((b) => (
            <li key={b.id} className="rounded border border-gray-200 p-3 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-gray-400">{b.createdAt.toISOString()}</span>
                <BugStatusSelect id={b.id} status={b.status} />
              </div>
              <p>{b.description}</p>
              {b.expected && <p className="text-xs text-gray-500">Expected: {b.expected}</p>}
              {b.actual && <p className="text-xs text-gray-500">Actual: {b.actual}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-gray-500">Feature requests</h2>
        <ul className="flex flex-col gap-2">
          {features.map((f) => (
            <li key={f.id} className="flex items-center justify-between rounded border border-gray-200 p-3 text-sm">
              <div>
                <p className="font-medium">
                  {f.title} <span className="text-xs text-gray-400">▲{f.voteCount}</span>
                </p>
                {f.description && <p className="text-xs text-gray-500">{f.description}</p>}
              </div>
              <FeatureStatusSelect id={f.id} status={f.status} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
