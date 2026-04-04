import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest } from "next/server";

export type AuditAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "export"
  | "download"
  | "print";

export type AuditResourceType =
  | "client"
  | "vitals"
  | "screening"
  | "clinical_note"
  | "encounter"
  | "release_of_information"
  | "charge"
  | "assessment"
  | "portal_message"
  | "client_program"
  | "treatment_plan"
  | "document"
  | "appointment";

export interface AuditLogEntry {
  organization_id: string;
  user_clerk_id: string;
  user_name?: string | null;
  action: AuditAction;
  resource_type: AuditResourceType;
  resource_id?: string | null;
  client_id?: string | null;
  description?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * Log a PHI access event. Fire-and-forget — never throws so it won't
 * interrupt the main request. Call after auth + org resolution.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    await supabaseAdmin.from("phi_audit_logs").insert({
      organization_id: entry.organization_id,
      user_clerk_id: entry.user_clerk_id,
      user_name: entry.user_name ?? null,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id ?? null,
      client_id: entry.client_id ?? null,
      description: entry.description ?? null,
      ip_address: entry.ip_address ?? null,
      user_agent: entry.user_agent ?? null,
    });
  } catch {
    // Audit failures must never break the main request
    console.error("[AuditLog] Failed to write audit log entry:", {
      action: entry.action,
      resource_type: entry.resource_type,
      user: entry.user_clerk_id,
    });
  }
}

/**
 * Extract IP address from a Next.js request, respecting common proxy headers.
 */
export function getRequestIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
  );
}

/**
 * Extract user-agent string from a request.
 */
export function getRequestUserAgent(req: NextRequest): string | null {
  return req.headers.get("user-agent") ?? null;
}
