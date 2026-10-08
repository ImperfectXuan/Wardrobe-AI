import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, fetchJson } from "@/lib/fetch-json";

function stubFetch(response: Response) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function captureError(promise: Promise<unknown>): Promise<ApiRequestError> {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason
  );
  expect(error).toBeInstanceOf(ApiRequestError);
  return error as ApiRequestError;
}

describe("fetchJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("成功时返回响应体", async () => {
    stubFetch(jsonResponse({ success: true, items: [1, 2] }));

    await expect(fetchJson("/api/clothing")).resolves.toEqual({
      success: true,
      items: [1, 2],
    });
  });

  it("HTTP 失败时抛出带服务端错误信息和状态码的异常", async () => {
    stubFetch(jsonResponse({ success: false, error: "衣物不存在" }, 404));

    const error = await captureError(fetchJson("/api/clothing/x"));

    expect(error.message).toBe("衣物不存在");
    expect(error.status).toBe(404);
  });

  it("HTTP 200 但 success 为 false 时也视为失败", async () => {
    stubFetch(jsonResponse({ success: false, error: "标签已存在" }));

    const error = await captureError(fetchJson("/api/tags"));

    expect(error.message).toBe("标签已存在");
    expect(error.status).toBe(200);
  });

  it("失败但没有 error 字段时使用兜底文案", async () => {
    stubFetch(jsonResponse({}, 500));

    const error = await captureError(fetchJson("/api/stats/summary"));

    expect(error.message).toBe("请求失败");
  });

  it("响应不是 JSON 时抛出解析失败", async () => {
    stubFetch(new Response("<html>502</html>", { status: 502 }));

    const error = await captureError(fetchJson("/api/clothing"));

    expect(error.message).toBe("响应解析失败");
    expect(error.status).toBe(502);
  });
});
