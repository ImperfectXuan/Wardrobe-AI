import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/minio";

/**
 * 阶段二上传桩：仅上传到 MinIO 并返回 URL。
 * AI 识别桥接在阶段三补全。
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "未登录" },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const imageFile = formData.get("image") as File | null;

  if (!imageFile || imageFile.size === 0) {
    return NextResponse.json(
      { success: false, error: "请上传图片" },
      { status: 400 }
    );
  }

  try {
    const imageUrl = await uploadImage(imageFile, user.id);
    return NextResponse.json({
      success: true,
      image_url: imageUrl,
      data: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片上传失败";
    console.error("MinIO upload failed:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
