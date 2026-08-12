"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const redirectTo = `${window.location.origin}/auth/callback?next=/settings`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
    toast.success("重置邮件已发送，请查收邮箱");
  }

  return (
    <AuthShell
      title="忘记密码"
      description={
        sent
          ? "若该邮箱已注册，你将收到重置链接"
          : "输入注册邮箱，我们会发送重置链接"
      }
    >
      {sent ? (
        <div className="space-y-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            请打开邮箱完成重置。若未收到，可检查垃圾箱或稍后重试。
          </p>
          <Link
            href="/auth/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-11 w-full"
            )}
          >
            返回登录
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-xs text-muted-foreground">
              邮箱
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 px-3.5"
            />
          </div>
          <div className="space-y-5 pt-3">
            <Button
              type="submit"
              size="lg"
              className="h-11 w-full"
              disabled={loading}
            >
              {loading ? "发送中..." : "发送重置链接"}
            </Button>
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              想起密码了？{" "}
              <Link
                href="/auth/login"
                className="font-medium text-primary hover:underline"
              >
                返回登录
              </Link>
            </p>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
