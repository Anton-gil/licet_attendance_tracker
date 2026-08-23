"use client";

import { useTransition } from "react";
import { toggleVote } from "./actions";

export function VoteButton({ requestId, voteCount }: { requestId: string; voteCount: number }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => toggleVote(requestId))}
      className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 disabled:opacity-50"
    >
      ▲ {voteCount}
    </button>
  );
}
