# Lend-Ya

Lend-Ya is a booking-based peer-to-peer marketplace MVP built with Next.js, Prisma, and PostgreSQL. A Booking owns the rental lifecycle; handoff, return, and dispute records are attached directly to it.

## Local development

1. Install dependencies with `npm install`.
2. Start PostgreSQL with `docker compose up -d`.
3. Set `DATABASE_URL` in `.env`:

	```text
	DATABASE_URL="postgresql://p2p_user:p2p_password@localhost:55433/p2p_marketplace?schema=public"
	```

4. Apply migrations, generate Prisma Client, and seed demo data:

	```bash
	npx prisma migrate deploy
	npx prisma generate
	npx prisma db seed
	```

5. Start Next.js with `npm run dev` and open <http://localhost:3000>.

The seed creates local demo accounts `alice@example.test`, `bob@example.test`, and `charlie@example.test`. Their development password is `LocalDev123!`. Do not use these credentials outside local development.

## Booking lifecycle

`PENDING -> CONFIRMED -> HANDOFF_PENDING -> IN_USE -> RETURN_PENDING -> INSPECTION -> COMPLETED`

Participants can open a dispute during return review, moving the Booking to `DISPUTED`. Cancellation is limited to pending or confirmed bookings. Handoff and Return each have at most one record per Booking.

## Migration history

The original migrations are retained as immutable history. The forward migration `20261006150000_booking_lifecycle_backbone` converts legacy requests and transactions to Booking records, carries over handoffs and disputes where possible, then removes the parallel legacy tables. Legacy listings receive Taipei Main Station as a migration fallback because the old schema had no meeting-station data.

A fresh database should use `prisma migrate deploy` to apply the complete history and arrive at the current Booking-based schema. This workspace's pre-existing local database had already been created with `db push`; after verifying that its schema exactly matched the current Prisma schema, its migration history was baselined with `prisma migrate resolve`. Do not replay the historical migrations against a `db push`-created database without first verifying and baselining that database.
