export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

type ApiEnvelope = {
  success?: boolean;
  error?: string;
};

export async function fetchJson<T extends ApiEnvelope>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init);
  let body: ApiEnvelope & Record<string, unknown> = {};

  try {
    body = (await response.json()) as ApiEnvelope & Record<string, unknown>;
  } catch {
    throw new ApiRequestError("响应解析失败", response.status);
  }

  if (!response.ok || body.success === false) {
    throw new ApiRequestError(
      typeof body.error === "string" ? body.error : "请求失败",
      response.status
    );
  }

  return body as T;
}
