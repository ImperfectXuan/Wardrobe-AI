import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/tags/route";
import { signInAs, signOut } from "../helpers/auth";
import {
  createFakeSupabase,
  fakeUser,
  findCall,
  jsonRequest,
} from "../helpers/fake-supabase";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireUser: vi.fn(),
}));

function postTag(body: string) {
  return POST(jsonRequest("/api/tags", body));
}

describe("POST /api/tags", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("未登录返回 401", async () => {
    signOut();

    const response = await postTag(JSON.stringify({ name: "通勤" }));

    expect(response.status).toBe(401);
  });

  it.each([
    ["请求体不是 JSON", "name=通勤", "请求体必须是 JSON"],
    ["缺少名称", JSON.stringify({ group: "场景" }), "标签名称为必填项"],
    ["名称只有空格", JSON.stringify({ name: "  " }), "标签名称为必填项"],
  ])("%s 时返回 400 且不写库", async (_case, body, message) => {
    const { client, calls } = createFakeSupabase();
    signInAs(client);

    const response = await postTag(body);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: message });
    expect(calls).toHaveLength(0);
  });

  it("未指定分组时归入「自定义」，名称去除首尾空格", async () => {
    const tag = { id: "t1", name: "通勤", group: "自定义" };
    const { client, calls } = createFakeSupabase({ tags: [{ data: tag }] });
    signInAs(client);

    const response = await postTag(JSON.stringify({ name: " 通勤 " }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true, tag });
    expect(findCall(calls, "tags", "insert")?.args[0]).toEqual({
      user_id: fakeUser.id,
      name: "通勤",
      group: "自定义",
    });
  });

  it("唯一约束冲突（23505）时返回 409", async () => {
    const { client } = createFakeSupabase({
      tags: [{ error: { message: "duplicate key", code: "23505" } }],
    });
    signInAs(client);

    const response = await postTag(JSON.stringify({ name: "通勤" }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ success: false, error: "标签已存在" });
  });
});
