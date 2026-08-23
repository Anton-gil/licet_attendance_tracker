"use client";

import { useTransition } from "react";
import { setIncludeOdAsPresent } from "./actions";

export function OdToggle({ current }: { current: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <label className="mt-3 flex items-center gap-2 text-xs text-gray-600">
      <input
        type="checkbox"
        checked={current}
        disabled={isPending}
        onChange={(e) => startTransition(() => setIncludeOdAsPresent(e.target.checked))}
      />
      Include OD as present
    </label>
  );
}
