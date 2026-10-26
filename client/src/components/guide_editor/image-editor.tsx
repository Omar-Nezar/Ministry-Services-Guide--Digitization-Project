import { useState } from "react";
import { Upload } from "lucide-react";
import { useLanguage } from "@/components/settings/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage, editorApi, uploadUrl, type GuideImage } from "@/lib/guide-api";
import { cn } from "@/lib/utils";

type Props = {
  image: GuideImage;
  /** Replacing the file is stored at once */
  onChange: (image: GuideImage) => void;
  /** Registers the unsaved fit and caption; the page's Save button runs `save` */
  onDirty: (key: string, save: () => Promise<unknown>) => void;
};

/** A picture of the service: replace the file, choose how it fits, add a caption. */
export function ImageEditor({ image, onChange, onDirty }: Props) {
  const { isArabic } = useLanguage();
  const [caption, setCaption] = useState(image.caption ?? "");
  const [fit, setFit] = useState(image.imageFit);
  const [uploading, setUploading] = useState(false);

  const markDirty = (next: { caption: string; imageFit: GuideImage["imageFit"] }) =>
    onDirty(`image-${image.id}`, () => editorApi.updateImage(image.id, next));

  const replace = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      onChange(await editorApi.replaceImage(image.id, file));
    } catch (error) {
      alert(apiErrorMessage(error, isArabic ? "تعذر رفع الصورة." : "Unable to upload the picture."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-3">
        <Button render={<label className="cursor-pointer" />} nativeButton={false} variant="outline" size="sm">
          <Upload /> {uploading ? (isArabic ? "جارٍ الرفع…" : "Uploading…") : isArabic ? "تغيير الصورة" : "Change picture"}
          <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" onChange={(e) => replace(e.target.files?.[0])} />
        </Button>
        <label className="flex items-center gap-2 text-sm">
          {isArabic ? "طريقة العرض:" : "Fit:"}
          <select
            className="h-8 rounded-md border bg-card px-2 text-sm"
            value={fit}
            onChange={(e) => {
              const next = e.target.value as GuideImage["imageFit"];
              setFit(next);
              markDirty({ caption, imageFit: next });
            }}
          >
            <option value="contain">{isArabic ? "احتواء (كامل الصورة)" : "Contain (whole picture)"}</option>
            <option value="cover">{isArabic ? "تغطية (ملء المساحة)" : "Cover (fill the space)"}</option>
          </select>
        </label>
        <Input
          value={caption}
          placeholder={isArabic ? "تعليق أسفل الصورة (اختياري)" : "Caption (optional)"}
          className="max-w-sm"
          onChange={(e) => {
            setCaption(e.target.value);
            markDirty({ caption: e.target.value, imageFit: fit });
          }}
        />
      </div>
      <img
        src={uploadUrl(image.imagePath)}
        alt={caption}
        className={cn("w-full rounded-lg bg-muted", fit === "cover" ? "h-[60vh] object-cover" : "max-h-[60vh] object-contain")}
      />
    </div>
  );
}
