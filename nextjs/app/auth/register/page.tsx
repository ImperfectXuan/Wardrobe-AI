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

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("注册成功！");
    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell title="注册" description="开始管理你的数字衣橱">
      <form onSubmit={handleRegister} className="space-y-6">
        <div className="space-y-2.5">
          <Label htmlFor="nickname" className="text-xs text-muted-foreground">
            昵称
          </Label>
          <Input
            id="nickname"
            name="nickname"
            type="text"
            autoComplete="nickname"
            placeholder="你的昵称"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            className="h-11 px-3.5"
          />
        </div>

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
          <Label
            htmlFor="new-password"
            className="text-xs text-muted-foreground"
          >
            密码
          </Label>
          <PasswordInput
            id="new-password"
            name="password"
            autoComplete="new-password"
            placeholder="至少 8 个字符"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
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
            {loading ? "注册中..." : "注册"}
          </Button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            已有账户？{" "}
            <Link
              href="/auth/login"
              className="font-medium text-primary hover:underline"
            >
              登录
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  );
}
