import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

// OCR field extraction patterns for common ID/insurance card formats
function extractIDCardFields(text: string) {
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  const full = text.toUpperCase();

  // Name patterns: "LAST, FIRST" or "FIRST LAST" after "NAME" label
  let lastName = "";
  let firstName = "";
  const nameMatch = full.match(/(?:LN|LAST(?:\s+NAME)?)[:\s]+([A-Z]+)/);
  const fnMatch = full.match(/(?:FN|FIRST(?:\s+NAME)?)[:\s]+([A-Z]+)/);
  if (nameMatch) lastName = nameMatch[1];
  if (fnMatch) firstName = fnMatch[1];

  // DOB pattern: MM/DD/YYYY or MM-DD-YYYY
  let dob = "";
  const dobMatch = text.match(/(?:DOB|BIRTH|BORN)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
    || text.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
  if (dobMatch) {
    // Normalize to YYYY-MM-DD
    const parts = dobMatch[1].split(/[\/\-]/);
    if (parts.length === 3) {
      const yr = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      dob = `${yr}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
    }
  }

  // Address
  let address = "";
  const addrMatch = text.match(/(\d+\s+[A-Z][A-Z\s]+(?:ST|AVE|RD|DR|LN|BLVD|WAY|CT)[.,]?\s*(?:[A-Z]{2}\s+\d{5})?)/i);
  if (addrMatch) address = addrMatch[1].trim();

  // ID number
  let idNumber = "";
  const idMatch = text.match(/(?:DL|ID|LIC(?:ENSE)?)[:\s#]*([A-Z0-9]{6,12})/i);
  if (idMatch) idNumber = idMatch[1];

  // State
  let state = "";
  const stateMatch = full.match(/\b([A-Z]{2})\s+\d{5}\b/);
  if (stateMatch) state = stateMatch[1];

  // Gender
  let gender = "";
  const genderMatch = full.match(/\bSEX[:\s]+(M|F|MALE|FEMALE|X)\b/);
  if (genderMatch) {
    const g = genderMatch[1];
    gender = g === "M" ? "male" : g === "F" ? "female" : g.toLowerCase();
  }

  return { firstName, lastName, dob, address, idNumber, state, gender };
}

function extractInsuranceCardFields(text: string) {
  const full = text.toUpperCase();

  // Insurance provider name — first line or after "INSURANCE"
  let provider = "";
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  if (lines.length > 0) provider = lines[0];

  // Member ID
  let memberId = "";
  const memberMatch = text.match(/(?:MEMBER\s*ID|ID\s*#|MEMBER\s*#)[:\s]*([A-Z0-9\-]+)/i);
  if (memberMatch) memberId = memberMatch[1];

  // Group number
  let groupNumber = "";
  const groupMatch = text.match(/(?:GROUP\s*(?:#|NO|NUMBER|ID)?)[:\s]*([A-Z0-9\-]+)/i);
  if (groupMatch) groupNumber = groupMatch[1];

  // Plan name
  let planName = "";
  const planMatch = text.match(/(?:PLAN|PRODUCT)[:\s]+([A-Z0-9\s]+?)(?:\n|$)/i);
  if (planMatch) planName = planMatch[1].trim();

  // RxBIN (pharmacy)
  let rxBin = "";
  const rxMatch = text.match(/(?:RX\s*BIN|BIN)[:\s]*(\d{6})/i);
  if (rxMatch) rxBin = rxMatch[1];

  // Subscriber name
  let subscriberName = "";
  const subMatch = text.match(/(?:SUBSCRIBER|MEMBER)[:\s]+([A-Z][A-Z\s]+?)(?:\n|$)/i);
  if (subMatch) subscriberName = subMatch[1].trim();

  // Copay
  let copay = "";
  const copayMatch = text.match(/(?:COPAY|CO-PAY)[:\s]*\$?(\d+)/i);
  if (copayMatch) copay = `$${copayMatch[1]}`;

  // Effective date
  let effectiveDate = "";
  const effMatch = text.match(/(?:EFFECTIVE|EFF(?:\.|ECTIVE)?(?:\s+DATE)?)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  if (effMatch) effectiveDate = effMatch[1];

  return { provider, memberId, groupNumber, planName, rxBin, subscriberName, copay, effectiveDate };
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);

  const body = await req.json();
  const { documentId, cardType } = body; // cardType: "id" | "insurance" | "general"

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required" }, { status: 400 });
  }

  // Fetch the document record
  const { data: doc, error: docError } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("organization_id", orgId)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Get signed URL to access the file
  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUrl(doc.storage_path, 300);

  if (signedError || !signedData?.signedUrl) {
    return NextResponse.json({ error: "Could not access document" }, { status: 500 });
  }

  // Run OCR via OCR.space if API key is configured
  let rawText = "";
  let ocrError = "";

  const ocrApiKey = process.env.OCR_SPACE_API_KEY;
  if (ocrApiKey) {
    try {
      const isPDF = doc.file_type === "application/pdf";

      const ocrBody = new URLSearchParams({
        url: signedData.signedUrl,
        language: "eng",
        isOverlayRequired: "false",
        detectOrientation: "true",
        scale: "true",
        isTable: "false",
        OCREngine: isPDF ? "2" : "1",
      });

      const ocrRes = await fetch("https://api.ocr.space/parse/imageurl", {
        method: "POST",
        headers: {
          apikey: ocrApiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: ocrBody.toString(),
      });

      if (ocrRes.ok) {
        const ocrData = await ocrRes.json();
        if (ocrData.IsErroredOnProcessing) {
          ocrError = ocrData.ErrorMessage?.[0] || "OCR processing failed";
        } else {
          rawText = ocrData.ParsedResults
            ?.map((r: { ParsedText?: string }) => r.ParsedText || "")
            .join("\n")
            .trim() || "";
        }
      } else {
        ocrError = `OCR service returned ${ocrRes.status}`;
      }
    } catch (err) {
      ocrError = err instanceof Error ? err.message : "OCR request failed";
    }
  }

  const extractedFields = cardType === "insurance"
    ? extractInsuranceCardFields(rawText)
    : cardType === "id"
    ? extractIDCardFields(rawText)
    : null;

  // Store OCR result in document record
  await supabaseAdmin
    .from("documents")
    .update({
      ocr_data: {
        cardType,
        extractedFields,
        rawText,
        processedAt: new Date().toISOString(),
        engine: ocrApiKey ? "ocr.space" : "none",
        ...(ocrError ? { error: ocrError } : {}),
      },
    })
    .eq("id", documentId);

  const needsKey = !ocrApiKey;
  return NextResponse.json({
    success: true,
    cardType,
    documentId,
    extractedFields,
    rawText,
    ...(ocrError ? { ocrError } : {}),
    ...(needsKey
      ? {
          note: "Configure OCR_SPACE_API_KEY in your environment to enable automatic text extraction. Get a free key at ocr.space.",
        }
      : {}),
  });
}
