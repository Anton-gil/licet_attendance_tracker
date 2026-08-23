"use client";

import { usePathname } from "next/navigation";
import { useRef } from "react";
import { submitBugReport } from "./actions";

export function BugReportForm() {
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await submitBugReport(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="route" value={pathname} />
      <input type="hidden" name="userAgent" value={typeof navigator !== "undefined" ? navigator.userAgent : ""} />
      <textarea name="description" required placeholder="What were you doing?" className="rounded border border-gray-300 px-2 py-1 text-sm" rows={2} />
      <textarea name="expected" placeholder="What did you expect?" className="rounded border border-gray-300 px-2 py-1 text-sm" rows={2} />
      <textarea name="actual" placeholder="What actually happened?" className="rounded border border-gray-300 px-2 py-1 text-sm" rows={2} />
      <button type="submit" className="self-start rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white">
        Report a bug
      </button>
    </form>
  );
}
