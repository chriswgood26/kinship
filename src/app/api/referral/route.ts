import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserProfile } from "@/lib/getOrgId";
import { sendEmail, sendSMS } from "@/lib/communications";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { emails, phones, message } = body as {
    emails: string[];
    phones: string[];
    message: string;
  };

  if ((!emails || emails.length === 0) && (!phones || phones.length === 0)) {
    return NextResponse.json({ error: "At least one email or phone number is required" }, { status: 400 });
  }

  const { profile } = await getUserProfile(userId);
  const senderName =
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "A Kinship EHR user";

  const personalNote = message?.trim()
    ? `<p style="margin: 16px 0; font-style: italic; color: #475569;">"${message.trim()}"</p>`
    : "";

  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 32px 24px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 28px; font-weight: 800; color: #0f766e; margin: 0;">Kinship EHR</h1>
    <p style="color: #64748b; margin-top: 6px; font-size: 14px;">Modern EHR for behavioral health agencies</p>
  </div>

  <p style="font-size: 16px; line-height: 1.6; margin-bottom: 8px;">Hi there,</p>
  <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
    <strong>${senderName}</strong> thought you might be interested in <strong>Kinship EHR</strong> — a modern, affordable EHR platform built specifically for behavioral health, DD, and community mental health agencies.
  </p>

  ${personalNote}

  <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 24px; margin: 24px 0;">
    <h2 style="font-size: 18px; font-weight: 700; color: #0f766e; margin: 0 0 16px;">Why agencies love Kinship</h2>
    <ul style="margin: 0; padding: 0 0 0 20px; line-height: 2; color: #334155;">
      <li>Clinical documentation, billing, and scheduling in one place</li>
      <li>Built for behavioral health — not repurposed from primary care</li>
      <li>Affordable subscription tiers for small &amp; mid-size agencies</li>
      <li>Fast onboarding with dedicated support</li>
      <li>Telehealth, e-prescribing, and outcomes tracking included</li>
    </ul>
  </div>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://kinshipehr.com" style="background: #0d9488; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block;">
      Learn More at KinshipEHR.com →
    </a>
  </div>

  <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
    You received this because ${senderName} wanted to share Kinship EHR with you.<br/>
    <a href="https://kinshipehr.com" style="color: #0d9488;">kinshipehr.com</a>
  </p>
</body>
</html>
  `.trim();

  const smsBody = `${senderName} thinks you'd love Kinship EHR — a modern EHR built for behavioral health agencies. Check it out: https://kinshipehr.com${message?.trim() ? ` — "${message.trim()}"` : ""}`;

  const results: { type: string; to: string; success: boolean; error?: string }[] = [];

  for (const email of emails ?? []) {
    const trimmed = email.trim();
    if (!trimmed) continue;
    const result = await sendEmail({
      to: trimmed,
      subject: `${senderName} wants to share Kinship EHR with you`,
      html: emailHtml,
    });
    results.push({ type: "email", to: trimmed, ...result });
  }

  for (const phone of phones ?? []) {
    const trimmed = phone.trim();
    if (!trimmed) continue;
    const result = await sendSMS({ to: trimmed, body: smsBody });
    results.push({ type: "sms", to: trimmed, ...result });
  }

  const anySuccess = results.some((r) => r.success);
  return NextResponse.json({ results, anySuccess }, { status: anySuccess ? 200 : 500 });
}
