"use client";

import { useTransition } from "react";

export function StatusSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (next: string) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={value}
      disabled={isPending}
      onChange={(e) => startTransition(() => onChange(e.target.value))}
      className="rounded border border-gray-300 px-1 py-0.5 text-xs"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
