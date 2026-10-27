# Taiwan terminology proposal

Draft for owner review; does not rename database states, records or the Hustlen’ brand.

| English concept | Preferred Traditional Chinese | Usage boundary |
| --- | --- | --- |
| Owner | 物主 | Person providing the item; not a staff role. |
| Borrower | 借用人 | Person borrowing; never a new authorization identifier. |
| Listing | 刊登物品 / 刊登項目 | Use 刊登 for the act; do not rewrite user-authored titles/categories. |
| Rental | 租借 | Overall transaction, not a payment-provider claim. |
| Booking request | 租借申請 | Request phase; not proof of physical handoff/use. |
| Pickup | 取件 | Discovery/location wording. |
| Handoff | 交接 | Bilateral physical-exchange flow; verification/evidence rules unchanged. |
| Return | 歸還 | Existing return/inspection obligations remain distinct. |
| Account Settings | 帳號設定 | Editable own display name; email remains read-only. |
| Trust & verification | 信任與驗證 | Navigation only; not newly granted identity assurance. |
| Browse | 瀏覽物品 | Existing browse route. |
| Categories | 物品分類 | UI section; raw category values are user data. |
| Display name | 顯示名稱 | Public name, not verified legal identity. |
| Session | 登入狀態 / 工作階段 | User-facing expiration vs technical Admin session overview. |
| Suspended | 已停權 | Does not remove existing rental/return/support obligations. |

Keep **Hustlen’** unchanged. English and Traditional Chinese are interface choices, not automatic translation of private conversations, Support cases, evidence, historical records or technical IDs. Currency remains USD as in the existing application; Traditional Chinese formatting does not imply TWD conversion. All approved-status/risk/role identifiers remain their existing technical constants.

## Discovery refinements (11D)

| English interface label | Taiwan display | Semantic boundary |
| --- | --- | --- |
| Available | 可供租借 | Existing AVAILABLE UI state. |
| Rented | 租借流程進行中 | Existing RENTED includes pending handoff; never claim physical custody from the badge. |
| Flagged | 待處理安全事項 | Existing report/dispute availability; not a new sanction. |
| Deposit | 押金 | Existing displayed Decimal; not proof of funds collected. |
| Report | 檢舉 | Existing safety-report workflow; English submitted reason values unchanged. |
| Listing detail | 物品詳情 | Public discovery, not private rental evidence. |
| Pickup station | 取件車站 | Existing agreed-location catalogue; no station rename/GPS change. |

Known category display labels are an exact mapping of the eight creation values. User-authored/unknown categories remain raw. Unknown detail keys remain technical identifiers. This is draft terminology for owner/native-speaker review, not production language approval.
