"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setStatus("error");
      setError(updateError.message);
      return;
    }

    await supabase.auth.signOut();
    router.push("/auth/login?reset=1");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="password" className="text-sm font-medium">
        New password
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
        Confirm new password
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
        {status === "loading" ? "Saving..." : "Set new password"}
      </button>
    </form>
  );
}
