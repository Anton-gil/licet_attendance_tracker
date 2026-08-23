"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isLicetEmail } from "@/lib/auth/licet-domain";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isLicetEmail(email)) {
      setStatus("error");
      setError("Use your LICET email address (@licet.ac.in).");
      return;
    }

    setStatus("loading");
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setStatus("error");
      setError(signInError.message === "Email not confirmed" ? "Confirm your email first — check your inbox." : "Wrong email or password.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="email" className="text-sm font-medium">
        LICET email
      </label>
      <input
        id="email"
        type="email"
        required
        placeholder="you@licet.ac.in"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="flex items-center justify-between">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <Link href="/auth/forgot-password" className="text-xs text-gray-500">
          Forgot password?
        </Link>
      </div>
      <input
        id="password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {status === "loading" ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-center text-sm text-gray-500">
        New here?{" "}
        <Link href="/auth/signup" className="font-medium text-gray-900">
          Create an account
        </Link>
      </p>
    </form>
  );
}
