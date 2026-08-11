"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClothingGrid, type ViewStatus } from "@/components/wardrobe/ClothingGrid";
import {
  SearchBar,
  type SearchFilters,
} from "@/components/wardrobe/SearchBar";
import { fetchJson, ApiRequestError } from "@/lib/fetch-json";
import type { ClothingItem, Tag } from "@/lib/types";

type ClothingListResponse = {
  success: true;
  items: ClothingItem[];
  total: number;
};

type TagsResponse = {
  success: true;
  tags: Tag[];
};

const EMPTY_FILTERS: SearchFilters = {
  search: "",
  category: "",
  season: "",
  tags: [],
};

export default function WardrobePage() {
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [tags, setTags] = useState<Tag[]>([]);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [status, setStatus] = useState<ViewStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadTags() {
      try {
        const data = await fetchJson<TagsResponse>("/api/tags");
        if (!cancelled) setTags(data.tags);
      } catch (error) {
        console.error("load tags failed:", error);
      }
    }
    void loadTags();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadItems = useCallback(async (nextFilters: SearchFilters) => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const params = new URLSearchParams();
      if (nextFilters.search) params.set("search", nextFilters.search);
      if (nextFilters.category) params.set("category", nextFilters.category);
      if (nextFilters.season) params.set("season", nextFilters.season);
      // API 仅支持单标签：取多选中的第一个
      if (nextFilters.tags[0]) params.set("tag", nextFilters.tags[0]);

      const query = params.toString();
      const data = await fetchJson<ClothingListResponse>(
        `/api/clothing${query ? `?${query}` : ""}`
      );
      setItems(data.items);
      setStatus(data.items.length === 0 ? "empty" : "ready");
    } catch (error) {
      setItems([]);
      setStatus("error");
      setErrorMessage(
        error instanceof ApiRequestError ? error.message : "加载失败"
      );
    }
  }, []);

  useEffect(() => {
    void loadItems(filters);
  }, [filters, loadItems]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">我的衣柜</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            搜索、筛选并管理你的衣物
          </p>
        </div>
        <Link href="/wardrobe/add">
          <Button type="button">
            <Plus className="mr-1 h-4 w-4" />
            新增衣物
          </Button>
        </Link>
      </div>

      <SearchBar
        tags={tags}
        onSearch={(next) => setFilters(next)}
      />

      <ClothingGrid
        items={items}
        status={status}
        errorMessage={errorMessage}
      />
    </div>
  );
}
