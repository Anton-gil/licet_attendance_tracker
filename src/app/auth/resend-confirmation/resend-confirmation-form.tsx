"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isLicetEmail } from "@/lib/auth/licet-domain";

export function ResendConfirmationForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

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
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });

    if (resendError) {
      setStatus("error");
      setError(resendError.message);
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-gray-700">
        If <strong>{email}</strong> has an unconfirmed account, a fresh link is on its way. This one expires too —
        click it soon after it arrives.
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {status === "loading" ? "Sending..." : "Resend confirmation email"}
      </button>
    </form>
  );
}
