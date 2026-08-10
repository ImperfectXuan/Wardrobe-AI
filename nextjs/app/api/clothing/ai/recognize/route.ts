import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/minio";
import { recognizeClothing } from "@/lib/ai-client";
import { apiError, unauthorized } from "@/lib/api";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorized();
  }

  const formData = await request.formData();
  const imageFile = formData.get("image") as File | null;

  if (!imageFile || imageFile.size === 0) {
    return apiError("请上传图片", 400);
  }

  let imageUrl: string;
  try {
    imageUrl = await uploadImage(imageFile, user.id);
  } catch (error) {
    console.error("POST /api/clothing/ai/recognize upload failed:", error);
    return apiError(
      error instanceof Error ? error.message : "图片上传失败",
      500
    );
  }

  try {
    const result = await recognizeClothing(imageUrl);
    return NextResponse.json({
      success: true,
      data: result,
      image_url: imageUrl,
    });
  } catch (error) {
    console.error("POST /api/clothing/ai/recognize AI failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "AI 识别失败",
        image_url: imageUrl,
      },
      { status: 500 }
    );
  }
}
