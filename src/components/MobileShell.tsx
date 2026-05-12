import { type ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md min-h-screen relative pb-32">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
