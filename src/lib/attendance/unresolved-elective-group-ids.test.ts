import { describe, expect, it } from "vitest";
import { unresolvedElectiveGroupIds } from "./unresolved-elective-group-ids";

describe("unresolvedElectiveGroupIds (mandatory elective selection)", () => {
  it("is empty when every required elective has a choice", () => {
    expect(unresolvedElectiveGroupIds(["PE-1"], ["PE-1"])).toEqual([]);
  });

  it("lists a required elective group with no matching choice", () => {
    expect(unresolvedElectiveGroupIds(["PE-1"], [])).toEqual(["PE-1"]);
  });

  it("only flags the missing one when some are chosen and some aren't", () => {
    expect(unresolvedElectiveGroupIds(["PE-1", "PE-2"], ["PE-1"])).toEqual(["PE-2"]);
  });

  it("is empty when the timetable has no electives at all", () => {
    expect(unresolvedElectiveGroupIds([], [])).toEqual([]);
  });

  it("ignores a stray choice for an elective group not on this timetable", () => {
    expect(unresolvedElectiveGroupIds(["PE-1"], ["PE-99"])).toEqual(["PE-1"]);
  });
});
