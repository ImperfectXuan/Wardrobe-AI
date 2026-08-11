"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadZone } from "@/components/wardrobe/UploadZone";
import { AIRecognitionPanel } from "@/components/wardrobe/AIRecognitionPanel";
import {
  ClothingForm,
  type ClothingFormValues,
} from "@/components/wardrobe/ClothingForm";
import { TagPicker } from "@/components/wardrobe/TagPicker";
import { ApiRequestError, fetchJson } from "@/lib/fetch-json";
import {
  CLOTHING_CATEGORIES,
  type ClothingCategory,
  type ClothingItem,
  type RecognizeResult,
} from "@/lib/types";

type CreateResponse = {
  success: true;
  item: ClothingItem;
};

function toFormDefaults(
  result: RecognizeResult
): Partial<ClothingFormValues> {
  const category = CLOTHING_CATEGORIES.includes(
    result.category as ClothingCategory
  )
    ? (result.category as ClothingCategory)
    : "";

  return {
    name: result.name,
    category,
    color: result.color,
    season: result.season,
    style: result.style,
    notes: result.material ? `材质：${result.material}` : "",
  };
}

export default function AddClothingPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [formDefaults, setFormDefaults] = useState<
    Partial<ClothingFormValues>
  >({});
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [skippedAi, setSkippedAi] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  function applyRecognition(result: RecognizeResult) {
    setFormDefaults(toFormDefaults(result));
    setFormKey((key) => key + 1);
  }

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

      const data = await fetchJson<CreateResponse>("/api/clothing", {
        method: "POST",
        body: formData,
      });

      toast.success("衣物已保存");
      router.push(`/wardrobe/${data.item.id}`);
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError ? error.message : "保存失败"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/wardrobe">
          <Button type="button" variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">新增衣物</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            上传图片，可选 AI 识别后保存
          </p>
        </div>
      </div>

      <UploadZone
        onImageSelected={(next) => {
          setFile(next);
          setSkippedAi(false);
        }}
      />

      {file && !skippedAi && (
        <AIRecognitionPanel
          file={file}
          onResult={applyRecognition}
          onSkip={() => setSkippedAi(true)}
        />
      )}

      <TagPicker
        selectedIds={selectedTagIds}
        onChange={setSelectedTagIds}
      />

      <ClothingForm
        key={formKey}
        defaultValues={formDefaults}
        onSubmit={handleSubmit}
        submitLabel={saving ? "保存中…" : "保存"}
        disabled={saving}
      />
    </div>
  );
}
