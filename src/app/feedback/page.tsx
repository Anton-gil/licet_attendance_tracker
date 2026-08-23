import { desc } from "drizzle-orm";
import { db } from "@/db";
import { featureRequest } from "@/db/schema";
import { requireStudent } from "@/lib/auth/require-student";
import { BugReportForm } from "./bug-report-form";
import { submitFeatureRequest } from "./actions";
import { VoteButton } from "./vote-button";

export default async function FeedbackPage() {
  await requireStudent();

  const requests = await db.select().from(featureRequest).orderBy(desc(featureRequest.voteCount));

  return (
    <main className="mx-auto max-w-lg px-6 py-8">
      <h1 className="text-xl font-semibold">Feedback</h1>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Report a bug</h2>
        <BugReportForm />
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Feature requests</h2>
        <form action={submitFeatureRequest} className="mb-4 flex flex-col gap-2">
          <input name="title" required placeholder="Title" className="rounded border border-gray-300 px-2 py-1 text-sm" />
          <textarea name="description" placeholder="Description" className="rounded border border-gray-300 px-2 py-1 text-sm" rows={2} />
          <button type="submit" className="self-start rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white">
            Suggest
          </button>
        </form>

        <ul className="flex flex-col gap-2">
          {requests.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{r.title}</p>
                {r.description && <p className="text-xs text-gray-500">{r.description}</p>}
                <p className="text-xs uppercase tracking-wide text-gray-400">{r.status}</p>
              </div>
              <VoteButton requestId={r.id} voteCount={r.voteCount} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
