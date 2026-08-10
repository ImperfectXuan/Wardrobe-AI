import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import type { User, SupabaseClient } from "@supabase/supabase-js";

export function unauthorized(message = "未登录") {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function apiError(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function requireUser(): Promise<
  | { supabase: SupabaseClient; user: User; error: null }
  | { supabase: null; user: null; error: NextResponse }
> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase: null, user: null, error: unauthorized() };
  }

  return { supabase, user, error: null };
}

type ClothingTagJoin = {
  tags: { id: string; name: string; group: string } | null;
};

export function flattenClothingTags<T extends { clothing_tags?: ClothingTagJoin[] | null }>(
  item: T
) {
  const { clothing_tags, ...rest } = item;
  return {
    ...rest,
    tags: (clothing_tags ?? [])
      .map((ct) => ct.tags)
      .filter((tag): tag is NonNullable<typeof tag> => tag != null),
  };
}
