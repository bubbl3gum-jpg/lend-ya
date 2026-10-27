# Password UI translation additions

18 added typed pairs; total 221 paired messages. Exact en/zh-TW preference, fallback, themes/sound/effects and discovery wording remain unchanged. Password values are never localized, trimmed or used as authorization identifiers. Taiwan-native/product acceptance remains pending.

| ID | English | 繁體中文（台灣） |
| --- | --- | --- |
| `password.title` | Change password | 變更密碼 |
| `password.candidate` | Owned-development candidate · ordinary allowlisted accounts only. Recovery and notification delivery are not enabled. | 限自有開發測試環境與允許清單內的一般帳號使用；尚未啟用帳號復原與通知寄送。 |
| `password.help` | Use 8–128 characters, different from your current password. Passwords are not trimmed or translated. All sessions will be signed out. | 請使用 8–128 個字元，且須與目前密碼不同。密碼不會被去除空白或翻譯；完成後所有工作階段都會登出。 |
| `password.current` | Current password | 目前密碼 |
| `password.new` | New password | 新密碼 |
| `password.confirm` | Confirm new password | 確認新密碼 |
| `password.submit` | Change password and sign out | 變更密碼並登出 |
| `password.busy` | Changing password… | 正在變更密碼… |
| `password.input` | Enter your current password and a different new password of 8–128 characters; confirmation must match. | 請輸入目前密碼，並設定不同的 8–128 字元新密碼；兩次輸入的新密碼須相同。 |
| `password.wrong` | The current password is incorrect. Re-enter the fields to try again. | 目前密碼不正確，請重新輸入後再試一次。 |
| `password.expired` | Your session is no longer valid. Sign in again before changing your password. | 登入狀態已失效，請重新登入後再變更密碼。 |
| `password.denied` | Password changes are unavailable for this account in this candidate. | 此帳號無法使用本次測試版本的密碼變更功能。 |
| `password.limited` | Too many attempts. Try again in 15 minutes. | 嘗試次數過多，請於 15 分鐘後再試。 |
| `password.conflict` | Credentials changed during this request. Sign in again and reauthenticate. | 處理期間登入憑證已變更，請重新登入並驗證身分。 |
| `password.failed` | Unable to confirm the change. It may have completed if the response was lost. Try signing in; do not assume the old password still works. | 無法確認變更結果；若回應中斷，變更仍可能已完成。請嘗試重新登入，勿假設舊密碼仍可使用。 |
| `password.success` | Password changed. All previous sessions are signed out. Copy any unsaved display-name draft before signing in again. No notification was sent. | 密碼已變更，先前的工作階段皆已登出。重新登入前，請先複製尚未儲存的顯示名稱草稿。本次未寄送通知。 |
| `password.signin` | Sign in again | 重新登入 |
| `password.origin` | The security check failed. Reload the page before trying again. | 安全檢查未通過，請重新載入頁面後再試。 |

Recovery/login bodies remain English as previously documented; the new candidate guidance and sign-in link translate. No notification or recovery success is invented.
