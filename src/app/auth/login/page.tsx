import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; confirmed?: string; reset?: string }>;
}) {
  const { error, confirmed, reset } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-xl font-semibold">Attendance Tracker</h1>
        <p className="mt-1 text-sm text-gray-600">
          LICET students only. Estimate based on your timetable — not official.
        </p>
      </div>
      {error === "domain" && (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          That account isn&apos;t a LICET email — sign in with your @licet.ac.in address.
        </p>
      )}
      {error === "link" && (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          That link has expired or was already used — try again.
        </p>
      )}
      {error === "expired" && (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          That confirmation link expired.{" "}
          <Link href="/auth/resend-confirmation" className="font-medium underline">
            Get a new one
          </Link>
          .
        </p>
      )}
      {confirmed === "1" && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-800">Email confirmed — sign in below.</p>
      )}
      {reset === "1" && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-800">Password updated — sign in below.</p>
      )}
      <LoginForm />
    </main>
  );
}
