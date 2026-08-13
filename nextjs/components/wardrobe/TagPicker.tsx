"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiRequestError, fetchJson } from "@/lib/fetch-json";
import type { Tag } from "@/lib/types";

type TagsResponse = { success: true; tags: Tag[] };
type CreateTagResponse = { success: true; tag: Tag };

interface TagPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function TagPicker({ selectedIds, onChange }: TagPickerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchJson<TagsResponse>("/api/tags");
        if (!cancelled) setTags(data.tags);
      } catch (error) {
        console.error("TagPicker load failed:", error);
        if (!cancelled) {
          toast.error(
            error instanceof ApiRequestError ? error.message : "标签加载失败"
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
  }, []);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  async function createTag() {
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const data = await fetchJson<CreateTagResponse>("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setTags((prev) => [...prev, data.tag]);
      onChange([...selectedIds, data.tag.id]);
      setNewName("");
      toast.success("标签已创建");
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError ? error.message : "创建标签失败"
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <Label>标签</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          可选已有标签，或输入新名称创建
        </p>
      </div>

      {loading ? (
        <div className="h-8 animate-pulse rounded bg-muted" />
      ) : tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无标签</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const active = selectedIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggle(tag.id)}
              >
                <Badge variant={active ? "default" : "outline"}>
                  {tag.name}
                </Badge>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          className="min-w-0"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新标签名称"
          maxLength={100}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void createTag();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={creating || !newName.trim()}
          onClick={() => void createTag()}
        >
          {creating ? "创建中…" : "创建"}
        </Button>
      </div>
    </div>
  );
}
