import type { ReactNode } from "react";
import Link from "next/link";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[22rem] rounded-2xl bg-card px-8 py-9 ring-1 ring-foreground/10">
        <div className="mb-8 space-y-6">
          <Link href="/auth/login" className="inline-flex items-center gap-2.5">
            <span className="rounded-lg bg-primary px-2 py-1 text-xs font-bold tracking-wide text-primary-foreground">
              WA
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Wardrobe AI
            </span>
          </Link>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
              {title}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
