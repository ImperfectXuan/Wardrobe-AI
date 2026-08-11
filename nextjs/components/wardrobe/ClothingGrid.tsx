import { ClothingCard } from "./ClothingCard";
import type { ClothingItem } from "@/lib/types";

export type ViewStatus = "loading" | "empty" | "error" | "ready";

interface ClothingGridProps {
  items: ClothingItem[];
  status?: ViewStatus;
  errorMessage?: string;
}

export function ClothingGrid({
  items,
  status = "ready",
  errorMessage = "加载失败，请稍后重试",
}: ClothingGridProps) {
  if (status === "loading") {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="aspect-square animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-destructive">
        <p className="font-medium">出错了</p>
        <p className="mt-1 text-sm">{errorMessage}</p>
      </div>
    );
  }

  if (status === "empty" || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-lg font-medium">衣柜还是空的</p>
        <p className="mt-1 text-sm">快去添加你的第一件衣物吧</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <ClothingCard key={item.id} item={item} />
      ))}
    </div>
  );
}
