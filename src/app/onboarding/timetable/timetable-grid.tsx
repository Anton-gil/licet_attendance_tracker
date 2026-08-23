"use client";

import { useState } from "react";
import { COLLEGE } from "@/config/college";
import { saveCell, type CellDraft } from "./actions";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function emptyDraft(kind: CellDraft["kind"] = "empty"): CellDraft {
  if (kind === "course") return { kind, code: "", name: "", abbrev: "", isLab: false };
  if (kind === "elective") return { kind, label: "PE-1", optionA: { code: "", name: "" }, optionB: { code: "", name: "" } };
  if (kind === "activity" || kind === "admin") return { kind, label: kind === "activity" ? "ABSL" : "MENTORING" };
  return { kind: "empty" };
}

export function TimetableGrid({
  groupId,
  initialCells,
}: {
  groupId: string;
  initialCells: Record<string, CellDraft>;
}) {
  const [cells, setCells] = useState<Record<string, CellDraft>>(initialCells);

  const filled = Object.values(cells).filter((c) => c.kind !== "empty").length;

  function updateCell(day: number, period: number, draft: CellDraft) {
    const key = `${day}-${period}`;
    setCells((prev) => ({ ...prev, [key]: draft }));
    void saveCell(groupId, day, period, draft);
  }

  return (
    <div>
      <p className="my-3 text-sm font-medium">
        <span className={filled === COLLEGE.periodsPerWeek ? "text-green-700" : "text-gray-700"}>
          {filled}/{COLLEGE.periodsPerWeek}
        </span>{" "}
        periods filled
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-2 text-left">Period</th>
              {DAY_LABELS.map((d) => (
                <th key={d} className="border p-2 text-left">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COLLEGE.periods.map((p) => (
              <tr key={p.n}>
                <td className="border p-2 align-top text-xs text-gray-500">
                  P{p.n}
                  <br />
                  {p.start}
                </td>
                {[1, 2, 3, 4, 5].map((day) => {
                  const key = `${day}-${p.n}`;
                  return (
                    <td key={key} className="border p-1 align-top">
                      <TimetableCell draft={cells[key] ?? { kind: "empty" }} onChange={(d) => updateCell(day, p.n, d)} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TimetableCell({ draft, onChange }: { draft: CellDraft; onChange: (draft: CellDraft) => void }) {
  return (
    <div className="flex min-w-40 flex-col gap-1">
      <select
        value={draft.kind}
        onChange={(e) => onChange(emptyDraft(e.target.value as CellDraft["kind"]))}
        className="rounded border border-gray-300 px-1 py-0.5 text-xs"
      >
        <option value="empty">—</option>
        <option value="course">Course</option>
        <option value="elective">Elective</option>
        <option value="activity">Activity (ABSL)</option>
        <option value="admin">Admin (Mentoring)</option>
      </select>

      {draft.kind === "course" && (
        <>
          <input
            placeholder="Code"
            value={draft.code}
            onChange={(e) => onChange({ ...draft, code: e.target.value.toUpperCase() })}
            className="rounded border border-gray-300 px-1 py-0.5 text-xs"
          />
          <input
            placeholder="Name"
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            className="rounded border border-gray-300 px-1 py-0.5 text-xs"
          />
          <input
            placeholder="Abbrev (CN / CN Lab)"
            value={draft.abbrev}
            onChange={(e) => onChange({ ...draft, abbrev: e.target.value })}
            className="rounded border border-gray-300 px-1 py-0.5 text-xs"
          />
          <label className="flex items-center gap-1 text-[11px] text-gray-600">
            <input type="checkbox" checked={draft.isLab} onChange={(e) => onChange({ ...draft, isLab: e.target.checked })} />
            Lab
          </label>
        </>
      )}

      {draft.kind === "elective" && (
        <>
          <input
            placeholder="Elective label (PE-1)"
            value={draft.label}
            onChange={(e) => onChange({ ...draft, label: e.target.value })}
            className="rounded border border-gray-300 px-1 py-0.5 text-xs"
          />
          {(["optionA", "optionB"] as const).map((slot) => (
            <div key={slot} className="rounded border border-gray-200 p-1">
              <input
                placeholder="Option code"
                value={draft[slot].code}
                onChange={(e) => onChange({ ...draft, [slot]: { ...draft[slot], code: e.target.value.toUpperCase() } })}
                className="mb-1 w-full rounded border border-gray-300 px-1 py-0.5 text-xs"
              />
              <input
                placeholder="Option name"
                value={draft[slot].name}
                onChange={(e) => onChange({ ...draft, [slot]: { ...draft[slot], name: e.target.value } })}
                className="w-full rounded border border-gray-300 px-1 py-0.5 text-xs"
              />
            </div>
          ))}
        </>
      )}

      {(draft.kind === "activity" || draft.kind === "admin") && (
        <input
          value={draft.label}
          onChange={(e) => onChange({ ...draft, label: e.target.value })}
          className="rounded border border-gray-300 px-1 py-0.5 text-xs"
        />
      )}
    </div>
  );
}
