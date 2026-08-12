"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("h-11 px-3.5 pr-11", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "隐藏密码" : "显示密码"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}
