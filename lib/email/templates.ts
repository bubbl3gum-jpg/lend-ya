export type EmailMessage = { from: string; to: string[]; subject: string; html: string; text: string };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function layout(title: string, preview: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f5f7f6;color:#17231d;font-family:Arial,Helvetica,sans-serif;line-height:1.65">
<div style="display:none;max-height:0;overflow:hidden" aria-hidden="true">${escapeHtml(preview)}</div>
<table role="presentation" style="width:100%;border-collapse:collapse"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" style="width:100%;max-width:560px;border-collapse:collapse;background:#fff;border:1px solid #e2e8e4;border-radius:16px"><tr><td style="padding:36px">
<div style="font-size:25px;font-weight:700;letter-spacing:-1px;margin-bottom:32px">Hustlen'</div>
<p style="font-size:11px;color:#047857;font-weight:700;letter-spacing:2px;margin:0 0 12px">ACCOUNT SECURITY</p>
<h1 style="font-size:27px;line-height:1.25;letter-spacing:-0.6px;margin:0 0 24px">${escapeHtml(title)}</h1>
${body}
<hr style="border:0;border-top:1px solid #e2e8e4;margin:32px 0 20px">
<p style="font-size:12px;color:#64746c;margin:0">Sent by Hustlen' to help keep your account secure.<br>We will never ask you to share your password or recovery link.</p>
</td></tr></table></td></tr></table></body></html>`;
}

function action(url: string, label: string): string {
  return `<p style="margin:28px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#047857;border-radius:8px;color:#fff;padding:13px 24px;font-weight:700;text-decoration:none">${escapeHtml(label)}</a></p>`;
}

export function recoveryEmail(from: string, to: string, origin: string, token: string, expiresAt: Date): EmailMessage {
  // Fragments are not included in HTTP requests/access logs. Milestone 3 reads it client-side.
  const url = `${origin}/reset-password#token=${encodeURIComponent(token)}`;
  const expiry = expiresAt.toISOString().replace("T", " ").replace(".000Z", " UTC").replace(/\.\d{3}Z$/, " UTC");
  return {
    from, to: [to], subject: "Reset your Hustlen' password",
    html: layout("A fresh start, securely.", "Use your secure link to reset your Hustlen' password.",
      `<p>We received a request to reset your Hustlen' password.</p><p>Choose a new password using the secure link below. Your profile, listings and rental history will stay with your account.</p>${action(url, "Reset password")}
<p style="font-size:14px;color:#4b5e53">This link expires 30 minutes after it was requested (${escapeHtml(expiry)}), can be used once, and is replaced if you request a newer link.</p>
<p style="font-size:14px;color:#4b5e53">Didn't request this? You can safely ignore this email. Your password has not changed.</p>
<p style="font-size:12px;color:#64746c">Button not working? Copy and paste this full link into your browser:<br><a style="color:#047857;word-break:break-all" href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`),
    text: `Hustlen'\n\nReset your password\n\nWe received a request to reset your Hustlen' password. Your profile, listings and rental history will stay with your account.\n\n${url}\n\nThis link expires 30 minutes after it was requested (${expiry}), can be used once, and is replaced if you request a newer link.\n\nDidn't request this? Ignore this email. Your password has not changed.\n\nNever share your password or recovery link.`,
  };
}

export function passwordChangedEmail(from: string, to: string, origin: string, changedAt: Date): EmailMessage {
  const url = `${origin}/login`;
  const changed = changedAt.toISOString();
  return {
    from, to: [to], subject: "Your Hustlen' password was changed",
    html: layout("Your password was changed.", "Your Hustlen' password has changed and existing sessions have been signed out.",
      `<p>Your Hustlen' password was successfully changed.</p><p>All existing sessions were signed out. You can log in again using your new password.</p>${action(url, "Go to Hustlen'")}
<p style="font-size:14px;color:#4b5e53">If you didn't make this change, go to Hustlen' and choose “Forgot Password?” on the login page to request a new secure link.</p>
<p style="font-size:12px;color:#64746c">Change recorded at ${escapeHtml(changed)} (UTC).</p>`),
    text: `Hustlen'\n\nYour password was changed\n\nYour password was successfully changed at ${changed} (UTC). All existing sessions were signed out. Log in with your new password: ${url}\n\nIf you didn't make this change, go to Hustlen' and choose Forgot Password? on the login page to request a new secure link.\n\nNever share your password or recovery link.`,
  };
}
