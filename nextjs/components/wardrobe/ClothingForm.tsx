"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CLOTHING_CATEGORIES,
  SEASONS,
  STYLES,
  type ClothingCategory,
} from "@/lib/types";

export interface ClothingFormValues {
  name: string;
  category: ClothingCategory | "";
  brand: string;
  color: string;
  season: string;
  style: string;
  notes: string;
}

interface ClothingFormProps {
  defaultValues?: Partial<ClothingFormValues>;
  onSubmit: (values: ClothingFormValues) => void;
  submitLabel?: string;
  disabled?: boolean;
}

export function ClothingForm({
  defaultValues,
  onSubmit,
  submitLabel = "保存",
  disabled = false,
}: ClothingFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClothingFormValues>({
    defaultValues: {
      name: "",
      category: "",
      brand: "",
      color: "",
      season: "",
      style: "",
      notes: "",
      ...defaultValues,
    },
  });

  const category = watch("category");
  const season = watch("season");
  const style = watch("style");

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((values) => onSubmit(values))}
    >
      <div className="space-y-1.5">
        <Label htmlFor="name">名称 *</Label>
        <Input
          id="name"
          {...register("name", { required: "请填写名称" })}
          placeholder="例如：黑色休闲衬衫"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>分类 *</Label>
        <Select
          value={category || null}
          onValueChange={(value) =>
            setValue("category", (value as ClothingCategory) || "", {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择分类" />
          </SelectTrigger>
          <SelectContent>
            {CLOTHING_CATEGORIES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          type="hidden"
          {...register("category", { required: "请选择分类" })}
        />
        {errors.category && (
          <p className="text-xs text-destructive">{errors.category.message}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="brand">品牌</Label>
          <Input id="brand" {...register("brand")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="color">颜色</Label>
          <Input id="color" {...register("color")} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>季节</Label>
          <Select
            value={season || null}
            onValueChange={(value) => setValue("season", value ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择季节" />
            </SelectTrigger>
            <SelectContent>
              {SEASONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>风格</Label>
          <Select
            value={style || null}
            onValueChange={(value) => setValue("style", value ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择风格" />
            </SelectTrigger>
            <SelectContent>
              {STYLES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">备注</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </div>

      <Button type="submit" disabled={disabled}>
        {submitLabel}
      </Button>
    </form>
  );
}
