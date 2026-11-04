import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  parseRentalTime,
  rentalDays,
  formatRentalTime,
  parseBookingInstant,
  taipeiInputInstant,
} from "../lib/booking-time";
import { resolveBookingPolicy, bookingPolicyError } from "../lib/booking-policy";

// Reproduce the host-local parser from 51c0169/f856dc3, not today's API policy.
// Separate processes keep each runtime's TZ independent of the unit runner.
function historicalInstants(tz: string, inputs: string[]): string[] {
  const run = spawnSync(process.execPath, ["-e", `
    function parseDateTime(value) {
      if (typeof value !== "string") return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    console.log(JSON.stringify(JSON.parse(process.argv[1]).map(value => parseDateTime(value)?.toISOString() ?? null)));
  `, JSON.stringify(inputs)], { env: { ...process.env, TZ: tz }, encoding: "utf8", timeout: 10000 });
  assert.ifError(run.error);
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout) as (string | null)[];
  assert.equal(result.length, inputs.length);
  assert.ok(result.every((value): value is string => typeof value === "string"));
  return result as string[];
}

test("historical naive parsing depends on UTC, Taipei and the DST-observing server zone", () => {
  const input = ["2020-07-01T10:00", "2020-01-01T10:00"];
  assert.deepEqual(historicalInstants("UTC", input), ["2020-07-01T10:00:00.000Z", "2020-01-01T10:00:00.000Z"]);
  assert.deepEqual(historicalInstants("Asia/Taipei", input), ["2020-07-01T02:00:00.000Z", "2020-01-01T02:00:00.000Z"]);
  assert.deepEqual(historicalInstants("America/Los_Angeles", input), ["2020-07-01T17:00:00.000Z", "2020-01-01T18:00:00.000Z"]);
});

test("historical explicit offsets identify one instant across server zones", () => {
  const inputs = ["2020-07-01T10:00+08:00", "2020-07-01T02:00Z", "2020-06-30T19:00-07:00"];
  for (const tz of ["UTC", "Asia/Taipei", "America/Los_Angeles"])
    assert.deepEqual(historicalInstants(tz, inputs), inputs.map(() => "2020-07-01T02:00:00.000Z"));
});

test("a stored timestamp cannot distinguish original strings, server zones or participant intent", () => {
  const origins = [
    historicalInstants("UTC", ["2020-07-01T10:00"])[0],
    historicalInstants("Asia/Taipei", ["2020-07-01T18:00"])[0],
    historicalInstants("America/Los_Angeles", ["2020-07-01T10:00Z"])[0],
  ];
  assert.equal(new Set(origins).size, 1, "Different input origins collapse to the same stored instant.");
  const stored = Object.freeze({ startAt: origins[0] });
  assert.equal(stored.startAt, "2020-07-01T10:00:00.000Z");
  // If the first input actually meant Taipei 10:00, its intended instant differs.
  // The stored row does not tell us whether that claim is true.
  const claimedIntent = historicalInstants("Asia/Taipei", ["2020-07-01T10:00"])[0];
  assert.notEqual(claimedIntent, stored.startAt);
  assert.deepEqual(Object.keys(stored), ["startAt"]);
});

test("historical DST interpretation changes elapsed duration and ceil-day billing", () => {
  const fall = ["2020-10-31T12:00", "2020-11-01T12:00"];
  const spring = ["2020-03-07T12:00", "2020-03-08T12:00"];
  const hours = (values: string[]) => (Date.parse(values[1]) - Date.parse(values[0])) / 3600000;
  for (const tz of ["UTC", "Asia/Taipei"]) {
    assert.equal(hours(historicalInstants(tz, fall)), 24);
    assert.equal(hours(historicalInstants(tz, spring)), 24);
  }
  const losAngelesFall = historicalInstants("America/Los_Angeles", fall);
  assert.equal(hours(losAngelesFall), 25);
  assert.equal(Math.ceil(hours(losAngelesFall) / 24), 2);
  assert.equal(Math.ceil(hours(historicalInstants("Asia/Taipei", fall)) / 24), 1);
  assert.equal(hours(historicalInstants("America/Los_Angeles", spring)), 23);
});

