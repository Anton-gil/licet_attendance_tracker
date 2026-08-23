"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "present" | "absent" | "od";

const OD_REASONS = [
  { value: "college_event", label: "College event" },
  { value: "sports", label: "Sports" },
  { value: "placement", label: "Placement" },
  { value: "medical", label: "Medical" },
  { value: "other", label: "Other" },
] as const;

/**
 * Present is never stored (invariant 1) — "Present" here just means
 * deleting any exception row for this period. Writes go straight to
 * Supabase from the browser, RLS-protected (attendance_exception_all_own),
 * so this stays instant with no server round trip through Next.js.
 */
export function PeriodMarker({
  studentId,
  date,
  period,
  initialStatus,
}: {
  studentId: string;
  date: string;
  period: number;
  initialStatus: Status;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [odReason, setOdReason] = useState<string>("other");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function setPeriod(next: Status, reason?: string) {
    setStatus(next);
    startTransition(async () => {
      const supabase = createClient();
      if (next === "present") {
        await supabase.from("attendance_exception").delete().eq("date", date).eq("period", period);
      } else {
        await supabase.from("attendance_exception").upsert(
          {
            student_id: studentId,
            date,
            period,
            status: next,
            od_reason: next === "od" ? (reason ?? odReason) : null,
          },
          { onConflict: "student_id,date,period" },
        );
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {(["present", "absent", "od"] as const).map((s) => (
        <button
          key={s}
          disabled={isPending}
          onClick={() => setPeriod(s)}
          className={`rounded px-2 py-1 text-xs font-medium ${
            status === s
              ? s === "absent"
                ? "bg-red-100 text-red-800"
                : s === "od"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-500"
          } disabled:opacity-50`}
        >
          {s === "present" ? "Present" : s === "absent" ? "Absent" : "OD"}
        </button>
      ))}
      {status === "od" && (
        <select
          value={odReason}
          onChange={(e) => {
            setOdReason(e.target.value);
            setPeriod("od", e.target.value);
          }}
          className="rounded border border-gray-300 px-1 py-0.5 text-xs"
        >
          {OD_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
