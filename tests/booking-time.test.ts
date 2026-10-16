import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseRentalTime,
  rentalDays,
  formatRentalTime,
} from "../lib/booking-time";

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
