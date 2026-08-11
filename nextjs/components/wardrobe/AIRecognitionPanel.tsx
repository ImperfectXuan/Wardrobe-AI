"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RecognizeResult } from "@/lib/types";

interface AIRecognitionPanelProps {
  file: File | null;
  onResult: (result: RecognizeResult) => void;
}

type Step = "idle" | "loading" | "editing";

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

function mockRecognize(file: File): RecognizeResult {
  const baseName = file.name.replace(/\.[^.]+$/, "") || "未命名衣物";
  return {
    name: baseName,
    category: "上衣",
    color: "黑色",
    season: "四季",
    style: "休闲",
    material: "棉",
  };
}

export function AIRecognitionPanel({ file, onResult }: AIRecognitionPanelProps) {
  const [step, setStep] = useState<Step>("idle");
  const [visibleFields, setVisibleFields] = useState<(keyof RecognizeResult)[]>(
    []
  );
  const [values, setValues] = useState<RecognizeResult | null>(null);

  useEffect(() => {
    if (!file) {
      setStep("idle");
      setVisibleFields([]);
      setValues(null);
      return;
    }

    let cancelled = false;
    const result = mockRecognize(file);

    async function run() {
      setStep("loading");
      setVisibleFields([]);
      setValues(result);

      for (let i = 0; i < FIELD_ORDER.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 280));
        if (cancelled) return;
        setVisibleFields(FIELD_ORDER.slice(0, i + 1));
      }

      if (!cancelled) {
        setStep("editing");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [file]);

  if (step === "idle" || !file) {
    return null;
  }

  if (step === "loading" || !values) {
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
        {visibleFields.length > 0 && (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {visibleFields.map((field) => (
              <li key={field}>
                {FIELD_LABELS[field]}：{values?.[field]}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
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
      <Button type="button" onClick={() => onResult(values)}>
        使用识别结果
      </Button>
    </div>
  );
}
