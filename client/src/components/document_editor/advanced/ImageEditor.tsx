import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

type Props = {
  page: any;
  onPageChange: (p: any) => void;
};

export function ImageEditor({ page, onPageChange }: Props) {
  const [caption, setCaption] = useState(page.caption ?? "");
  const [uploading, setUploading] = useState(false);

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      onPageChange(await api.uploadImage(page.id, file));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline" size="sm">
          <label className="cursor-pointer">
            <Upload /> {uploading ? "جارٍ الرفع…" : page.imagePath ? "تغيير الصورة" : "رفع صورة"}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">طريقة العرض:</span>
          <select
            className="h-8 rounded-md border bg-card px-2 text-sm"
            value={page.imageFit ?? "contain"}
            onChange={(e) => onPageChange(await api.updatePage(page.id, { imageFit: e.target.value }))}
          >
            <option value="contain">احتواء (كامل الصورة)</option>
            <option value="cover">تغطية (ملء المساحة)</option>
          </select>
        </div>
        <Input
          value={caption}
          placeholder="تعليق أسفل الصورة (اختياري)"
          className="max-w-sm"
          onChange={(e) => setCaption(e.target.value)}
          onBlur={async () => {
            if (caption !== (page.caption ?? "")) {
              onPageChange(await api.updatePage(page.id, { caption }));
            }
          }}
        />
      </div>
      {page.imagePath ? (
        <img
          src={`/${page.imagePath}`}
          alt={page.caption ?? page.title}
          className={cn("w-full rounded-lg bg-muted", page.imageFit === "cover" ? "h-[60vh] object-cover" : "max-h-[60vh] object-contain")}
        />
      ) : (
        <div className="flex h-60 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground">
          لم يتم رفع صورة بعد
        </div>
      )}
    </div>
  );
}
