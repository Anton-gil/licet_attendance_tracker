"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isLicetEmail } from "@/lib/auth/licet-domain";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
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
    if (password.length < 6) {
      setStatus("error");
      setError("Password needs to be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setError("Passwords don't match.");
      return;
    }

    setStatus("loading");
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });

    if (signUpError) {
      setStatus("error");
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      // Email confirmation is off for this project — already signed in.
      router.push("/onboarding");
      router.refresh();
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-gray-700">
        Check <strong>{email}</strong> to confirm your account, then come back and sign in.
      </p>
    );
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
      <label htmlFor="password" className="text-sm font-medium">
        Password
      </label>
      <input
        id="password"
        type="password"
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      />
      <label htmlFor="confirmPassword" className="text-sm font-medium">
        Confirm password
      </label>
      <input
        id="confirmPassword"
        type="password"
        required
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {status === "loading" ? "Creating account..." : "Create account"}
      </button>
      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium text-gray-900">
          Sign in
        </Link>
      </p>
    </form>
  );
}
