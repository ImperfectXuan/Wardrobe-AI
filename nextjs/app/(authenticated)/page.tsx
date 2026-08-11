"use client";

import { useEffect, useState } from "react";
import { Package, PlusCircle, Tags } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { RecentItems } from "@/components/dashboard/RecentItems";
import type { ViewStatus } from "@/components/wardrobe/ClothingGrid";
import { fetchJson, ApiRequestError } from "@/lib/fetch-json";
import type { ClothingItem, StatsSummary } from "@/lib/types";

type DashboardData = StatsSummary & { success: true };

export default function DashboardPage() {
  const [status, setStatus] = useState<ViewStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [stats, setStats] = useState<StatsSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      setErrorMessage("");
      try {
        const data = await fetchJson<DashboardData>("/api/stats/summary");
        if (cancelled) return;
        setStats({
          total_items: data.total_items,
          new_this_month: data.new_this_month,
          brand_count: data.brand_count,
          category_distribution: data.category_distribution,
          recent_items: data.recent_items as ClothingItem[],
        });
        setStatus(data.total_items === 0 ? "empty" : "ready");
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          error instanceof ApiRequestError ? error.message : "加载失败"
        );
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const recentStatus: ViewStatus =
    status === "loading"
      ? "loading"
      : status === "error"
        ? "error"
        : !stats || stats.recent_items.length === 0
          ? "empty"
          : "ready";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">仪表盘</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          一眼掌握衣橱规模与最近新增
        </p>
      </div>

      {status === "error" ? (
        <div className="rounded-xl border border-destructive/30 p-6 text-sm text-destructive">
          {errorMessage || "加载失败，请稍后重试"}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {status === "loading" ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-xl bg-muted"
                />
              ))
            ) : (
              <>
                <StatCard
                  icon={Package}
                  value={stats?.total_items ?? 0}
                  label="衣物总量"
                />
                <StatCard
                  icon={PlusCircle}
                  value={stats?.new_this_month ?? 0}
                  label="本月新增"
                />
                <StatCard
                  icon={Tags}
                  value={stats?.brand_count ?? 0}
                  label="品牌数"
                />
              </>
            )}
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-medium">分类分布</h2>
            {status === "loading" ? (
              <div className="h-64 animate-pulse rounded-xl bg-muted" />
            ) : (
              <CategoryPieChart data={stats?.category_distribution ?? []} />
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium">最近新增</h2>
            <RecentItems
              items={stats?.recent_items ?? []}
              status={recentStatus}
              errorMessage={errorMessage}
            />
          </section>
        </>
      )}
    </div>
  );
}
