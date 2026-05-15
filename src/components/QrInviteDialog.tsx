import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-context";
import { toast } from "sonner";
import { Copy } from "lucide-react";

export function QrInviteDialog({ trigger, groupId, groupName }: { trigger: React.ReactNode; groupId: string; groupName: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/invite/${groupId}` : `/invite/${groupId}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>{t("invite.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          <p className="text-sm text-muted-foreground text-center">{t("invite.subtitle")}</p>
          <div className="rounded-2xl bg-white p-4">
            <QRCodeSVG value={url} size={196} bgColor="#ffffff" fgColor="#000000" />
          </div>
          <p className="text-xs text-muted-foreground">{groupName}</p>
          <div className="w-full flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
            <span className="text-xs truncate flex-1">{url}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { navigator.clipboard?.writeText(url); toast.success("Скопійовано"); }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
