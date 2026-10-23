# Approved future temporary account restriction policy

24 October 2026 (Asia/Taipei). Product policy recorded from the Batch 3A request. **Future enforcement specification only: no restriction endpoint, staff authorization or automated restriction is implemented by Batch 3A.** Existing legacy permissions and behavior remain unchanged.

| Planned human role | Approved future purpose |
| --- | --- |
| Operations Staff | Rental and handoff safety |
| Moderator | Abuse and community safety |
| Super Admin | Defined emergency safety authority; precise emergency taxonomy still needs approval |
| Support Agent | Investigation and escalation only; no direct temporary restriction authority |

Each restriction must have documented safety grounds and bounded scope, last at most **48 hours**, and receive independent review within **24 hours**. Total restricted time must not exceed **72 hours in any rolling 30-day window**. Related incidents and account aliases cannot reset the cumulative budget. Overlapping restrictions count once. Serious sanctions require distinct authorized-human approval. Rental, return, inspection and private support obligations must remain accessible during restrictions.

Future implementation must calculate the union of restricted intervals intersected with the rolling window, including the proposed extension and all related incident/alias records. Use authoritative UTC timestamps, half-open intervals and an identity/target lock to prevent concurrent overspend. Evaluate the entire proposed schedule, including future window boundaries, not just elapsed time at request time. For example two overlapping 24-hour intervals offset by 12 hours consume 36 hours, not 48. Never restart a 48-hour timer to bypass the cumulative ceiling. Add boundary, concurrency, alias, related-incident, deadline and obligation-access tests before enabling anything.

Unresolved implementation decisions include enforcement when review deadlines lapse, canonical relation of incidents/accounts, appeal coverage, emergency criteria, restoration authority and safe handling of already scheduled restrictions as budgets change. These must be explicitly approved; no fail-open or small-team exception is assumed.

The frozen `hustlen-admin-shadow-v1` contract catalog is historical/proposed metadata, **not an approved allocation**. Its temporary restriction/release actions remain `blockedPolicy=true` and cannot receive even a DRAFT grant. Its broad role arrays must not be read as permission for Support to suspend users. A separately reviewed policy version, interval-budget model, independent review workflow and obligation-preserving DAL are prerequisites to activation. Batch 3A's 30-day grant lifetime is unrelated to this policy's rolling 30-day restriction budget.
