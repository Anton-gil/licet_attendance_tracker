"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/**
 * The personal-override escape hatch (spec §7.6) — instant, private, no
 * confirmation, always wins. Group overrides (two-confirmation, §7.5) are
 * a v2 feature; v1 ships this one first per the build order (§8 step 8).
 */
export function DateOverrideControl({
  studentId,
  date,
  hasPersonalOverride,
}: {
  studentId: string;
  date: string;
  hasPersonalOverride: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [dayOrder, setDayOrder] = useState(1);
  const router = useRouter();

  function apply(kind: "holiday" | "instruction") {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("calendar_override").upsert(
        {
          scope: "student",
          student_id: studentId,
          date,
          kind,
          day_order: kind === "instruction" ? dayOrder : null,
          created_by: studentId,
        },
        { onConflict: "student_id,date" },
      );
      router.refresh();
    });
  }

  function reset() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("calendar_override").delete().eq("scope", "student").eq("student_id", studentId).eq("date", date);
      router.refresh();
    });
  }

  return (
    <div className="rounded border border-gray-200 p-3 text-sm">
      <p className="mb-2 font-medium">Change this date — just for me</p>
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={isPending} onClick={() => apply("holiday")} className="rounded bg-gray-100 px-2 py-1 text-xs">
          Mark holiday
        </button>
        <button disabled={isPending} onClick={() => apply("instruction")} className="rounded bg-gray-100 px-2 py-1 text-xs">
          Mark working day, follows
        </button>
        <select
          value={dayOrder}
          onChange={(e) => setDayOrder(Number(e.target.value))}
          className="rounded border border-gray-300 px-1 py-0.5 text-xs"
        >
          {[1, 2, 3, 4, 5].map((d) => (
            <option key={d} value={d}>
              {DAY_NAMES[d]}
            </option>
          ))}
        </select>
        {hasPersonalOverride && (
          <button disabled={isPending} onClick={reset} className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">
            Reset to official calendar
          </button>
        )}
      </div>
    </div>
  );
}
