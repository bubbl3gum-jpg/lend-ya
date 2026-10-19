import { test } from "node:test";
import assert from "node:assert/strict";
import { network, parseStationIds } from "../lib/mrt/network";
import { legacyCanonicalIds } from "../lib/mrt/station-mapping";
import { validateNetwork, searchStations } from "../lib/mrt/station-validation";
test("retained network has 120 unique locations and 136 unique codes", () => {
  assert.deepEqual(validateNetwork(network), []);
  assert.equal(new Set(network.stations.map((s) => s.id)).size, 120);
  assert.equal(
    new Set(network.stations.flatMap((s) => Object.values(s.codes))).size,
    136,
  );
});
test("legacy codes resolve explicitly to correct official identities", () => {
  const expected = {
    TPE: ["R10", "BL12"],
    ZSH: ["R11", "G14"],
    XIM: ["G12", "BL11"],
    JNT: ["R15"],
    SSH: ["G19"],
  };
  for (const [legacy, codes] of Object.entries(expected))
    assert.deepEqual(
      new Set(
        Object.values(
          network.stations.find((s) => s.id === legacyCanonicalIds[legacy])!
            .codes,
        ),
      ),
      new Set(codes),
    );
});
test("walking transfers remain separate; in-station interchange is canonical", () => {
  const blue = searchStations(network, "BL07")[0],
    yellow = searchStations(network, "Y16")[0];
  assert.notEqual(blue.id, yellow.id);
  assert.equal(blue.nameEn, yellow.nameEn);
  assert.equal(
    searchStations(network, "R10")[0].id,
    searchStations(network, "BL12")[0].id,
  );
  assert.ok(
    network.transfers.some(
      (t) =>
        [t.from, t.to].includes(blue.id) && [t.from, t.to].includes(yellow.id),
    ),
  );
});
test("station IDs fail closed rather than discarding manipulated entries", () => {
  for (const value of [
    [],
    [1, "2"],
    [1, null],
    [1, 1.5],
    [1, -2],
    [true],
    Array(121).fill(1),
  ])
    assert.equal(parseStationIds(value), null);
  assert.deepEqual(parseStationIds([1, 2, 1]), [1, 2]);
});
test("search accepts English, Chinese and line codes", () => {
  assert.equal(searchStations(network, "台北車站")[0].id, "taipei-main");
  assert.equal(searchStations(network, "Taipei Main")[0].id, "taipei-main");
  assert.equal(searchStations(network, "bl12")[0].id, "taipei-main");
});

import { isSerializationConflict } from "../lib/database-conflicts";
test("recognizes raw lock and adapter serialization conflicts without masking other SQL errors", () => {
  assert.ok(isSerializationConflict({ code: "P2034" }));
  assert.ok(
    isSerializationConflict({
      code: "P2010",
      meta: { driverAdapterError: { cause: { originalCode: "40001" } } },
    }),
  );
  assert.equal(
    isSerializationConflict({ code: "P2010", meta: { code: "23505" } }),
    false,
  );
});

test("deadlocks and wrapped PostgreSQL lock failures are retryable without masking unrelated errors", () => {
  for (const error of [
    { code: "40P01" },
    { code: "P2010", meta: { driverAdapterError: { cause: { originalCode: "40P01" } } } },
    { code: "P2034" },
    { cause: { code: "40001" } },
  ]) assert.equal(isSerializationConflict(error), true);
  assert.equal(isSerializationConflict({ code: "P2003" }), false);
  assert.equal(isSerializationConflict({ code: "23503" }), false);
});
