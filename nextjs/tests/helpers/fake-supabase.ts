import { NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface QueryResult {
  data?: unknown;
  error?: { message: string; code?: string } | null;
  count?: number | null;
}

export interface RecordedCall {
  table: string;
  method: string;
  args: unknown[];
}

export const fakeUser = { id: "user-1" } as User;

/**
 * 每次 from(table) 按顺序消费该表的一条预设结果；链上任意方法都记录并返回自身，
 * await 时解析为该结果，从而不依赖 Supabase 查询构造器的具体方法集合。
 */
export function createFakeSupabase(results: Record<string, QueryResult[]> = {}) {
  const calls: RecordedCall[] = [];
  const queues = new Map(
    Object.entries(results).map(([table, list]) => [table, [...list]])
  );

  function from(table: string): object {
    const result: QueryResult = {
      data: null,
      error: null,
      ...queues.get(table)?.shift(),
    };
    const builder: object = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "then") {
            return (
              resolve: (value: QueryResult) => unknown,
              reject: (reason: unknown) => unknown
            ) => Promise.resolve(result).then(resolve, reject);
          }
          return (...args: unknown[]) => {
            calls.push({ table, method: String(prop), args });
            return builder;
          };
        },
      }
    );
    return builder;
  }

  return { client: { from } as unknown as SupabaseClient, calls };
}

export function findCall(
  calls: RecordedCall[],
  table: string,
  method: string
): RecordedCall | undefined {
  return calls.find((call) => call.table === table && call.method === method);
}

export function formRequest(
  method: "POST" | "PATCH",
  path: string,
  fields: Record<string, string | Blob>
): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return new NextRequest(`http://localhost${path}`, { method, body: formData });
}

export function jsonRequest(path: string, body: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
  });
}
