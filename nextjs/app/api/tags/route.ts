import { NextRequest, NextResponse } from "next/server";
import { apiError, requireUser } from "@/lib/api";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", user.id)
    .order("group", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("GET /api/tags failed:", error);
    return apiError(error.message);
  }

  return NextResponse.json({ success: true, tags: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  let body: { name?: string; group?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("请求体必须是 JSON", 400);
  }

  const name = body.name?.trim();
  if (!name) {
    return apiError("标签名称为必填项", 400);
  }

  const { data, error } = await supabase
    .from("tags")
    .insert({
      user_id: user.id,
      name,
      group: body.group?.trim() || "自定义",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return apiError("标签已存在", 409);
    }
    console.error("POST /api/tags failed:", error);
    return apiError(error.message);
  }

  return NextResponse.json({ success: true, tag: data }, { status: 201 });
}
