import { NextResponse } from "next/server";
import { apiError, requireUser } from "@/lib/api";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const { count: totalItems, error: totalError } = await supabase
    .from("clothing_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_deleted", false);

  if (totalError) {
    console.error("GET /api/stats/summary total failed:", totalError);
    return apiError(totalError.message);
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: newThisMonth, error: monthError } = await supabase
    .from("clothing_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .gte("created_at", startOfMonth.toISOString());

  if (monthError) {
    console.error("GET /api/stats/summary month failed:", monthError);
    return apiError(monthError.message);
  }

  const { data: brandData, error: brandError } = await supabase
    .from("clothing_items")
    .select("brand")
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .not("brand", "is", null);

  if (brandError) {
    console.error("GET /api/stats/summary brands failed:", brandError);
    return apiError(brandError.message);
  }

  const brandCount = new Set(
    (brandData ?? [])
      .map((row) => row.brand)
      .filter((brand): brand is string => Boolean(brand))
  ).size;

  const { data: categoryData, error: categoryError } = await supabase
    .from("clothing_items")
    .select("category")
    .eq("user_id", user.id)
    .eq("is_deleted", false);

  if (categoryError) {
    console.error("GET /api/stats/summary categories failed:", categoryError);
    return apiError(categoryError.message);
  }

  const categoryMap: Record<string, number> = {};
  for (const item of categoryData ?? []) {
    categoryMap[item.category] = (categoryMap[item.category] || 0) + 1;
  }
  const categoryDistribution = Object.entries(categoryMap).map(
    ([category, count]) => ({ category, count })
  );

  const { data: recentItems, error: recentError } = await supabase
    .from("clothing_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(10);

  if (recentError) {
    console.error("GET /api/stats/summary recent failed:", recentError);
    return apiError(recentError.message);
  }

  return NextResponse.json({
    success: true,
    total_items: totalItems || 0,
    new_this_month: newThisMonth || 0,
    brand_count: brandCount,
    category_distribution: categoryDistribution,
    recent_items: recentItems || [],
  });
}
