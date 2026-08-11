"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CLOTHING_CATEGORIES, SEASONS, type Tag } from "@/lib/types";

export interface SearchFilters {
  search: string;
  category: string;
  season: string;
  tags: string[];
}

interface SearchBarProps {
  tags?: Tag[];
  onSearch: (filters: SearchFilters) => void;
}

export function SearchBar({ tags = [], onSearch }: SearchBarProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [season, setSeason] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  function emit(next?: Partial<SearchFilters>) {
    onSearch({
      search: next?.search ?? search,
      category: next?.category ?? category,
      season: next?.season ?? season,
      tags: next?.tags ?? selectedTags,
    });
  }

  function toggleTag(name: string) {
    const next = selectedTags.includes(name)
      ? selectedTags.filter((tag) => tag !== name)
      : [...selectedTags, name];
    setSelectedTags(next);
    emit({ tags: next });
  }

  function clearAll() {
    setSearch("");
    setCategory("");
    setSeason("");
    setSelectedTags([]);
    onSearch({ search: "", category: "", season: "", tags: [] });
  }

  const hasFilters = Boolean(search || category || season || selectedTags.length);

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);
              emit({ search: value });
            }}
            placeholder="搜索衣物名称…"
            className="pl-8"
          />
        </div>

        <Select
          value={category || null}
          onValueChange={(value) => {
            const next = value ?? "";
            setCategory(next);
            emit({ category: next });
          }}
        >
          <SelectTrigger className="w-full md:w-36">
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent>
            {CLOTHING_CATEGORIES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={season || null}
          onValueChange={(value) => {
            const next = value ?? "";
            setSeason(next);
            emit({ season: next });
          }}
        >
          <SelectTrigger className="w-full md:w-36">
            <SelectValue placeholder="季节" />
          </SelectTrigger>
          <SelectContent>
            {SEASONS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
            <X className="h-4 w-4" />
            清除
          </Button>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const active = selectedTags.includes(tag.name);
            return (
              <button key={tag.id} type="button" onClick={() => toggleTag(tag.name)}>
                <Badge variant={active ? "default" : "outline"}>{tag.name}</Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
