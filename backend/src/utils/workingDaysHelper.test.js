import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countWeeklyOffDaysInMonth,
  getHolidayYmdSetForMonth,
  getPlannedWorkingDaysBreakdown,
  getWeeklyOffDaySet,
  isWeeklyOffDate,
} from "./workingDaysHelper.js";

describe("workingDaysHelper", () => {
  it("getWeeklyOffDaySet uses weeklyOffDays when provided", () => {
    const s = getWeeklyOffDaySet({ weeklyOffDays: [2], workingDayType: 8 });
    assert.deepEqual([...s].sort(), [2]);
  });

  it("getWeeklyOffDaySet falls back to workingDayType presets", () => {
    assert.deepEqual([...getWeeklyOffDaySet({ workingDayType: 2 })].sort(), [5, 6]); // Fri+Sat — mirror FE workingDays.js
    assert.deepEqual([...getWeeklyOffDaySet({ workingDayType: 4 })].sort(), [0]);
    assert.deepEqual([...getWeeklyOffDaySet({ workingDayType: 8 })].sort(), [0, 6]);
    assert.deepEqual([...getWeeklyOffDaySet({ workingDayType: 0 })].length, 0);
  });

  it("getWeeklyOffDaySet defaults to Sunday when empty", () => {
    assert.deepEqual([...getWeeklyOffDaySet({})].sort(), [0]);
  });

  it("countWeeklyOffDaysInMonth: Feb 2026 all Sundays", () => {
    // Feb 2026: 28 days, 4 Sundays
    const set = new Set([0]);
    assert.equal(countWeeklyOffDaysInMonth(2026, 2, set), 4);
  });

  it("getHolidayYmdSetForMonth filters to month", () => {
    const settings = {
      holidays: [{ date: new Date(2026, 0, 1) }, { date: new Date(2026, 1, 15) }],
    };
    const jan = getHolidayYmdSetForMonth(2026, 1, settings);
    assert.equal(jan.size, 1);
    assert.ok(jan.has("2026-01-01"));
  });

  it("getPlannedWorkingDaysBreakdown never goes below 1", () => {
    const set = new Set([0, 1, 2, 3, 4, 5, 6]);
    const b = getPlannedWorkingDaysBreakdown(2026, 2, set, { holidays: [] });
    assert.equal(b.plannedWorkingDays, 1);
  });

  it("isWeeklyOffDate respects weekly off set", () => {
    const set = new Set([2]); // Tuesday
    assert.equal(isWeeklyOffDate("2026-04-07", set), true); // Tue
    assert.equal(isWeeklyOffDate("2026-04-06", set), false); // Mon
  });
});
