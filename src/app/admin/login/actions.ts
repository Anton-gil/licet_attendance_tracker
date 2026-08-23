"use server";

import { redirect } from "next/navigation";
import { trySetAdminSession } from "@/lib/admin/auth";

export async function loginAsAdmin(formData: FormData) {
  const ok = await trySetAdminSession(String(formData.get("password") ?? ""));
  redirect(ok ? "/admin" : "/admin/login?error=1");
}
