import { ClothingCard } from "@/components/wardrobe/ClothingCard";
import type { ViewStatus } from "@/components/wardrobe/ClothingGrid";
import type { ClothingItem } from "@/lib/types";

interface RecentItemsProps {
  items: ClothingItem[];
  status?: ViewStatus;
  errorMessage?: string;
}

export function RecentItems({
  items,
  status = "ready",
  errorMessage = "加载失败，请稍后重试",
}: RecentItemsProps) {
  if (status === "loading") {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-48 w-40 shrink-0 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl border border-destructive/30 p-6 text-sm text-destructive">
        {errorMessage}
      </div>
    );
  }

  if (status === "empty" || items.length === 0) {
    return (
      <div className="rounded-xl border p-6 text-sm text-muted-foreground">
        还没有最近新增的衣物
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {items.map((item) => (
        <div key={item.id} className="w-40 shrink-0">
          <ClothingCard item={item} />
        </div>
      ))}
    </div>
  );
}
