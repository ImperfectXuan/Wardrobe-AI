import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/minio";
import {
  apiError,
  flattenClothingTags,
  requireUser,
} from "@/lib/api";
import {
  CLOTHING_CATEGORIES,
  type ClothingCategory,
} from "@/lib/types";

const TAGS_SELECT =
  "*, clothing_tags(tag_id, tags(id, name, group))";
const TAGS_SELECT_INNER =
  "*, clothing_tags!inner(tag_id, tags!inner(id, name, group))";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const tag = searchParams.get("tag") || "";
  const season = searchParams.get("season") || "";
  const style = searchParams.get("style") || "";
  const pageSize = 20;

  let query = supabase
    .from("clothing_items")
    .select(tag ? TAGS_SELECT_INNER : TAGS_SELECT, { count: "exact" })
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (season) {
    query = query.eq("season", season);
  }
  if (style) {
    query = query.eq("style", style);
  }
  if (tag) {
    query = query.eq("clothing_tags.tags.name", tag);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("GET /api/clothing failed:", error);
    return apiError(error.message);
  }

  const items = (data ?? []).map((item) => flattenClothingTags(item));

  return NextResponse.json({
    success: true,
    items,
    total: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > page * pageSize,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const formData = await request.formData();
  const imageFile = formData.get("image") as File | null;
  const name = (formData.get("name") as string | null)?.trim() || "";
  const category = (formData.get("category") as string | null)?.trim() || "";
  const brand = formData.get("brand") as string | null;
  const color = formData.get("color") as string | null;
  const season = formData.get("season") as string | null;
  const style = formData.get("style") as string | null;
  const notes = formData.get("notes") as string | null;

  let tagIds: string[] = [];
  try {
    tagIds = JSON.parse((formData.get("tag_ids") as string) || "[]") as string[];
  } catch {
    return apiError("tag_ids 格式无效", 400);
  }

  if (!name || !category) {
    return apiError("名称和分类为必填项", 400);
  }

  if (!CLOTHING_CATEGORIES.includes(category as ClothingCategory)) {
    return apiError("分类无效", 400);
  }

  let imageUrl: string | null = null;
  if (imageFile && imageFile.size > 0) {
    try {
      imageUrl = await uploadImage(imageFile, user.id);
    } catch (error) {
      console.error("POST /api/clothing upload failed:", error);
      return apiError(
        error instanceof Error ? error.message : "图片上传失败",
        500
      );
    }
  }

  const { data: item, error } = await supabase
    .from("clothing_items")
    .insert({
      user_id: user.id,
      name,
      category,
      brand: brand || null,
      color: color || null,
      season: season || null,
      style: style || null,
      image_url: imageUrl,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error("POST /api/clothing insert failed:", error);
    return apiError(error.message);
  }

  if (tagIds.length > 0) {
    const { error: tagError } = await supabase.from("clothing_tags").insert(
      tagIds.map((tagId) => ({
        clothing_id: item.id,
        tag_id: tagId,
      }))
    );
    if (tagError) {
      console.error("POST /api/clothing tag link failed:", tagError);
      return apiError(tagError.message);
    }
  }

  return NextResponse.json({ success: true, item }, { status: 201 });
}
