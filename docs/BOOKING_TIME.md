# Booking timestamps, policy and Taipei display

2026-11-04, Asia/Taipei. R3 restores original Prompt 3/D's strict timestamp and
policy behavior without replacing candidate pricing, idempotency or reservation
semantics. The **90-day default is retained**; the earlier proposed 30-day
default is **not adopted**. No existing booking or idempotency row is migrated.

## New requests and maintained clients

`POST /api/bookings`, including quotations, requires `startAt` and `endAt` as
explicit instants. Format: `YYYY-MM-DDTHH:mm[:ss[.SSS]]Z` or the same with a
numeric `+HH:mm`/`-HH:mm` offset. Fractional seconds, when supplied, have 1–3
digits; seconds are required for a fraction. Uppercase `T`/`Z`, real Gregorian
dates, clock fields 00–23/00–59/00–59, and numeric offsets no larger than 23:59
are required. Both the written year and resulting UTC instant must stay within
2000–9999 for new operations. `-00:00` denotes unknown offset and is rejected;
`Z`/`+00:00` are explicit UTC. No leap seconds, 24:00, whitespace, named zones,
date-only inputs, excess precision or silent Date normalization. API timestamps
are not interpreted in the host's timezone.

The one maintained creation UI is `components/booking-form.tsx`, rendered by the
listing detail page. Its `datetime-local` values denote Taipei wall time; a pure
calendar-checked converter appends +08:00 and emits an ISO Z instant before
quotation/submission. The browser's and server's zones are irrelevant. For
example, local `2035-01-01T10:00` is sent/stored as
`2035-01-01T02:00:00.000Z`. The HTML form has its existing minute input precision;
the API additionally supports milliseconds. The server passes resolved policy
numbers to the form, which provides validation and an appropriate maxlength;
server checks remain authoritative. Failed-response retries with the same form
identity may reach the server even if time/policy has since changed, because
the original operation might already have committed.
The form retains the exact reviewed submission after a transport/5xx failure;
definitive 4xx responses permit re-quotation. A browser regression drops the
response only after the server committed, then verifies an unchanged key/payload
retry returns the original booking without duplicates.

External/older clients must serialize explicit instants for **new requests and
quotes**. Naive input that previously meant Taipei will now return 400, not be
silently reinterpreted for a new write. Tests/maintained fixture clients were
coordinated to send +08:00 or Z; local HTML input and other features' separate
wall-clock contracts were not globally rewritten. No additional runtime creation
client was found under app/components/scripts.

## Authenticated durable replay

The existing `(renterId, Idempotency-Key)` identity and SHA-256 JSON field order
are unchanged: listing, normalized ISO start/end, station ID, canonical station
ID or null, trimmed notes or null, and optional normalized documentation
acknowledgement. A supplied expected quote is still checked against the stored
price/deposit snapshot, not today's listing. Canonical-equivalent explicit
offsets and notes whitespace retain their old equivalence; a replay compares
business terms, not byte-identical JSON or untrimmed notes.

After authenticated input-shape/calendar validation, the API computes the same
canonical hash and looks up only the caller's stored operation **before**
applying today's future-start/duration/notes/config limits. Matching committed
operations replay even if their start is now past or limits are lower/malformed.
An altered hash or supplied quote returns 409. No other user's row is returned.

Only to establish that matching stored operation, the old parser may parse its
previously accepted legacy timestamps (including naive Taipei values). If no
matching operation exists, strict parsing is mandatory before policy/transaction
work; this fallback cannot create a booking or quotation. It does not search
other participants, guess historical intent, amend hashes, or bypass payload or
documentation checks. Wrong-actor/unknown-key legacy input returns 400 (or 401
without authentication). Explicit new operations remain scoped per caller as
before. If an identical write committed during a lock wait/conflict, existing
replay recovery may return that committed row; it never creates a duplicate.

## Server configuration and boundaries

| Setting | Missing-value default | Allowed bounds |
| --- | --- | --- |
| `BOOKING_MAX_DURATION_DAYS` | 90 | Integer 1–365 elapsed days inclusive |
| `BOOKING_MAX_NOTES_UNITS` | 2000 | Integer 1–10000 UTF-16 code units inclusive |

Only canonical positive decimal integer strings are accepted. Empty, whitespace,
leading-zero, signed, fractional, exponential, NaN, infinity, unsafe integer and
out-of-range values fail explicitly; absence alone selects a default. These are
server settings, not NEXT_PUBLIC values or feature gates. Resolve once per
operation/render; no environment object is sent to the browser. Invalid policy
returns 503 for new API work and prevents a new form from rendering usable
limits rather than disabling a bound. Stored matching replays remain available.
Restart/redeploy with valid settings and refresh forms when changing policy.

Start must be strictly later than the server's current instant; end must be
strictly later than start. Maximum duration compares exact elapsed milliseconds
to `days * 86400000`, inclusive at the bound. Notes count the **raw JavaScript
string length before trimming**, including spaces/newlines; an emoji represented
by a surrogate pair counts as two units. Non-text notes fail. Trimmed notes are
stored/hashed as before, with empty text normalized to null. These limits govern
new operations, not retrospective edits or matching committed retries.

After the existing listing lock is acquired, the API checks future start again.
It also checks immediately before insertion, after documentation binding; expiry
throws a controlled 400 inside the transaction so any provisional binding rolls
back, with no Booking/meetup partial records. Existing authorization/account and
station locks remain authoritative.

## Money and reservation behavior retained

