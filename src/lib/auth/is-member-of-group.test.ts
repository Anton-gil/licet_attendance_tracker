import { describe, expect, it } from "vitest";
import { isMemberOfGroup } from "./is-member-of-group";

describe("isMemberOfGroup (guards saveCell/finishTimetable/elective writes against a client-supplied groupId)", () => {
  it("is true when the student has a membership row for that group", () => {
    expect(isMemberOfGroup([{ groupId: "A" }, { groupId: "B" }], "B")).toBe(true);
  });

  it("is false for a group the student has never belonged to — the case a forged request would hit", () => {
    expect(isMemberOfGroup([{ groupId: "A" }], "C")).toBe(false);
  });

  it("is false with no memberships at all", () => {
    expect(isMemberOfGroup([], "A")).toBe(false);
  });
});
