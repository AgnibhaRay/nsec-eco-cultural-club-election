import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("ecc-admin-token", "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
