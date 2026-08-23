import { redirect } from "next/navigation";
import { db } from "@/db";
import { student } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { isLicetEmail } from "./licet-domain";

export type CurrentStudent = typeof student.$inferSelect;

/**
 * Every protected page starts with this. Confirms a signed-in LICET
 * session and returns the `student` row, creating it on first login if
 * it's missing (student_insert_own RLS policy would also allow the
 * browser to do this, but doing it once here — server-trusted, scoped to
 * this exact user id — means every other page can assume the row exists).
 */
export async function requireStudent(): Promise<CurrentStudent> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/auth/login");
  }

  if (!isLicetEmail(user.email)) {
    await supabase.auth.signOut();
    redirect("/auth/login?error=domain");
  }

  const existing = await db.select().from(student).where(eq(student.id, user.id)).limit(1);
  if (existing[0]) return existing[0];

  const inserted = await db
    .insert(student)
    .values({
      id: user.id,
      email: user.email,
      name: user.email.split("@")[0],
    })
    .onConflictDoNothing()
    .returning();

  if (inserted[0]) return inserted[0];

  // Lost a race with another request creating the same row concurrently.
  const [row] = await db.select().from(student).where(eq(student.id, user.id)).limit(1);
  return row;
}
