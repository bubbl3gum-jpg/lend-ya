# Actual password candidate screenshots

18 real owned-fixture captures. Existing R1 materials, local CJK typography and shared Light/Dark/System preferences are reused; visual/language approval remains pending. Fixture names/emails are synthetic; passwords are blank or native-masked, never printed.

| Locale / theme | Desktop 1440 | Tablet 820 | Mobile 390 |
| --- | --- | --- | --- |
| en / light | [desktop](screenshots/password-en-light-desktop.png) | [tablet](screenshots/password-en-light-tablet.png) | [mobile](screenshots/password-en-light-mobile.png) |
| en / dark | [desktop](screenshots/password-en-dark-desktop.png) | [tablet](screenshots/password-en-dark-tablet.png) | [mobile](screenshots/password-en-dark-mobile.png) |
| zh-TW / light | [desktop](screenshots/password-zh-TW-light-desktop.png) | [tablet](screenshots/password-zh-TW-light-tablet.png) | [mobile](screenshots/password-zh-TW-light-mobile.png) |
| zh-TW / dark | [desktop](screenshots/password-zh-TW-dark-desktop.png) | [tablet](screenshots/password-zh-TW-dark-tablet.png) | [mobile](screenshots/password-zh-TW-dark-mobile.png) |

Actual interactive states:

- [Incorrect current password, English](screenshots/password-error-en.png)
- [Same server error, Traditional Chinese](screenshots/password-error-zh-TW.png)
- [Real in-flight request: controls disabled, no duplicate submit](screenshots/password-busy-zh-TW.png)
- [Confirmed change/all-session sign-out, English](screenshots/password-success-en.png)
- [Confirmed change/all-session sign-out, Traditional Chinese](screenshots/password-success-zh-TW.png)
- [Real expired mounted session: 401 and cleared credentials](screenshots/password-expired-zh-TW.png)

Browser checks include 44px control targets, Enter submission, no horizontal overflow, language changes retaining current draft, actual new-password login and keyboard-selection of the unrelated read-only name draft after revocation. Save remains disabled; backend authorization remains authoritative. No particles/audio are added to credential actions. Physical phones, Safari, screen-reader/zoom/full manual contrast and production performance acceptance remain pending.
