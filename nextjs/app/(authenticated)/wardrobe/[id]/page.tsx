"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiRequestError, fetchJson } from "@/lib/fetch-json";
import type { ClothingItem } from "@/lib/types";

type DetailResponse = {
  success: true;
  item: ClothingItem;
};

const FALLBACK_IMAGE =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjY0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5NGEzYjgiIGZvbnQtc2l6ZT0iMTgiPuWbvueJhzwvdGV4dD48L3N2Zz4=";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value || "未填写"}</p>
    </div>
  );
}

export default function ClothingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<ClothingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage("");
      try {
        const data = await fetchJson<DetailResponse>(
          `/api/clothing/${params.id}`
        );
        if (!cancelled) setItem(data.item);
      } catch (error) {
        if (!cancelled) {
          setItem(null);
          setErrorMessage(
            error instanceof ApiRequestError ? error.message : "加载失败"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetchJson(`/api/clothing/${params.id}`, { method: "DELETE" });
      toast.success("已删除");
      router.push("/wardrobe");
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError ? error.message : "删除失败"
      );
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="aspect-square max-w-md animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <Link href="/wardrobe">
          <Button type="button" variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <p className="text-sm text-destructive">
          {errorMessage || "衣物不存在"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/wardrobe">
            <Button type="button" variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {item.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.brand || "未填写品牌"}
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href={`/wardrobe/${item.id}/edit`} className="w-full sm:w-auto">
            <Button type="button" variant="outline" className="w-full sm:w-auto">
              <Pencil className="mr-1 h-4 w-4" />
              编辑
            </Button>
          </Link>
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            删除
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
          <Image
            src={item.image_url || FALLBACK_IMAGE}
            alt={item.name}
            fill
            unoptimized={!item.image_url}
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 28rem"
          />
        </div>

        <div className="space-y-4 rounded-xl border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{item.category}</Badge>
            {item.tags?.map((tag) => (
              <Badge key={tag.id} variant="secondary">
                {tag.name}
              </Badge>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="颜色" value={item.color} />
            <Field label="季节" value={item.season} />
            <Field label="风格" value={item.style} />
            <Field label="品牌" value={item.brand} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">备注</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm">
              {item.notes || "无"}
            </p>
          </div>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              删除后可从列表中消失（软删除）。确定删除「{item.name}」吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? "删除中…" : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