Billing remains `ceil(elapsed milliseconds / 86400000)`: any partial elapsed
24-hour period rounds up. No calendar-day or currency change. The server uses
the authoritative listing `Prisma.Decimal`, multiplies by integer billable days,
and guards the `DECIMAL(12,2)` total maximum **9999999999.99**. Prices/deposit
snapshots and responses retain Decimal/string serialization; no floating-point
money arithmetic is added. Client-supplied price/total fields are not trusted;
existing expected-quote confirmation still detects stale quotation terms.

Overlapping PENDING requests remain permitted. Acceptance uses the existing
listing lock/recheck and half-open reservation overlap predicate. Active custody,
dispute and return rules, serialized retry outcomes, evidence and all owned
feature gates are unchanged. Display consistency beyond the form is R4; broader
adjacency/nonconflicting/MVCC race coverage is R5. The separate empty-schema build
failure is unchanged and is not part of this timestamp fix.

## Regression evidence

Unit cases cover strict/legacy separation, calendar/offset/precision, Taipei
conversion under different host zones, 90/2000 defaults, configured 30-day policy,
invalid configuration, UTF-16/raw whitespace boundaries and exact elapsed-day
rounding. API cases exercise real quotation precision/overflow/tampering,
strict rejection, synthetic now-past legacy operations, actor/payload isolation,
and an observed PostgreSQL listing-lock wait crossing the future boundary.
Browser cases use UTC server, Los Angeles borrower and Honolulu owner contexts,
assert captured ISO payload and raw stored instant, then restart with lower and
malformed policy to test durable replay/new-work refusal. Actual execution
results and any limitations are recorded in `STABILIZATION_RECHECK.md`.

## Historical-safe display contract — Recovery R4

2026-11-04, Asia/Taipei. `formatRentalTime` is the shared display authority;
display parsing is separate from `parseBookingInstant`/new-booking policy.

- Accept finite valid `Date` objects, or explicitly zoned ISO strings with real
  calendar dates: four-digit or signed six-digit ISO years, `T`, hour/minute,
  optional seconds and 1–3 fractional digits, then uppercase `Z` or numeric
  `±HH:mm` (bounded to 23:59). Unknown `-00:00`, impossible dates, date-only/
  unzoned strings, whitespace, excess precision and other malformed inputs are
  rejected. Numeric epoch values and arbitrary objects are not coerced to dates.
- There is **no 2000 lower bound for display**. Historical instants, early years
  and explicit extended-year strings are supported independently of R3's new
  booking year limits. A Date is already an instant: its epoch is cloned, not
  reinterpreted or mutated. This cannot establish whether a historical source
  originally captured the user's intended time; no correction/backfill occurs.
- Invalid/unsupported data returns **`Time unavailable`** or **`時間無法顯示`**
  for the existing Traditional Chinese locale, never a plausible fallback date
  or a thrown formatter error. Existing absent-record labels such as “Not
  submitted yet”, “—” and “no authoritative record” remain distinct and intact.
- Format the actual instant with `Asia/Taipei` ICU/tzdata rules and append one
  `Asia/Taipei, UTC±HH:mm` label per displayed timestamp. The offset comes from
  `Intl.DateTimeFormat(..., timeZoneName: "longOffset")`, not a fixed +08 label.
  For example, `1979-07-15T01:00Z` displays **10:00 AM, UTC+09:00**; December
  1979 and modern dates use UTC+08:00. Earlier local mean time can show +08:06.
- Existing operational English uses en-US. Localized rental workflows retain
  their previous en-GB (locale `en`) / zh-TW date ordering and labels. Default
  minute precision is retained; inspection and meetup deadline displays request
  seconds explicitly. Zone labels remain attached to each instant so a period
  spanning different historical offsets is not represented by one false offset.

Direct discrepancies fixed: account activity no longer prints UTC-only dates;
all five browser-local meetup deadline/confirmation displays now use the shared
Taipei formatter with full date and seconds. Shared-helper improvements also
cover booking details, both dashboard roles, handoff/return/inspection evidence,
verified reviews and trust history. Localized agreement timestamps, review
expiry, saved rental documentation, inspection, condition-case and recovery-room
history now use the same helper with their existing locale/absence semantics.
The read-only Admin clock description no longer implies every historical
instant is +08:00. Countdown arithmetic, custody/claim timers and authorization
are unchanged. No aesthetic redesign or production feature activation follows.

Intentionally retained: local `datetime-local` input/preview remains R3's Taipei
wall-time contract, and its future-only input guidance is not a historical
timezone label. Other features' generic `formatTime` and local parsers, unrelated
date-only fields, locale catalogues and currencies were not globally changed.

### Money display and verification

The existing currency is **USD**, not newly changed to TWD. Decimal/string
amounts and all pricing arithmetic remain authoritative and unchanged. Existing
en-US/zh-TW USD formatting passed zero, 0.01, 12.34 and **9999999999.99** rendering
tests. Actual booking views also render a zero Decimal deposit, fractional
amounts and the maximum amount correctly. No demonstrated money-display defect
required changing `formatMoney` or the existing detail/dashboard price helpers.

New unit regressions reject malformed/ambiguous values, exercise equivalent
offsets, 1979 DST, historical mean-time/early-year handling, host-zone independence,
localized placeholders and Date immutability. The real browser regression views
a **new synthetic** 1979 completed rental from UTC-server/Los Angeles-borrower/
Honolulu-owner contexts across detail, dashboards, activity and all four evidence
sections. Complete booking/handoff/return/listing/link row snapshots must remain
identical after viewing. Existing lifecycle, restart and R3 replay tests remain
in that suite. Executed results and any failed test attempts are recorded in the
R4 section of `STABILIZATION_RECHECK.md`.
