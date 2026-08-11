"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiRequestError, fetchJson } from "@/lib/fetch-json";

type MeResponse = {
  success: true;
  id: string;
  email: string;
  nickname: string;
  avatar_url: string;
};

type ProfileResponse = {
  success: true;
  nickname: string;
  avatar_url: string;
};

export default function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchJson<MeResponse>("/api/auth/me");
        if (cancelled) return;
        setEmail(data.email);
        setNickname(data.nickname);
        setAvatarUrl(data.avatar_url);
      } catch (error) {
        toast.error(
          error instanceof ApiRequestError ? error.message : "加载资料失败"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function onAvatarPicked(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("nickname", nickname.trim());
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const data = await fetchJson<ProfileResponse>("/api/auth/profile", {
        method: "PATCH",
        body: formData,
      });

      setNickname(data.nickname);
      setAvatarUrl(data.avatar_url);
      setAvatarFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      toast.success("资料已保存");
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError ? error.message : "保存失败"
      );
    } finally {
      setSaving(false);
    }
  }

  const displayAvatar = previewUrl || avatarUrl;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          编辑昵称与头像（不含改密）
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>个人资料</CardTitle>
          <CardDescription>邮箱只读，昵称与头像可修改</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-20 w-20 animate-pulse rounded-full bg-muted" />
              <div className="h-9 animate-pulse rounded bg-muted" />
              <div className="h-9 animate-pulse rounded bg-muted" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-full border bg-muted">
                  {displayAvatar ? (
                    <Image
                      src={displayAvatar}
                      alt="头像"
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      无头像
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onAvatarPicked(e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                  >
                    选择头像
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">邮箱</Label>
                <Input id="email" value={email} disabled readOnly />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nickname">昵称</Label>
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="你的昵称"
                  maxLength={100}
                />
              </div>

              <Button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? "保存中…" : "保存"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
