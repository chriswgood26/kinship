// Communications lib — email via Resend, SMS via Twilio
// Keys injected via env vars; gracefully fails if not configured

export async function sendEmail({
  to,
  subject,
  html,
  from = "DrCloud Neo <noreply@drcloud-neo.com>",
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured — email not sent");
    return { success: false, error: "Email service not configured" };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({ from, to, subject, html });
    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function sendSMS({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn("Twilio not configured — SMS not sent");
    return { success: false, error: "SMS service not configured" };
  }
  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const msg = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    return { success: true, sid: msg.sid };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
