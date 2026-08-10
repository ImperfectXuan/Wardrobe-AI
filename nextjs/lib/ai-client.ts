import type { RecognizeResult } from "@/lib/types";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8001";

export async function recognizeClothing(
  imageUrl: string
): Promise<RecognizeResult> {
  let resp: Response;
  try {
    resp = await fetch(`${FASTAPI_URL}/recognize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl }),
    });
  } catch (error) {
    console.error("recognizeClothing request failed:", error);
    throw new Error(
      error instanceof Error
        ? `无法连接 AI 服务: ${error.message}`
        : "无法连接 AI 服务"
    );
  }

  let data: {
    success?: boolean;
    data?: RecognizeResult;
    error?: string;
  };
  try {
    data = await resp.json();
  } catch (error) {
    console.error("recognizeClothing parse failed:", error);
    throw new Error(`AI 服务返回异常（HTTP ${resp.status}）`);
  }

  if (!resp.ok || !data.success || !data.data) {
    throw new Error(data.error || `AI 识别失败（HTTP ${resp.status}）`);
  }

  return data.data;
}
