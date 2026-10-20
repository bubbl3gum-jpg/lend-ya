# Coordinate audit — 20 October 2026 (Asia/Taipei)

The catalogue still contains 120 physical identities, 136 codes and 109 sourced
coordinate pairs. The original per-station provenance is in
`coordinate-coverage.json`; no station identity or coordinate was changed.

Missing official coordinates remain: Y08 Shisizhang, Y09 Xiulang Bridge,
Y10 Jingping, Y12 Zhonghe, Y13 Qiaohe, Y14 Zhongyuan, Y15 Banxin,
Y16 Circular Line Banqiao, Y17 Xinpu Minsheng, Y19 Xingfu,
Y20 New Taipei Industrial Park.

On this task the following HTTPS requests were attempted with normal proxy/TLS settings:

- https://data.ntpc.gov.tw/ (official New Taipei catalogue discovery)
- https://data.gov.tw/ (official national catalogue discovery)
- https://www.ntmetro.com.tw/basic/?node=10138
- https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=c77e91bf-067c-475e-917b-545ff62b7d76

All four returned proxy CONNECT HTTP 403 Forbidden (`curl` exit 56). No source body
was retrieved. This is an access blocker, not evidence official data is absent.
No invented, geocoded or nearby interchange coordinates were substituted.

Action needed: allow official source domains `www.ntmetro.com.tw` and `data.taipei`
in environment settings while preserving the existing allowlist, or supply an
independently documented official export with station IDs, source URL, publication
or retrieval date and coordinate reference system. Reconcile station identities,
validate coordinate system/ranges and document provenance before changing the
snapshot; subsequently calibrate onsite. Catalogue discovery also needs `data.ntpc.gov.tw` and `data.gov.tw` if used. Additional official export hosts may
require their own approved allowlist entries after inspecting source links.
Missing stations continue to yield UNAVAILABLE, requiring explicit bilateral
reduced assurance or assistance. Retrieval and onsite verification remain blocked
and unexecuted respectively. No network/security setting was altered.
