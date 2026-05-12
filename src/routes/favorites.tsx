import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "Обране — Оплата та Поділ" }] }),
  component: () => (
    <MobileShell>
      <div className="px-5 pt-10 text-center">
        <div className="size-16 mx-auto rounded-2xl bg-accent flex items-center justify-center">
          <Heart className="size-7 text-primary" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Обране</h1>
        <p className="text-sm text-muted-foreground mt-1">Тут зʼявляться ваші улюблені групи та контакти.</p>
      </div>
    </MobileShell>
  ),
});
