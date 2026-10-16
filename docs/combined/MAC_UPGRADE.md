# Switch a Mac from Admin/MVP to the combined branch

These commands assume the terminal is in your existing repository and `.env` still identifies your existing PostgreSQL database at localhost:55433. Stop the development server first. Do not replace that database URL with the cloud/test URL.

## Fetch and switch without discarding work

```sh
git status --short
git fetch origin
```

If status lists changes, commit them on their current branch or save them explicitly before switching. Do not reset or force checkout. For the first checkout:

```sh
git switch --track -c integration/hustlen-mrt-complete origin/integration/hustlen-mrt-complete
npm ci
npx prisma validate --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
```

If the local integration branch already exists, use `git switch integration/hustlen-mrt-complete` followed by `git pull --ff-only origin integration/hustlen-mrt-complete` instead.

## Read-only checks before applying anything

```sh
npm run db:preflight
npx prisma migrate status --config prisma7.config.ts
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script --config prisma7.config.ts
```

The preflight opens a read-only transaction. It rejects missing/changed applied migration files, unresolved failures, incomplete Admin histories and inconsistent key schema fields. Expect all 12 Admin/MVP migrations, with only `20261016100000_official_mrt_stations` pending. If MRT was already correctly applied, expect no pending migrations. Prisma status may exit nonzero because a migration is pending; it must not report applied migrations missing locally.

Before MRT, the structural diff should add seven MrtStation columns (`canonicalId`, `nameEn`, `nameZh`, `lineCodes`, `operatorIds`, `systemIds`, `operational`) and the canonical ID unique index. It must not drop user/listing/booking data or remove Admin fields. Diff is structural and does not show station data inserts/reconciliation; inspect `prisma/migrations/20261016100000_official_mrt_stations/migration.sql` for those. Stop on other drift rather than running reset, db push, migrate resolve, or editing historical migrations.

## Back up the actual bound database

Install a `pg_dump` client compatible with your PostgreSQL server. The following loads the same `.env` binding, writes a new exclusive backup file, and passes connection settings without printing credentials. PostgreSQL must be reachable; a nonzero exit means the backup failed. Keep application writes stopped through backup and deployment.

```sh
node --input-type=module <<'JS'
import 'dotenv/config';
import {openSync, closeSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
if (!process.env.DATABASE_URL) throw Error('DATABASE_URL missing');
const u = new URL(process.env.DATABASE_URL);
const file = 'hustlen-before-mrt-' + new Date().toISOString().replaceAll(':', '-') + '.dump';
const fd = openSync(file, 'wx', 0o600);
const result = spawnSync('pg_dump', ['--format=custom'], {
  env: {...process.env, PGHOST:u.hostname, PGPORT:u.port || '5432',
    PGUSER:decodeURIComponent(u.username), PGPASSWORD:decodeURIComponent(u.password),
    PGDATABASE:decodeURIComponent(u.pathname.slice(1))},
  stdio:['ignore', fd, 'inherit']
});
closeSync(fd);
if (result.error || result.status !== 0) throw Error('Backup failed; do not migrate');
console.log('Backup created:', file);
JS
```

Store the backup outside the repository and verify it with `pg_restore --list <backup-file>`. Do not commit database dumps.

## Apply the reviewed forward migration

Only after the checks match the expected state and the backup succeeds:

```sh
npx prisma migrate deploy --config prisma7.config.ts
npm run mrt:import
npx prisma generate --config prisma7.config.ts
npm run db:preflight
npx prisma migrate status --config prisma7.config.ts
npm run dev
```

The deploy should apply only the official MRT migration; the importer is idempotent and preserves existing station primary keys. Check your own existing users, restricted listings and booking station references, then exercise admin, listing create/edit, booking and rental workflows. Do not run integration-test fixture commands against this database. No cloud test certifies the contents of your Mac database: the isolated upgrade fixture reconstructs the exact committed Admin history and representative populated records; these local checks validate whether your database matches that starting point.
