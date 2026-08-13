"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface CategoryPieChartProps {
  data: { category: string; count: number }[];
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const [showLabels, setShowLabels] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setShowLabels(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border text-sm text-muted-foreground">
        暂无分类数据
      </div>
    );
  }

  return (
    <div className="flex h-72 w-full flex-col rounded-xl border p-2 sm:h-64 sm:flex-row">
      <div className="min-h-0 min-w-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius="70%"
              label={
                showLabels
                  ? ({ category, count }) => `${category} ${count}`
                  : false
              }
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.category}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-2 pb-2 text-xs sm:w-36 sm:flex-col sm:justify-center sm:pb-0">
        {data.map((entry, index) => (
          <li key={entry.category} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: COLORS[index % COLORS.length] }}
            />
            <span>
              {entry.category} {entry.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
