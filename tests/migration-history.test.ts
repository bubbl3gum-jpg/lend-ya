import { test } from "node:test";
import assert from "node:assert/strict";
import {
  inspectMigrationHistory,
  officialMrtMigration,
} from "../lib/migration-history";
const files = { admin: "a", [officialMrtMigration]: "m" };
const admin = {
  migration_name: "admin",
  checksum: "a",
  finished_at: "done",
  rolled_back_at: null,
};
test("Admin state identifies only MRT as pending", () =>
  assert.deepEqual(inspectMigrationHistory(files, [admin]).pending, [
    officialMrtMigration,
  ]));
test("combined history has no pending migration", () =>
  assert.deepEqual(
    inspectMigrationHistory(files, [
      admin,
      { ...admin, migration_name: officialMrtMigration, checksum: "m" },
    ]).pending,
    [],
  ));
test("unknown or modified applied migrations are rejected", () => {
  assert.throws(() =>
    inspectMigrationHistory(files, [{ ...admin, migration_name: "unseen" }]),
  );
  assert.throws(() =>
    inspectMigrationHistory(files, [{ ...admin, checksum: "changed" }]),
  );
});
test("unresolved failures and incomplete Admin state are rejected", () => {
  assert.throws(() =>
    inspectMigrationHistory(files, [{ ...admin, finished_at: null }]),
  );
  assert.throws(() => inspectMigrationHistory(files, []));
});
test("rolled-back historical attempts do not masquerade as pending failures", () =>
  assert.deepEqual(
    inspectMigrationHistory(files, [
      {
        ...admin,
        checksum: "old",
        finished_at: null,
        rolled_back_at: "rolled back",
      },
      admin,
    ]).pending,
    [officialMrtMigration],
  ));
