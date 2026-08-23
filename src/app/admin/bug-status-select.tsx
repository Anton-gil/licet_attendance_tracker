"use client";

import { bugStatusEnum } from "@/db/schema";
import { setBugStatus } from "./actions";
import { StatusSelect } from "./status-select";

export function BugStatusSelect({ id, status }: { id: string; status: string }) {
  return (
    <StatusSelect
      value={status}
      options={bugStatusEnum.enumValues}
      onChange={(next) => setBugStatus(id, next as (typeof bugStatusEnum.enumValues)[number])}
    />
  );
}
