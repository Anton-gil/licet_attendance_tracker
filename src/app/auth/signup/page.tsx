import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-xl font-semibold">Create an account</h1>
        <p className="mt-1 text-sm text-gray-600">
          LICET students only. We&apos;ll email you to confirm it&apos;s really you — after that, sign in with your
          password.
        </p>
      </div>
      <SignupForm />
    </main>
  );
}
