"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { student as studentTable } from "@/db/schema";
import { requireStudent } from "@/lib/auth/require-student";

/** The OD toggle (spec §19.2) — one switch, drives overall %, every course %, and the recovery calculator together. Persisted per student. */
export async function setIncludeOdAsPresent(next: boolean) {
  const student = await requireStudent();
  await db.update(studentTable).set({ includeOdAsPresent: next }).where(eq(studentTable.id, student.id));
  revalidatePath("/dashboard");
}
