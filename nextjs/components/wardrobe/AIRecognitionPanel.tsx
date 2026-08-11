"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RecognizeResult } from "@/lib/types";

interface AIRecognitionPanelProps {
  file: File | null;
  onResult: (result: RecognizeResult) => void;
  onSkip?: () => void;
}

type Step = "idle" | "loading" | "editing" | "failed";

const FIELD_ORDER: (keyof RecognizeResult)[] = [
  "name",
  "category",
  "color",
  "season",
  "style",
  "material",
];

const FIELD_LABELS: Record<keyof RecognizeResult, string> = {
  name: "名称",
  category: "分类",
  color: "颜色",
  season: "季节",
  style: "风格",
  material: "材质",
};

function emptyResultFromFile(file: File): RecognizeResult {
  const baseName = file.name.replace(/\.[^.]+$/, "") || "未命名衣物";
  return {
    name: baseName,
    category: "上衣",
    color: "",
    season: "",
    style: "",
    material: "",
  };
}

function normalizeResult(
  data: Partial<RecognizeResult>,
  file: File
): RecognizeResult {
  const fallback = emptyResultFromFile(file);
  return {
    name: data.name || fallback.name,
    category: data.category || fallback.category,
    color: data.color || "",
    season: data.season || "",
    style: data.style || "",
    material: data.material || "",
  };
}

export function AIRecognitionPanel({
  file,
  onResult,
  onSkip,
}: AIRecognitionPanelProps) {
  const [step, setStep] = useState<Step>("idle");
  const [visibleFields, setVisibleFields] = useState<(keyof RecognizeResult)[]>(
    []
  );
  const [values, setValues] = useState<RecognizeResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!file) {
      setStep("idle");
      setVisibleFields([]);
      setValues(null);
      setErrorMessage("");
      return;
    }

    let cancelled = false;

    async function run(currentFile: File) {
      setStep("loading");
      setVisibleFields([]);
      setValues(null);
      setErrorMessage("");

      try {
        const formData = new FormData();
        formData.append("image", currentFile);

        const response = await fetch("/api/clothing/ai/recognize", {
          method: "POST",
          body: formData,
        });
        const body = (await response.json()) as {
          success?: boolean;
          error?: string;
          data?: Partial<RecognizeResult>;
        };

        if (!response.ok || body.success === false || !body.data) {
          throw new Error(body.error || "AI 识别失败");
        }

        const result = normalizeResult(body.data, currentFile);
        if (cancelled) return;

        setValues(result);

        for (let i = 0; i < FIELD_ORDER.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 180));
          if (cancelled) return;
          setVisibleFields(FIELD_ORDER.slice(0, i + 1));
        }

        if (!cancelled) {
          setStep("editing");
          // 识别成功后自动填入表单，仍可继续编辑后再点「使用识别结果」
          onResult(result);
        }
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "AI 识别失败";
        setErrorMessage(message);
        setValues(emptyResultFromFile(currentFile));
        setStep("failed");
        toast.error(message);
      }
    }

    void run(file);
    return () => {
      cancelled = true;
    };
  }, [file]);

  if (step === "idle" || !file) {
    return null;
  }

  if (step === "loading") {
    return (
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <p className="text-sm font-medium">AI 识别中…</p>
        <div className="space-y-2">
          {FIELD_ORDER.map((field) => (
            <div key={field} className="space-y-1">
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              <div
                className={`h-8 rounded bg-muted ${
                  visibleFields.includes(field) ? "opacity-100" : "opacity-40"
                } animate-pulse`}
              />
            </div>
          ))}
        </div>
        {visibleFields.length > 0 && values && (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {visibleFields.map((field) => (
              <li key={field}>
                {FIELD_LABELS[field]}：{values[field]}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (step === "failed" && values) {
    return (
      <div className="space-y-3 rounded-xl border border-destructive/30 bg-card p-4">
        <p className="text-sm font-medium text-destructive">
          识别失败：{errorMessage}
        </p>
        <p className="text-sm text-muted-foreground">
          可跳过识别，直接在下方表单手动填写。
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onSkip?.();
              onResult(values);
            }}
          >
            跳过识别
          </Button>
        </div>
      </div>
    );
  }

  if (!values) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <p className="text-sm font-medium">识别结果（可编辑）</p>
      <div className="grid gap-3 md:grid-cols-2">
        {FIELD_ORDER.map((field) => (
          <div key={field} className="space-y-1.5">
            <Label htmlFor={`ai-${field}`}>{FIELD_LABELS[field]}</Label>
            <Input
              id={`ai-${field}`}
              value={values[field]}
              onChange={(e) =>
                setValues((prev) =>
                  prev ? { ...prev, [field]: e.target.value } : prev
                )
              }
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => onResult(values)}>
          使用识别结果
        </Button>
        {onSkip && (
          <Button type="button" variant="outline" onClick={onSkip}>
            跳过识别
          </Button>
        )}
      </div>
    </div>
  );
}
