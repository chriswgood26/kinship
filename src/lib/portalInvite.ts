// Portal invitation email helper
// Sends a branded email with a secure one-time invite link

import { sendEmail } from "@/lib/communications";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.kinshipehr.com";

export async function sendPortalInviteEmail({
  to,
  firstName,
  inviteToken,
  orgName,
  patientName,
}: {
  to: string;
  firstName: string;
  inviteToken: string;
  orgName: string;
  patientName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const inviteUrl = `${APP_URL}/accept-invite?token=${inviteToken}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're invited to the Patient Portal</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td style="background:#0d9488;padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;display:inline-block;line-height:40px;text-align:center;font-size:20px;font-weight:bold;color:#ffffff;">K</div>
                <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Kinship Patient Portal</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;">
                Hi ${firstName},
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#475569;line-height:1.6;">
                ${orgName} has set up a secure patient portal account for you${patientName ? ` (for <strong>${patientName}</strong>)` : ""}. 
                This portal lets you view appointments, communicate securely with your care team, and manage your health information — all in one place.
              </p>

              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:0 0 28px;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#15803d;text-transform:uppercase;letter-spacing:0.05em;">What you can do</p>
                <ul style="margin:8px 0 0;padding-left:20px;color:#166534;font-size:14px;line-height:1.8;">
                  <li>Message your care team securely</li>
                  <li>View upcoming appointments</li>
                  <li>Access shared documents and notes</li>
                  <li>Review your care plan and billing</li>
                </ul>
              </div>

              <div style="text-align:center;margin:0 0 28px;">
                <a href="${inviteUrl}"
                   style="display:inline-block;background:#0d9488;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                  Create My Portal Account
                </a>
              </div>

              <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;text-align:center;">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:12px;color:#64748b;text-align:center;word-break:break-all;">
                ${inviteUrl}
              </p>

              <div style="border-top:1px solid #f1f5f9;padding-top:20px;">
                <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;">
                  This invitation link expires in <strong>72 hours</strong>. If you did not expect this email, you can safely ignore it.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                Kinship EHR · Confidential Health Information<br/>
                For emergencies, call 911. For questions, contact your care team directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to,
    subject: `You're invited to the ${orgName} Patient Portal`,
    html,
    from: "Kinship Patient Portal <noreply@kinshipehr.com>",
  });
}
