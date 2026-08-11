"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface CategoryPieChartProps {
  data: { category: string; count: number }[];
}

const COLORS = ["#2563eb", "#16a34a", "#ca8a04", "#dc2626", "#7c3aed"];

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border text-sm text-muted-foreground">
        暂无分类数据
      </div>
    );
  }

  return (
    <div className="h-64 w-full rounded-xl border p-2">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ category, count }) => `${category} ${count}`}
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
  );
}
