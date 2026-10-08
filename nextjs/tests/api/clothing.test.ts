import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/clothing/route";
import { uploadImage } from "@/lib/minio";
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

const createdItem = { id: "item-1", name: "白衬衫", category: "上衣" };

function postClothing(fields: Record<string, string | Blob>) {
  return POST(formRequest("POST", "/api/clothing", fields));
}

describe("POST /api/clothing", () => {
  beforeEach(() => {
    vi.mocked(uploadImage).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("未登录返回 401", async () => {
    signOut();

    const response = await postClothing({ name: "白衬衫", category: "上衣" });

    expect(response.status).toBe(401);
  });

  it.each([
    ["缺少名称", { category: "上衣" }, "名称和分类为必填项"],
    ["名称只有空格", { name: "   ", category: "上衣" }, "名称和分类为必填项"],
    ["缺少分类", { name: "白衬衫" }, "名称和分类为必填项"],
    ["分类不在白名单", { name: "白衬衫", category: "内衣" }, "分类无效"],
    ["tag_ids 不是 JSON", { name: "白衬衫", category: "上衣", tag_ids: "t1,t2" }, "tag_ids 格式无效"],
  ])("%s 时返回 400 且不写库", async (_case, fields, message) => {
    const { client, calls } = createFakeSupabase();
    signInAs(client);

    const response = await postClothing(fields);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: message });
    expect(calls).toHaveLength(0);
  });

  it("校验通过时绑定当前用户、空字段存 null，并写入标签关联", async () => {
    const { client, calls } = createFakeSupabase({
      clothing_items: [{ data: createdItem }],
    });
    signInAs(client);

    const response = await postClothing({
      name: " 白衬衫 ",
      category: "上衣",
      brand: "",
      color: "白色",
      tag_ids: JSON.stringify(["t1", "t2"]),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true, item: createdItem });
    expect(uploadImage).not.toHaveBeenCalled();
    expect(findCall(calls, "clothing_items", "insert")?.args[0]).toEqual({
      user_id: fakeUser.id,
      name: "白衬衫",
      category: "上衣",
      brand: null,
      color: "白色",
      season: null,
      style: null,
      image_url: null,
      notes: null,
    });
    expect(findCall(calls, "clothing_tags", "insert")?.args[0]).toEqual([
      { clothing_id: "item-1", tag_id: "t1" },
      { clothing_id: "item-1", tag_id: "t2" },
    ]);
  });

  it("带图片时先上传 MinIO 再把 URL 写入记录", async () => {
    const imageUrl = "http://localhost:9000/wardrobe-images/user-1/a.jpg";
    vi.mocked(uploadImage).mockResolvedValue(imageUrl);
    const { client, calls } = createFakeSupabase({
      clothing_items: [{ data: createdItem }],
    });
    signInAs(client);
    const image = new File(["fake-bytes"], "a.jpg", { type: "image/jpeg" });

    const response = await postClothing({ name: "白衬衫", category: "上衣", image });

    expect(response.status).toBe(201);
    expect(uploadImage).toHaveBeenCalledWith(expect.any(File), fakeUser.id);
    expect(findCall(calls, "clothing_items", "insert")?.args[0]).toMatchObject({
      image_url: imageUrl,
    });
  });

  it("图片上传失败时返回 500 且不写库", async () => {
    vi.mocked(uploadImage).mockRejectedValue(new Error("MinIO 不可用"));
    const { client, calls } = createFakeSupabase();
    signInAs(client);
    const image = new File(["fake-bytes"], "a.jpg", { type: "image/jpeg" });

    const response = await postClothing({ name: "白衬衫", category: "上衣", image });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, error: "MinIO 不可用" });
    expect(calls).toHaveLength(0);
  });
});
