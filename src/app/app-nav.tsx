import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export async function AppNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 px-6 py-3 text-sm">
      <div className="flex gap-4">
        <Link href="/dashboard" className="font-medium">
          Attendance Tracker
        </Link>
        <Link href="/attendance" className="text-gray-500">
          Mark
        </Link>
        <Link href="/feedback" className="text-gray-500">
          Feedback
        </Link>
      </div>
      <form action={signOut}>
        <button type="submit" className="text-gray-500">
          Sign out
        </button>
      </form>
    </nav>
  );
}