test("a selective hypothetical endpoint correction can introduce a reservation overlap", () => {
  const stored = Object.freeze({ start: "2020-07-01T10:00Z", end: "2020-07-01T12:00Z" });
  const alreadyCorrect = Object.freeze({ start: "2020-07-01T03:00Z", end: "2020-07-01T05:00Z" });
  // Synthetic before/after proposal only: no correction function or database write.
  const proposed = Object.freeze({ start: "2020-07-01T02:00Z", end: "2020-07-01T04:00Z" });
  const overlap = (a: { start: string; end: string }, b: { start: string; end: string }) => Date.parse(a.start) < Date.parse(b.end) && Date.parse(a.end) > Date.parse(b.start);
  assert.equal(overlap(stored, alreadyCorrect), false);
  assert.equal(overlap(proposed, alreadyCorrect), true);
  assert.equal(stored.start, "2020-07-01T10:00Z");
  assert.equal(alreadyCorrect.start, "2020-07-01T03:00Z");
});

test("Taipei wall time denotes the same instant under UTC and American host clocks", () => {
  const previous = process.env.TZ;
  try {
    for (const tz of ["UTC", "America/Los_Angeles", "Asia/Taipei"]) {
      process.env.TZ = tz;
      const start = parseRentalTime("2030-02-28T10:00")!;
      assert.equal(start.toISOString(), "2030-02-28T02:00:00.000Z");
      assert.equal(
        parseRentalTime("2030-02-28T10:00:00+08:00")!.getTime(),
        start.getTime(),
      );
      assert.match(formatRentalTime(start), /10:00 AM.*Asia\/Taipei/);
      assert.equal(rentalDays(start, parseRentalTime("2030-03-01T10:01")!), 2);
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
test("rejects impossible dates, invalid clock fields and ambiguous strings", () => {
  for (const input of [
    "2030-02-29T10:00",
    "2030-04-31T10:00",
    "2030-01-00T10:00",
    "2030-13-01T10:00",
    "2030-01-01T24:00",
    "2030-01-01T10:60",
    "2030-01-01T10:00:60",
    "2030-01-01T10:00:00+08:99",
    "03/01/2030",
    "",
    null,
  ])
    assert.equal(parseRentalTime(input), null);
  assert.ok(parseRentalTime("2032-02-29T10:00"));
});

test("explicit instants validate calendar, offset and millisecond precision before conversion", () => {
  for (const value of ["2030-02-28T10:00", "2030-02-30T10:00Z", "2030-01-01T24:00Z",
    "2030-01-01T10:00:60Z", "2030-01-01T10:00:00.0001Z", "2030-01-01T10:00+0800",
    "2030-01-01T10:00+24:00", "2030-01-01T10:00+08:60", "2030-01-01T10:00-00:00",
    " 2030-01-01T10:00Z", "2030-01-01", "2030-01-01T10:00z", "9999-12-31T23:59-23:00"])
    assert.equal(parseBookingInstant(value), null, value);
  const instant = "2032-02-29T02:00:00.123Z";
  for (const value of [instant, "2032-02-29T10:00:00.123+08:00", "2032-02-28T21:00:00.123-05:00"])
    assert.equal(parseBookingInstant(value)?.toISOString(), instant);
});

test("Taipei form serialization does not use the host clock zone or accept zoned local input", () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ["UTC", "America/Los_Angeles", "Pacific/Honolulu"]) {
      process.env.TZ = zone;
      assert.equal(taipeiInputInstant("2035-01-01T10:00"), "2035-01-01T02:00:00.000Z");
      assert.equal(taipeiInputInstant("2035-02-30T10:00"), null);
      assert.equal(taipeiInputInstant("2035-01-01T10:00Z"), null);
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test("policy preserves 90/2000 defaults, accepts configured 30 and rejects invalid or unbounded settings", () => {
  assert.deepEqual(resolveBookingPolicy({}), { maxDurationDays: 90, maxNotesUnits: 2000 });
  assert.deepEqual(resolveBookingPolicy({ BOOKING_MAX_DURATION_DAYS: "30", BOOKING_MAX_NOTES_UNITS: "500" }),
    { maxDurationDays: 30, maxNotesUnits: 500 });
  for (const setting of ["BOOKING_MAX_DURATION_DAYS", "BOOKING_MAX_NOTES_UNITS"]) {
    for (const value of ["", " ", "0", "-1", "1.5", "NaN", "Infinity", "1e2", "01", "9007199254740992", "10001"])
      assert.throws(() => resolveBookingPolicy({ [setting]: value }), /must be an integer/);
  }
  assert.throws(() => resolveBookingPolicy({ BOOKING_MAX_DURATION_DAYS: "366" }));
  assert.equal(resolveBookingPolicy({ BOOKING_MAX_DURATION_DAYS: "365", BOOKING_MAX_NOTES_UNITS: "10000" }).maxNotesUnits, 10000);
});

test("ordering, now, duration, notes and elapsed-day rounding have exact boundaries", () => {
  const start = new Date("2035-01-01T02:00:00.000Z"), now = start.getTime() - 1;
  for (const days of [30, 90]) {
    const policy = resolveBookingPolicy({ BOOKING_MAX_DURATION_DAYS: String(days) });
    const end = new Date(start.getTime() + days * 86400000);
    assert.equal(bookingPolicyError(start, end, "😀".repeat(1000), policy, now), null);
    assert.match(bookingPolicyError(start, new Date(end.getTime() + 1), "", policy, now)!, /Maximum/);
    assert.match(bookingPolicyError(start, end, "😀".repeat(1001), policy, now)!, /UTF-16/);
    assert.match(bookingPolicyError(start, end, " ".repeat(2001), policy, now)!, /UTF-16/);
    assert.match(bookingPolicyError(start, start, "", policy, now)!, /after/);
    assert.match(bookingPolicyError(start, end, "", policy, start.getTime())!, /future/);
    assert.match(bookingPolicyError(start, end, "", policy, start.getTime() + 1)!, /future/);
  }
  for (const [elapsed, expected] of [[1, 1], [86400000 - 1, 1], [86400000, 1], [86400001, 2]])
    assert.equal(rentalDays(start, new Date(start.getTime() + elapsed)), expected);
});

test("display rejects malformed/ambiguous history without crashing or normalizing it", () => {
  for (const value of [null, undefined, 0, {}, new Date(NaN), "", "0", "1979-07-15", "1979-07-15T10:00",
    "1979-02-30T10:00Z", "1900-02-29T10:00Z", "1979-07-15T24:00Z", "1979-07-15T10:60Z",
    "1979-07-15T10:00:60Z", "1979-07-15T10:00:00.0001Z", "1979-07-15T10:00+0800",
    "1979-07-15T10:00+24:00", "1979-07-15T10:00+08:60", "1979-07-15T10:00-00:00",
    "1979-07-00T10:00Z", "1979-13-01T10:00Z", "-000000-01-01T10:00Z", " 1979-07-15T10:00Z"])
    assert.equal(formatRentalTime(value), "Time unavailable", String(value));
  assert.equal(formatRentalTime("1979-07-15T10:00", "zh-TW"), "時間無法顯示");
  assert.notEqual(formatRentalTime("2000-02-29T10:00Z"), "Time unavailable");
});

test("display uses actual historical Taipei rules, independent of new-request parsing and host zone", () => {
  const previous = process.env.TZ;
  const historical = new Date("1979-07-15T01:00:00.000Z");
  const epoch = historical.getTime();
  try {
    for (const zone of ["UTC", "America/Los_Angeles", "Pacific/Honolulu"]) {
      process.env.TZ = zone;
      const summer = formatRentalTime(historical);
      assert.match(summer, /Jul 15, 1979.*10:00 AM.*Asia\/Taipei, UTC\+09:00/);
      assert.equal(formatRentalTime("1979-07-15T10:00+09:00"), summer);
      assert.equal(formatRentalTime("1979-07-14T20:00-05:00"), summer);
      assert.match(formatRentalTime("1979-12-01T02:00Z"), /10:00 AM.*UTC\+08:00/);
      assert.match(formatRentalTime("2035-01-01T02:00Z"), /10:00 AM.*UTC\+08:00/);
      assert.match(formatRentalTime("1890-01-01T00:00Z"), /UTC\+08:06/);
      assert.match(formatRentalTime("0099-01-01T00:00Z"), /Jan 1, 99,/);
      assert.doesNotMatch(formatRentalTime("0099-01-01T00:00Z"), /1999/);
      assert.match(formatRentalTime("0000-01-01T00:00Z"), /BC/);
      assert.match(formatRentalTime(historical, "en-GB", "second"), /10:00:00/);
      assert.match(formatRentalTime(historical, "zh-TW"), /1979.*Asia\/Taipei, UTC\+09:00/);
      assert.equal(parseBookingInstant("1979-07-15T01:00Z"), null, "R3 year policy is unchanged.");
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
  assert.equal(historical.getTime(), epoch, "Display must not mutate the supplied Date.");
});
