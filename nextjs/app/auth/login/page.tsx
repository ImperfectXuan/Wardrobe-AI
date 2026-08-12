"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("登录成功");
    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell title="登录" description="欢迎回到你的数字衣橱">
      <form onSubmit={handleLogin} className="space-y-6">
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

        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-4">
            <Label
              htmlFor="current-password"
              className="text-xs text-muted-foreground"
            >
              密码
            </Label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              忘记密码？
            </Link>
          </div>
          <PasswordInput
            id="current-password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11 px-3.5 pr-11"
          />
        </div>

        <div className="space-y-5 pt-3">
          <Button
            type="submit"
            size="lg"
            className="h-11 w-full"
            disabled={loading}
          >
            {loading ? "登录中..." : "登录"}
          </Button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            还没有账户？{" "}
            <Link
              href="/auth/register"
              className="font-medium text-primary hover:underline"
            >
              注册
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  );
}
