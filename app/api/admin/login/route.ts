import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin, supabasePublic } from "@/lib/supabase";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const parsed = credentialsSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });

    const auth = supabasePublic();
    const { data, error } = await auth.auth.signInWithPassword(parsed.data);
    if (error || !data.user || !data.session) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    const { data: admin } = await supabaseAdmin()
      .from("admin_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (!admin) {
      return NextResponse.json({ error: "This account is not an election administrator." }, { status: 403 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set("ecc-admin-token", data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: data.session.expires_in,
    });
    return response;
  } catch (error) {
    console.error("Admin login failed", error);
    return NextResponse.json({ error: "Login is temporarily unavailable." }, { status: 500 });
  }
}
