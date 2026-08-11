"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadZone } from "@/components/wardrobe/UploadZone";
import {
  ClothingForm,
  type ClothingFormValues,
} from "@/components/wardrobe/ClothingForm";
import { TagPicker } from "@/components/wardrobe/TagPicker";
import { ApiRequestError, fetchJson } from "@/lib/fetch-json";
import type { ClothingCategory, ClothingItem } from "@/lib/types";

type DetailResponse = {
  success: true;
  item: ClothingItem;
};

type UpdateResponse = {
  success: true;
  item: ClothingItem;
};

export default function EditClothingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<ClothingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage("");
      try {
        const data = await fetchJson<DetailResponse>(
          `/api/clothing/${params.id}`
        );
        if (!cancelled) {
          setItem(data.item);
          setSelectedTagIds((data.item.tags ?? []).map((tag) => tag.id));
        }
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

  async function handleSubmit(values: ClothingFormValues) {
    if (!values.category) {
      toast.error("请选择分类");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("category", values.category);
      formData.append("brand", values.brand);
      formData.append("color", values.color);
      formData.append("season", values.season);
      formData.append("style", values.style);
      formData.append("notes", values.notes);
      formData.append("tag_ids", JSON.stringify(selectedTagIds));
      if (file) {
        formData.append("image", file);
      }

      await fetchJson<UpdateResponse>(`/api/clothing/${params.id}`, {
        method: "PATCH",
        body: formData,
      });

      toast.success("已更新");
      router.push(`/wardrobe/${params.id}`);
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError ? error.message : "更新失败"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
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

  const defaults: Partial<ClothingFormValues> = {
    name: item.name,
    category: item.category as ClothingCategory,
    brand: item.brand || "",
    color: item.color || "",
    season: item.season || "",
    style: item.style || "",
    notes: item.notes || "",
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/wardrobe/${item.id}`}>
          <Button type="button" variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">编辑衣物</h1>
          <p className="mt-1 text-sm text-muted-foreground">{item.name}</p>
        </div>
      </div>

      <UploadZone
        currentImage={item.image_url}
        onImageSelected={setFile}
      />

      <TagPicker
        selectedIds={selectedTagIds}
        onChange={setSelectedTagIds}
      />

      <ClothingForm
        defaultValues={defaults}
        onSubmit={handleSubmit}
        submitLabel={saving ? "保存中…" : "保存修改"}
        disabled={saving}
      />
    </div>
  );
}
