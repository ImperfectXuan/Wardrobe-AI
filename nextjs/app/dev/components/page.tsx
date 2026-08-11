"use client";

import { useMemo, useState } from "react";
import { Package, PlusCircle, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { RecentItems } from "@/components/dashboard/RecentItems";
import { ClothingGrid, type ViewStatus } from "@/components/wardrobe/ClothingGrid";
import { SearchBar, type SearchFilters } from "@/components/wardrobe/SearchBar";
import { UploadZone } from "@/components/wardrobe/UploadZone";
import { AIRecognitionPanel } from "@/components/wardrobe/AIRecognitionPanel";
import {
  ClothingForm,
  type ClothingFormValues,
} from "@/components/wardrobe/ClothingForm";
import type { ClothingItem, RecognizeResult, Tag } from "@/lib/types";

const MOCK_TAGS: Tag[] = [
  { id: "t1", name: "通勤", group: "场景" },
  { id: "t2", name: "约会", group: "场景" },
  { id: "t3", name: "运动", group: "场景" },
];

const MOCK_ITEMS: ClothingItem[] = [
  {
    id: "1",
    user_id: "u1",
    name: "黑色休闲衬衫",
    category: "上衣",
    brand: "Uniqlo",
    color: "黑色",
    season: "四季",
    style: "休闲",
    image_url: null,
    notes: null,
    is_deleted: false,
    created_at: new Date().toISOString(),
    tags: [MOCK_TAGS[0]],
  },
  {
    id: "2",
    user_id: "u1",
    name: "深蓝直筒牛仔裤",
    category: "裤子",
    brand: "Levi's",
    color: "深蓝",
    season: "春秋",
    style: "休闲",
    image_url: null,
    notes: null,
    is_deleted: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    user_id: "u1",
    name: "米色风衣",
    category: "外套",
    brand: "COS",
    color: "米色",
    season: "春秋",
    style: "极简",
    image_url: null,
    notes: null,
    is_deleted: false,
    created_at: new Date().toISOString(),
  },
];

function StatusSwitcher({
  value,
  onChange,
}: {
  value: ViewStatus;
  onChange: (status: ViewStatus) => void;
}) {
  const options: ViewStatus[] = ["ready", "loading", "empty", "error"];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((status) => (
        <Button
          key={status}
          type="button"
          size="sm"
          variant={value === status ? "default" : "outline"}
          onClick={() => onChange(status)}
        >
          {status}
        </Button>
      ))}
    </div>
  );
}

export default function ComponentsPreviewPage() {
  const [gridStatus, setGridStatus] = useState<ViewStatus>("ready");
  const [recentStatus, setRecentStatus] = useState<ViewStatus>("ready");
  const [pieEmpty, setPieEmpty] = useState(false);
  const [filters, setFilters] = useState<SearchFilters | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [aiResult, setAiResult] = useState<RecognizeResult | null>(null);
  const [formResult, setFormResult] = useState<ClothingFormValues | null>(null);

  const pieData = useMemo(
    () =>
      pieEmpty
        ? []
        : [
            { category: "上衣", count: 4 },
            { category: "裤子", count: 2 },
            { category: "外套", count: 1 },
          ],
    [pieEmpty]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">组件预览 /dev/components</h1>
        <p className="text-sm text-muted-foreground">
          阶段 IV：Props + mock，不接真实 API
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">StatCard</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard icon={Package} value={12} label="衣物总数" />
          <StatCard icon={PlusCircle} value={3} label="本月新增" />
          <StatCard icon={Tags} value={5} label="品牌数" />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">CategoryPieChart</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPieEmpty((v) => !v)}
          >
            {pieEmpty ? "显示数据" : "切到 empty"}
          </Button>
        </div>
        <CategoryPieChart data={pieData} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">RecentItems</h2>
          <StatusSwitcher value={recentStatus} onChange={setRecentStatus} />
        </div>
        <RecentItems items={MOCK_ITEMS} status={recentStatus} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">SearchBar</h2>
        <SearchBar tags={MOCK_TAGS} onSearch={setFilters} />
        <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs">
          {JSON.stringify(filters, null, 2)}
        </pre>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">ClothingGrid / ClothingCard</h2>
          <StatusSwitcher value={gridStatus} onChange={setGridStatus} />
        </div>
        <ClothingGrid items={MOCK_ITEMS} status={gridStatus} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">UploadZone + AIRecognitionPanel</h2>
        <UploadZone onImageSelected={setSelectedFile} />
        <AIRecognitionPanel
          file={selectedFile}
          onResult={(result) => setAiResult(result)}
        />
        <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs">
          {JSON.stringify(aiResult, null, 2)}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">ClothingForm</h2>
        <ClothingForm onSubmit={setFormResult} />
        <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs">
          {JSON.stringify(formResult, null, 2)}
        </pre>
      </section>
    </div>
  );
}
