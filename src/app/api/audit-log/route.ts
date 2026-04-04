import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

/**
 * GET /api/audit-log
 * Returns HIPAA PHI audit log entries for the authenticated user's organization.
 * Restricted to admin and supervisor roles.
 *
 * Query params:
 *   - client_id   filter by client
 *   - user_id     filter by Clerk user ID
 *   - action      filter by action (view, create, update, delete, export, download)
 *   - resource_type filter by resource type
 *   - from        ISO date string (start of range)
 *   - to          ISO date string (end of range)
 *   - limit       max results (default 100, max 500)
 *   - offset      pagination offset
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try {
    orgId = await getOrgId(userId);
  } catch {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  // Only admin / supervisor roles may read audit logs
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("role")
    .eq("clerk_user_id", userId)
    .single();

  if (!profile || !["admin", "supervisor"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden: insufficient role" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("client_id");
  const filterUserId = searchParams.get("user_id");
  const action = searchParams.get("action");
  const resourceType = searchParams.get("resource_type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabaseAdmin
    .from("phi_audit_logs")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (clientId) query = query.eq("client_id", clientId);
  if (filterUserId) query = query.eq("user_clerk_id", filterUserId);
  if (action) query = query.eq("action", action);
  if (resourceType) query = query.eq("resource_type", resourceType);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs: data || [], count: count ?? null });
}
