import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-24">
      <h1 className="text-3xl font-bold">Wardrobe AI</h1>
      <p className="text-muted-foreground">AI 数字衣橱</p>
      <Button>开始使用</Button>
    </main>
  );
}
