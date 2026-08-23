import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error_code?: string }>;
}) {
  // Supabase's own auth server redirects here (the project's configured
  // "Site URL") on a failed email link — expired, already used, or
  // malformed — before our code ever runs. It never reaches
  // /auth/callback in this case, so this is the only place that sees it.
  const { error_code } = await searchParams;
  if (error_code === "otp_expired") {
    redirect("/auth/login?error=expired");
  }
  if (error_code) {
    redirect("/auth/login?error=link");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/auth/login");
}
