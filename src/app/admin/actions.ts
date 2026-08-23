"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bugReport, bugStatusEnum, featureRequest, featureStatusEnum } from "@/db/schema";
import { clearAdminSession, isAdminAuthenticated } from "@/lib/admin/auth";

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}

export async function setBugStatus(id: string, status: (typeof bugStatusEnum.enumValues)[number]) {
  await requireAdmin();
  await db.update(bugReport).set({ status }).where(eq(bugReport.id, id));
  revalidatePath("/admin");
}

export async function setFeatureStatus(id: string, status: (typeof featureStatusEnum.enumValues)[number]) {
  await requireAdmin();
  await db.update(featureRequest).set({ status }).where(eq(featureRequest.id, id));
  revalidatePath("/admin");
}

export async function logoutAdmin() {
  await clearAdminSession();
  redirect("/admin/login");
}
