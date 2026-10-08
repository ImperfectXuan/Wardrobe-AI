import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { apiError, flattenClothingTags, requireUser } from "@/lib/api";
import { fakeUser } from "../helpers/fake-supabase";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));

function mockSessionUser(user: typeof fakeUser | null) {
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  } as unknown as SupabaseClient;
  vi.mocked(createServerSupabase).mockResolvedValue(client);
  return client;
}

describe("flattenClothingTags", () => {
  it("把关联表展开为 tags 数组并去掉 clothing_tags", () => {
    const item = {
      id: "c1",
      clothing_tags: [
        { tags: { id: "t1", name: "通勤", group: "场景" } },
        { tags: { id: "t2", name: "黑色", group: "颜色" } },
      ],
    };

    expect(flattenClothingTags(item)).toEqual({
      id: "c1",
      tags: [
        { id: "t1", name: "通勤", group: "场景" },
        { id: "t2", name: "黑色", group: "颜色" },
      ],
    });
  });

  it("过滤掉已被删除的标签（join 结果为 null）", () => {
    const item = {
      id: "c1",
      clothing_tags: [{ tags: null }, { tags: { id: "t1", name: "通勤", group: "场景" } }],
    };

    expect(flattenClothingTags(item).tags).toEqual([
      { id: "t1", name: "通勤", group: "场景" },
    ]);
  });

  it("clothing_tags 缺失或为 null 时返回空数组", () => {
    const withoutJoin: { id: string; clothing_tags?: null } = { id: "c1" };
    const nullJoin = { id: "c1", clothing_tags: null };

    expect(flattenClothingTags(withoutJoin).tags).toEqual([]);
    expect(flattenClothingTags(nullJoin).tags).toEqual([]);
  });
});

describe("apiError", () => {
  it("返回统一错误结构和状态码", async () => {
    const response = apiError("分类无效", 400);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: "分类无效" });
  });

  it("默认状态码为 500", () => {
    expect(apiError("出错了").status).toBe(500);
  });
});

describe("requireUser", () => {
  beforeEach(() => {
    vi.mocked(createServerSupabase).mockReset();
  });

  it("未登录时返回 401 响应", async () => {
    mockSessionUser(null);

    const result = await requireUser();

    expect(result.user).toBeNull();
    expect(result.error?.status).toBe(401);
    expect(await result.error?.json()).toEqual({ success: false, error: "未登录" });
  });

  it("已登录时返回用户和客户端", async () => {
    const client = mockSessionUser(fakeUser);

    const result = await requireUser();

    expect(result.error).toBeNull();
    expect(result.user).toBe(fakeUser);
    expect(result.supabase).toBe(client);
  });
});
