import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get("ecc-admin-token")?.value;
  if (!token) return null;

  const db = supabaseAdmin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: admin } = await db
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  return admin ? data.user : null;
}
