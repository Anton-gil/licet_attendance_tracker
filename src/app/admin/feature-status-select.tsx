"use client";

import { featureStatusEnum } from "@/db/schema";
import { setFeatureStatus } from "./actions";
import { StatusSelect } from "./status-select";

export function FeatureStatusSelect({ id, status }: { id: string; status: string }) {
  return (
    <StatusSelect
      value={status}
      options={featureStatusEnum.enumValues}
      onChange={(next) => setFeatureStatus(id, next as (typeof featureStatusEnum.enumValues)[number])}
    />
  );
}
