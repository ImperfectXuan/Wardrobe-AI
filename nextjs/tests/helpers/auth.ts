import { vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser, unauthorized } from "@/lib/api";
import { fakeUser } from "./fake-supabase";

/** 调用方测试文件需先 vi.mock("@/lib/api")，把 requireUser 替换为 vi.fn() */
export function signInAs(client: SupabaseClient) {
  vi.mocked(requireUser).mockResolvedValue({
    supabase: client,
    user: fakeUser,
    error: null,
  });
}

export function signOut() {
  vi.mocked(requireUser).mockResolvedValue({
    supabase: null,
    user: null,
    error: unauthorized(),
  });
}
