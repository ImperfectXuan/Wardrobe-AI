import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PATCH } from "@/app/api/clothing/[id]/route";
import { deleteImage, uploadImage } from "@/lib/minio";
import { signInAs, signOut } from "../helpers/auth";
import {
  createFakeSupabase,
  fakeUser,
  findCall,
  formRequest,
} from "../helpers/fake-supabase";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  requireUser: vi.fn(),
}));
vi.mock("@/lib/minio", () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }));

const itemId = "item-1";
const routeContext = { params: Promise.resolve({ id: itemId }) };
const oldImageUrl = "http://localhost:9000/wardrobe-images/user-1/old.jpg";
const existingItem = { data: { id: itemId, image_url: oldImageUrl } };

function patchClothing(fields: Record<string, string | Blob>) {
  return PATCH(formRequest("PATCH", `/api/clothing/${itemId}`, fields), routeContext);
}

describe("PATCH /api/clothing/[id]", () => {
  beforeEach(() => {
    vi.mocked(uploadImage).mockReset();
    vi.mocked(deleteImage).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("未登录返回 401", async () => {
    signOut();

    const response = await patchClothing({ name: "新名字" });

    expect(response.status).toBe(401);
  });

  it("衣物不存在或不属于当前用户时返回 404", async () => {
    const { client, calls } = createFakeSupabase({
      clothing_items: [{ data: null }],
    });
    signInAs(client);

    const response = await patchClothing({ name: "新名字" });

    expect(response.status).toBe(404);
    expect(findCall(calls, "clothing_items", "eq")?.args).toEqual(["id", itemId]);
    expect(calls).toContainEqual({
      table: "clothing_items",
      method: "eq",
      args: ["user_id", fakeUser.id],
    });
  });

  it.each([
    ["分类不在白名单", { category: "内衣" }, "分类无效"],
    ["名称被清空", { name: "" }, "名称不能为空"],
  ])("%s 时返回 400 且不更新", async (_case, fields, message) => {
    const { client, calls } = createFakeSupabase({ clothing_items: [existingItem] });
    signInAs(client);

    const response = await patchClothing(fields);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: message });
    expect(findCall(calls, "clothing_items", "update")).toBeUndefined();
  });

  it("tag_ids 不是 JSON 时返回 400 且不改动标签关联", async () => {
    const { client, calls } = createFakeSupabase({
      clothing_items: [existingItem, { data: { id: itemId } }],
    });
    signInAs(client);

    const response = await patchClothing({ tag_ids: "t1,t2" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: "tag_ids 格式无效" });
    expect(calls.some((call) => call.table === "clothing_tags")).toBe(false);
  });

  it("只更新表单里出现的字段，空字符串存 null", async () => {
    const { client, calls } = createFakeSupabase({
      clothing_items: [existingItem, { data: { id: itemId, name: "新名字" } }],
    });
    signInAs(client);

    const response = await patchClothing({ name: "新名字", brand: "" });

    expect(response.status).toBe(200);
    expect(findCall(calls, "clothing_items", "update")?.args[0]).toEqual({
      name: "新名字",
      brand: null,
    });
  });

  it("传入 tag_ids 时先清空再重建标签关联", async () => {
    const { client, calls } = createFakeSupabase({
      clothing_items: [existingItem, { data: { id: itemId } }],
    });
    signInAs(client);

    const response = await patchClothing({ tag_ids: JSON.stringify(["t3"]) });

    expect(response.status).toBe(200);
    expect(findCall(calls, "clothing_tags", "delete")).toBeDefined();
    expect(findCall(calls, "clothing_tags", "insert")?.args[0]).toEqual([
      { clothing_id: itemId, tag_id: "t3" },
    ]);
  });

  it("换图时删除旧图；旧图删除失败不阻断更新", async () => {
    const newImageUrl = "http://localhost:9000/wardrobe-images/user-1/new.jpg";
    vi.mocked(deleteImage).mockRejectedValue(new Error("旧图不存在"));
    vi.mocked(uploadImage).mockResolvedValue(newImageUrl);
    const { client, calls } = createFakeSupabase({
      clothing_items: [existingItem, { data: { id: itemId } }],
    });
    signInAs(client);
    const image = new File(["fake-bytes"], "new.jpg", { type: "image/jpeg" });

    const response = await patchClothing({ image });

    expect(response.status).toBe(200);
    expect(deleteImage).toHaveBeenCalledWith(oldImageUrl);
    expect(findCall(calls, "clothing_items", "update")?.args[0]).toEqual({
      image_url: newImageUrl,
    });
  });
});

describe("DELETE /api/clothing/[id]", () => {
  function deleteClothing() {
    return DELETE(
      new NextRequest(`http://localhost/api/clothing/${itemId}`, { method: "DELETE" }),
      routeContext
    );
  }

  it("衣物不存在时返回 404", async () => {
    const { client } = createFakeSupabase({ clothing_items: [{ data: null }] });
    signInAs(client);

    const response = await deleteClothing();

    expect(response.status).toBe(404);
  });

  it("软删除：把 is_deleted 置为 true 而不是删除记录", async () => {
    const { client, calls } = createFakeSupabase({
      clothing_items: [{ data: { id: itemId } }],
    });
    signInAs(client);

    const response = await deleteClothing();

    expect(response.status).toBe(200);
    expect(findCall(calls, "clothing_items", "update")?.args[0]).toEqual({
      is_deleted: true,
    });
    expect(findCall(calls, "clothing_items", "delete")).toBeUndefined();
  });
});
