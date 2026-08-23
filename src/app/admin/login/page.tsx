import { loginAsAdmin } from "./actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-lg font-semibold">Admin</h1>
      {error && <p className="text-sm text-red-600">Wrong password.</p>}
      <form action={loginAsAdmin} className="flex flex-col gap-3">
        <input
          type="password"
          name="password"
          required
          placeholder="Password"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white">
          Sign in
        </button>
      </form>
    </main>
  );
}
