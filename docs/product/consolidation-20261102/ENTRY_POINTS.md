# Complete page/API entry-point inventory

Generated from actual source on 2 November 2026. Every application page/API below is implemented source, not automatically runtime verified. Exact service imports and detected guard identifiers are in SOURCE_INVENTORY.json; shared layouts and delegated services may enforce additional checks. Family-specific roles, dependencies, issues and test evidence are in FULL_FUNCTIONALITY_AUDIT.md. Deliberate development gates are not broken links.

| Entry point | Source | Methods | Access family |
|---|---|---|---|
| `/account/activity` | `app/account/activity/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/account/identity` | `app/account/identity/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/account` | `app/account/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/account/verification` | `app/account/verification/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/admin/account-security` | `app/admin/account-security/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/ai-case-brief` | `app/admin/ai-case-brief/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/announcements` | `app/admin/announcements/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/audit-logs` | `app/admin/audit-logs/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/bookings/[id]` | `app/admin/bookings/[id]/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/bookings` | `app/admin/bookings/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/case-audit/[id]` | `app/admin/case-audit/[id]/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/chat/[id]` | `app/admin/chat/[id]/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/chat` | `app/admin/chat/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/disputes/[id]/history` | `app/admin/disputes/[id]/history/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/disputes/[id]` | `app/admin/disputes/[id]/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/disputes` | `app/admin/disputes/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/listings/[id]` | `app/admin/listings/[id]/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/listings` | `app/admin/listings/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/locations/lab` | `app/admin/locations/lab/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/locations` | `app/admin/locations/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin` | `app/admin/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/reports/[id]/history` | `app/admin/reports/[id]/history/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/reports/[id]` | `app/admin/reports/[id]/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/reports` | `app/admin/reports/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/security` | `app/admin/security/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/settings` | `app/admin/settings/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/support` | `app/admin/support/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/users/[id]` | `app/admin/users/[id]/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/users` | `app/admin/users/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/admin/workbench` | `app/admin/workbench/page.tsx` | page | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/account/password` | `app/api/account/password/route.ts` | POST | Public or current-user/participant scoped; see family audit |
| `/api/account` | `app/api/account/route.ts` | PATCH | Public or current-user/participant scoped; see family audit |
| `/api/admin/account-security` | `app/api/admin/account-security/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/ai-case-brief` | `app/api/admin/ai-case-brief/route.ts` | GET, POST | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/announcements` | `app/api/admin/announcements/route.ts` | GET, POST | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/audit-logs` | `app/api/admin/audit-logs/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/bookings/[id]` | `app/api/admin/bookings/[id]/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/bookings` | `app/api/admin/bookings/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/chat/cases/[id]/claim` | `app/api/admin/chat/cases/[id]/claim/route.ts` | POST | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/chat/cases/[id]/decision` | `app/api/admin/chat/cases/[id]/decision/route.ts` | POST | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/chat/cases/[id]` | `app/api/admin/chat/cases/[id]/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/chat/cases` | `app/api/admin/chat/cases/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/disputes/[id]/evidence/[photoId]` | `app/api/admin/disputes/[id]/evidence/[photoId]/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/disputes/[id]/history` | `app/api/admin/disputes/[id]/history/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/disputes/[id]/resolve` | `app/api/admin/disputes/[id]/resolve/route.ts` | POST | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/disputes/[id]` | `app/api/admin/disputes/[id]/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/disputes` | `app/api/admin/disputes/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/listings/[id]/moderation` | `app/api/admin/listings/[id]/moderation/route.ts` | PATCH | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/listings/[id]` | `app/api/admin/listings/[id]/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/listings` | `app/api/admin/listings/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/locations/lab/[operation]` | `app/api/admin/locations/lab/[operation]/route.ts` | POST | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/locations` | `app/api/admin/locations/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/overview` | `app/api/admin/overview/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/platform-settings` | `app/api/admin/platform-settings/route.ts` | GET, POST | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/reports/[id]/history` | `app/api/admin/reports/[id]/history/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/reports/[id]/resolve` | `app/api/admin/reports/[id]/resolve/route.ts` | POST | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/reports/[id]` | `app/api/admin/reports/[id]/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/reports` | `app/api/admin/reports/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/support` | `app/api/admin/support/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/users/[id]` | `app/api/admin/users/[id]/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/users/[id]/status` | `app/api/admin/users/[id]/status/route.ts` | PATCH | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/users` | `app/api/admin/users/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/admin/workbench` | `app/api/admin/workbench/route.ts` | GET | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/auth/admin-passkeys` | `app/api/auth/admin-passkeys/route.ts` | GET, POST | Legacy ACTIVE Admin (chat also reviewer checks) |
| `/api/auth/forgot-password` | `app/api/auth/forgot-password/route.ts` | POST | Public or current-user/participant scoped; see family audit |
| `/api/auth/login` | `app/api/auth/login/route.ts` | POST | Public or current-user/participant scoped; see family audit |
| `/api/auth/logout` | `app/api/auth/logout/route.ts` | POST | Public or current-user/participant scoped; see family audit |
| `/api/auth/me` | `app/api/auth/me/route.ts` | GET | Public or current-user/participant scoped; see family audit |
| `/api/auth/register` | `app/api/auth/register/route.ts` | POST | Public or current-user/participant scoped; see family audit |
| `/api/bookings/[id]/dispute` | `app/api/bookings/[id]/dispute/route.ts` | POST | Public or current-user/participant scoped; see family audit |
| `/api/bookings/[id]/evidence/[photoId]` | `app/api/bookings/[id]/evidence/[photoId]/route.ts` | GET | Public or current-user/participant scoped; see family audit |
| `/api/bookings/[id]/handoff` | `app/api/bookings/[id]/handoff/route.ts` | POST | Public or current-user/participant scoped; see family audit |
| `/api/bookings/[id]/inspection` | `app/api/bookings/[id]/inspection/route.ts` | POST | Public or current-user/participant scoped; see family audit |
| `/api/bookings/[id]/meetup/[operation]` | `app/api/bookings/[id]/meetup/[operation]/route.ts` | GET, POST | Public or current-user/participant scoped; see family audit |
| `/api/bookings/[id]/return` | `app/api/bookings/[id]/return/route.ts` | POST | Public or current-user/participant scoped; see family audit |
| `/api/bookings/[id]/reviews` | `app/api/bookings/[id]/reviews/route.ts` | POST | Public or current-user/participant scoped; see family audit |
| `/api/bookings/[id]` | `app/api/bookings/[id]/route.ts` | GET, PATCH | Public or current-user/participant scoped; see family audit |
| `/api/bookings` | `app/api/bookings/route.ts` | GET, POST | Public or current-user/participant scoped; see family audit |
| `/api/chat/cases/[id]/appeal` | `app/api/chat/cases/[id]/appeal/route.ts` | POST | Public or current-user/participant scoped; see family audit |
| `/api/chat/cases` | `app/api/chat/cases/route.ts` | GET | Public or current-user/participant scoped; see family audit |
| `/api/conversations/[id]/block` | `app/api/conversations/[id]/block/route.ts` | POST | Public or current-user/participant scoped; see family audit |
| `/api/conversations/[id]/coordination` | `app/api/conversations/[id]/coordination/route.ts` | POST | Public or current-user/participant scoped; see family audit |
| `/api/conversations/[id]/messages` | `app/api/conversations/[id]/messages/route.ts` | GET, POST | Public or current-user/participant scoped; see family audit |
| `/api/conversations/[id]/read` | `app/api/conversations/[id]/read/route.ts` | POST | Public or current-user/participant scoped; see family audit |
| `/api/conversations/[id]/report` | `app/api/conversations/[id]/report/route.ts` | POST | Public or current-user/participant scoped; see family audit |
| `/api/conversations` | `app/api/conversations/route.ts` | GET, POST | Public or current-user/participant scoped; see family audit |
| `/api/dev/condition-cases` | `app/api/dev/condition-cases/route.ts` | page | Owned development / exact actor |
| `/api/dev/identity` | `app/api/dev/identity/route.ts` | GET, POST | Owned development / exact actor |
| `/api/dev/inspection` | `app/api/dev/inspection/route.ts` | GET, POST | Owned development / exact actor |
| `/api/dev/item-documentation` | `app/api/dev/item-documentation/route.ts` | GET, POST | Owned development / exact actor |
| `/api/dev/item-studio/photos/[id]` | `app/api/dev/item-studio/photos/[id]/route.ts` | GET | Owned development / exact actor |
| `/api/dev/item-studio` | `app/api/dev/item-studio/route.ts` | GET, POST | Owned development / exact actor |
| `/api/dev/recovery-room` | `app/api/dev/recovery-room/route.ts` | GET, POST | Owned development / exact actor |
| `/api/dev/rental-documentation/photos/[id]` | `app/api/dev/rental-documentation/photos/[id]/route.ts` | GET | Owned development / exact actor |
| `/api/dev/rental-documentation` | `app/api/dev/rental-documentation/route.ts` | GET, POST | Owned development / exact actor |
| `/api/dev/staff-listing-read` | `app/api/dev/staff-listing-read/route.ts` | POST | Owned development / exact actor |
| `/api/dev/support-agent` | `app/api/dev/support-agent/route.ts` | POST | Owned development / exact actor |
| `/api/dev/support-companion/local` | `app/api/dev/support-companion/local/route.ts` | POST | Owned development / exact actor |
| `/api/dev/support-companion` | `app/api/dev/support-companion/route.ts` | POST | Owned development / exact actor |
| `/api/dev/support-companion/translation` | `app/api/dev/support-companion/translation/route.ts` | POST | Owned development / exact actor |
| `/api/dev/support-requester` | `app/api/dev/support-requester/route.ts` | POST | Owned development / exact actor |
| `/api/dev/vision-fixtures` | `app/api/dev/vision-fixtures/route.ts` | GET, POST | Owned development / exact actor |
| `/api/dev/vision-prototype` | `app/api/dev/vision-prototype/route.ts` | POST | Owned development / exact actor |
| `/api/listing-media/[filename]` | `app/api/listing-media/[filename]/route.ts` | GET | Public or current-user/participant scoped; see family audit |
| `/api/listings/[id]/report` | `app/api/listings/[id]/report/route.ts` | POST | Public or current-user/participant scoped; see family audit |
| `/api/listings/[id]` | `app/api/listings/[id]/route.ts` | GET, PATCH, DELETE | Public or current-user/participant scoped; see family audit |
| `/api/listings` | `app/api/listings/route.ts` | GET, POST | Public or current-user/participant scoped; see family audit |
| `/api/support/channels/[id]/messages` | `app/api/support/channels/[id]/messages/route.ts` | GET, POST | Public or current-user/participant scoped; see family audit |
| `/api/support/tickets/[id]/channel` | `app/api/support/tickets/[id]/channel/route.ts` | GET, POST | Public or current-user/participant scoped; see family audit |
| `/api/support/tickets/[id]` | `app/api/support/tickets/[id]/route.ts` | GET | Public or current-user/participant scoped; see family audit |
| `/api/support/tickets` | `app/api/support/tickets/route.ts` | GET, POST | Public or current-user/participant scoped; see family audit |
| `/bookings/[id]` | `app/bookings/[id]/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/catalogue` | `app/catalogue/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/customer-service` | `app/customer-service/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/customer-service/tickets/[id]/channel` | `app/customer-service/tickets/[id]/channel/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/customer-service/tickets/[id]` | `app/customer-service/tickets/[id]/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/customer-service/tickets/new` | `app/customer-service/tickets/new/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/customer-service/tickets` | `app/customer-service/tickets/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/dashboard` | `app/dashboard/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/dev/announcements` | `app/dev/announcements/page.tsx` | page | Owned development / exact actor |
| `/dev/condition-cases` | `app/dev/condition-cases/page.tsx` | page | Owned development / exact actor |
| `/dev/inspection` | `app/dev/inspection/page.tsx` | page | Owned development / exact actor |
| `/dev/item-documentation` | `app/dev/item-documentation/page.tsx` | page | Owned development / exact actor |
| `/dev/item-studio` | `app/dev/item-studio/page.tsx` | page | Owned development / exact actor |
| `/dev/recovery-room` | `app/dev/recovery-room/page.tsx` | page | Owned development / exact actor |
| `/dev/staff-listing-inspection` | `app/dev/staff-listing-inspection/page.tsx` | page | Owned development / exact actor |
| `/dev/support-agent` | `app/dev/support-agent/page.tsx` | page | Owned development / exact actor |
| `/dev/support-companion` | `app/dev/support-companion/page.tsx` | page | Owned development / exact actor |
| `/dev/support-requester` | `app/dev/support-requester/page.tsx` | page | Owned development / exact actor |
| `/dev/vision-prototype` | `app/dev/vision-prototype/page.tsx` | page | Owned development / exact actor |
| `/listings/[id]/edit` | `app/listings/[id]/edit/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/listings/[id]` | `app/listings/[id]/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/listings/new` | `app/listings/new/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/listings` | `app/listings/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/login` | `app/login/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/messages/[id]` | `app/messages/[id]/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/messages` | `app/messages/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/` | `app/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/profile/[userId]` | `app/profile/[userId]/page.tsx` | page | Public or current-user/participant scoped; see family audit |
| `/register` | `app/register/page.tsx` | page | Public or current-user/participant scoped; see family audit |
