import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/minio";
import { apiError, requireUser } from "@/lib/api";

export async function PATCH(request: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const contentType = request.headers.get("content-type") || "";
  let nickname: string | null = null;
  let avatarFile: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const rawNickname = formData.get("nickname");
    nickname =
      typeof rawNickname === "string" ? rawNickname.trim() || null : null;
    const file = formData.get("avatar");
    if (file instanceof File && file.size > 0) {
      avatarFile = file;
    }
  } else {
    let body: { nickname?: string };
    try {
      body = await request.json();
    } catch {
      return apiError("请求体必须是 JSON 或 multipart", 400);
    }
    nickname =
      typeof body.nickname === "string" ? body.nickname.trim() || null : null;
  }

  let avatarUrl: string | undefined;
  if (avatarFile) {
    try {
      avatarUrl = await uploadImage(avatarFile, user.id);
    } catch (error) {
      console.error("PATCH /api/auth/profile upload failed:", error);
      return apiError(
        error instanceof Error ? error.message : "头像上传失败",
        500
      );
    }
  }

  const payload: {
    id: string;
    nickname: string | null;
    avatar_url?: string;
  } = {
    id: user.id,
    nickname,
  };
  if (avatarUrl) {
    payload.avatar_url = avatarUrl;
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("nickname, avatar_url")
    .single();

  if (error) {
    console.error("PATCH /api/auth/profile upsert failed:", error);
    return apiError(error.message);
  }

  return NextResponse.json({
    success: true,
    nickname: data.nickname || "",
    avatar_url: data.avatar_url || "",
  });
}
