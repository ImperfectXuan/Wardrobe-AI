import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ClothingItem } from "@/lib/types";

const FALLBACK_IMAGE =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5NGEzYjgiIGZvbnQtc2l6ZT0iMTQiPuWbvueJhzwvdGV4dD48L3N2Zz4=";

interface ClothingCardProps {
  item: ClothingItem;
}

export function ClothingCard({ item }: ClothingCardProps) {
  return (
    <Card className="group overflow-hidden border-border transition-shadow hover:shadow-md">
      <Link href={`/wardrobe/${item.id}`}>
        <div className="relative aspect-square bg-muted">
          <Image
            src={item.image_url || FALLBACK_IMAGE}
            alt={item.name}
            fill
            unoptimized={!item.image_url}
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </div>
      </Link>
      <CardContent className="space-y-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.name}</p>
          {item.brand ? (
            <p className="truncate text-xs text-muted-foreground">{item.brand}</p>
          ) : (
            <p className="text-xs text-muted-foreground">未填写品牌</p>
          )}
        </div>
        <Badge variant="secondary">{item.category}</Badge>
      </CardContent>
    </Card>
  );
}
