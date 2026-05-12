import { useApp } from "@/lib/app-context";
import { AlertCircle, Loader2 } from "lucide-react";

export function AsyncStatus() {
  const { loading, error, isLive } = useApp();
  if (!isLive) return null;
  if (!loading && !error) return null;
  return (
    <div className="px-5 mt-2">
      {loading && (
        <div className="flex items-center gap-2 rounded-xl bg-surface-elevated border border-border px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          Завантаження даних…
        </div>
      )}
      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="size-4" />
          {error}
        </div>
      )}
    </div>
  );
}
