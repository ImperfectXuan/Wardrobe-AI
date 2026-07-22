export interface ClothingItem {
  id: string;
  user_id: string;
  name: string;
  category: ClothingCategory;
  brand: string | null;
  color: string | null;
  season: string | null;
  style: string | null;
  image_url: string | null;
  notes: string | null;
  is_deleted: boolean;
  created_at: string;
  tags?: Tag[];
}

export type ClothingCategory = "上衣" | "裤子" | "外套" | "鞋子" | "配饰";

export const CLOTHING_CATEGORIES: ClothingCategory[] = [
  "上衣",
  "裤子",
  "外套",
  "鞋子",
  "配饰",
];

export const SEASONS = ["春", "夏", "秋", "冬", "春夏", "秋冬", "四季"];
export const STYLES = ["商务", "休闲", "运动", "极简", "工装", "优雅"];

export interface Tag {
  id: string;
  name: string;
  group: string;
}

export interface StatsSummary {
  total_items: number;
  new_this_month: number;
  brand_count: number;
  category_distribution: { category: string; count: number }[];
  recent_items: ClothingItem[];
}

export interface RecognizeResult {
  name: string;
  category: string;
  color: string;
  season: string;
  style: string;
  material: string;
}
