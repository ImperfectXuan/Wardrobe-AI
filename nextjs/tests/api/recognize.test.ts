import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { POST } from "@/app/api/clothing/ai/recognize/route";
import { recognizeClothing } from "@/lib/ai-client";
import { uploadImage } from "@/lib/minio";
import { createServerSupabase } from "@/lib/supabase/server";
import { fakeUser, formRequest } from "../helpers/fake-supabase";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/minio", () => ({ uploadImage: vi.fn(), deleteImage: vi.fn() }));
vi.mock("@/lib/ai-client", () => ({ recognizeClothing: vi.fn() }));

const imageUrl = "http://localhost:9000/wardrobe-images/user-1/a.jpg";
const recognized = {
  name: "白衬衫",
  category: "上衣",
  color: "白色",
  season: "四季",
  style: "商务",
  material: "纯棉",
};

function mockSessionUser(user: typeof fakeUser | null) {
  vi.mocked(createServerSupabase).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  } as unknown as SupabaseClient);
}

function postRecognize(fields: Record<string, string | Blob>) {
  return POST(formRequest("POST", "/api/clothing/ai/recognize", fields));
}

function imageFile() {
  return new File(["fake-bytes"], "a.jpg", { type: "image/jpeg" });
}

describe("POST /api/clothing/ai/recognize", () => {
  beforeEach(() => {
    vi.mocked(uploadImage).mockReset();
    vi.mocked(recognizeClothing).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("未登录返回 401", async () => {
    mockSessionUser(null);

    const response = await postRecognize({ image: imageFile() });

    expect(response.status).toBe(401);
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it.each([
    ["没有图片字段", {}],
    ["图片为空文件", { image: new File([], "empty.jpg") }],
  ])("%s 时返回 400", async (_case, fields) => {
    mockSessionUser(fakeUser);

    const response = await postRecognize(fields);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: "请上传图片" });
  });

  it("上传后把 MinIO URL 交给 AI，并把结果和 URL 一起返回", async () => {
    mockSessionUser(fakeUser);
    vi.mocked(uploadImage).mockResolvedValue(imageUrl);
    vi.mocked(recognizeClothing).mockResolvedValue(recognized);

    const response = await postRecognize({ image: imageFile() });

    expect(response.status).toBe(200);
    expect(recognizeClothing).toHaveBeenCalledWith(imageUrl);
    expect(await response.json()).toEqual({
      success: true,
      data: recognized,
      image_url: imageUrl,
    });
  });

  it("上传失败时不调用 AI", async () => {
    mockSessionUser(fakeUser);
    vi.mocked(uploadImage).mockRejectedValue(new Error("MinIO 不可用"));

    const response = await postRecognize({ image: imageFile() });

    expect(response.status).toBe(500);
    expect(recognizeClothing).not.toHaveBeenCalled();
  });

  it("AI 失败时仍返回已上传的图片 URL，方便用户跳过识别手动填写", async () => {
    mockSessionUser(fakeUser);
    vi.mocked(uploadImage).mockResolvedValue(imageUrl);
    vi.mocked(recognizeClothing).mockRejectedValue(new Error("模型超时"));

    const response = await postRecognize({ image: imageFile() });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      error: "模型超时",
      image_url: imageUrl,
    });
  });
});
