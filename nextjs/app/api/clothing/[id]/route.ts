import { NextRequest, NextResponse } from "next/server";
import { uploadImage, deleteImage } from "@/lib/minio";
import {
  apiError,
  flattenClothingTags,
  requireUser,
} from "@/lib/api";
import {
  CLOTHING_CATEGORIES,
  type ClothingCategory,
} from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data: item, error } = await supabase
    .from("clothing_items")
    .select("*, clothing_tags(tag_id, tags(id, name, group))")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .single();

  if (error || !item) {
    return apiError("衣物不存在", 404);
  }

  return NextResponse.json({
    success: true,
    item: flattenClothingTags(item),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data: existing } = await supabase
    .from("clothing_items")
    .select("id, image_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .single();

  if (!existing) {
    return apiError("衣物不存在", 404);
  }

  const formData = await request.formData();
  const updates: Record<string, string | null> = {};

  for (const key of [
    "name",
    "category",
    "brand",
    "color",
    "season",
    "style",
    "notes",
  ]) {
    if (formData.has(key)) {
      const value = formData.get(key) as string | null;
      updates[key] = value ? value : null;
    }
  }

  if (
    updates.category &&
    !CLOTHING_CATEGORIES.includes(updates.category as ClothingCategory)
  ) {
    return apiError("分类无效", 400);
  }

  if (updates.name !== undefined && !updates.name) {
    return apiError("名称不能为空", 400);
  }

  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    try {
      if (existing.image_url) {
        try {
          await deleteImage(existing.image_url);
        } catch (error) {
          console.error("PATCH /api/clothing delete old image failed:", error);
        }
      }
      updates.image_url = await uploadImage(imageFile, user.id);
    } catch (error) {
      console.error("PATCH /api/clothing upload failed:", error);
      return apiError(
        error instanceof Error ? error.message : "图片上传失败",
        500
      );
    }
  }

  const { data: item, error } = await supabase
    .from("clothing_items")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("PATCH /api/clothing update failed:", error);
    return apiError(error.message);
  }

  if (formData.has("tag_ids")) {
    let parsed: string[] = [];
    try {
      parsed = JSON.parse((formData.get("tag_ids") as string) || "[]") as string[];
    } catch {
      return apiError("tag_ids 格式无效", 400);
    }

    const { error: deleteTagError } = await supabase
      .from("clothing_tags")
      .delete()
      .eq("clothing_id", id);

    if (deleteTagError) {
      console.error("PATCH /api/clothing clear tags failed:", deleteTagError);
      return apiError(deleteTagError.message);
    }

    if (parsed.length > 0) {
      const { error: insertTagError } = await supabase
        .from("clothing_tags")
        .insert(
          parsed.map((tagId) => ({ clothing_id: id, tag_id: tagId }))
        );
      if (insertTagError) {
        console.error("PATCH /api/clothing set tags failed:", insertTagError);
        return apiError(insertTagError.message);
      }
    }
  }

  return NextResponse.json({ success: true, item });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data: existing } = await supabase
    .from("clothing_items")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .single();

  if (!existing) {
    return apiError("衣物不存在", 404);
  }

  const { error } = await supabase
    .from("clothing_items")
    .update({ is_deleted: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("DELETE /api/clothing failed:", error);
    return apiError(error.message);
  }

  return NextResponse.json({ success: true });
}
