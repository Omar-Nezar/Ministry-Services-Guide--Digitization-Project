import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "idle" | "pending" | "saving" | "saved" | "error";

export function SaveIndicator({ status }: { status: Status }) {
  if (status === "idle") return null;
  if (status === "error") return <span className="text-xs text-destructive">فشل الحفظ</span>;
  if (status === "saved")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
        <Check className="size-3" /> تم الحفظ
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Loader2 className={cn("size-3", status === "saving" && "animate-spin")} /> {status === "saving" ? "جارٍ الحفظ" : "تعديلات غير محفوظة"}
    </span>
  );
}
