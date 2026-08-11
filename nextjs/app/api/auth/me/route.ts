import { NextResponse } from "next/server";
import { apiError, requireUser } from "@/lib/api";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("nickname, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("GET /api/auth/me profile failed:", error);
    return apiError(error.message);
  }

  return NextResponse.json({
    success: true,
    id: user.id,
    email: user.email ?? "",
    nickname:
      profile?.nickname ||
      (typeof user.user_metadata?.nickname === "string"
        ? user.user_metadata.nickname
        : "") ||
      "",
    avatar_url: profile?.avatar_url || "",
    created_at: user.created_at,
  });
}
