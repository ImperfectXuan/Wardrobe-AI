"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onImageSelected: (file: File) => void;
  currentImage?: string | null;
}

export function UploadZone({ onImageSelected, currentImage }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentImage ?? null);
  const [dragging, setDragging] = useState(false);

  function applyFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onImageSelected(file);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        applyFile(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 p-6 text-center transition-colors",
        dragging && "border-primary bg-primary/5"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => applyFile(e.target.files?.[0])}
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="预览"
          className="max-h-56 rounded-lg object-contain"
        />
      ) : (
        <>
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">拖拽图片到此处，或点击选择</p>
            <p className="mt-1 text-xs text-muted-foreground">支持 JPG / PNG</p>
          </div>
        </>
      )}
    </div>
  );
}
