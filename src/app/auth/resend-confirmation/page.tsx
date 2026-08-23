import { ResendConfirmationForm } from "./resend-confirmation-form";

export default function ResendConfirmationPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-xl font-semibold">Get a new confirmation link</h1>
        <p className="mt-1 text-sm text-gray-600">The one you clicked expired or was already used.</p>
      </div>
      <ResendConfirmationForm />
    </main>
  );
}
