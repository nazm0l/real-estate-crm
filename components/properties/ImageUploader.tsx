"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 8;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function ImageUploader({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    const room = MAX_PHOTOS - value.length;
    if (room <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos per property`);
      return;
    }

    const accepted = files.slice(0, room).filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is larger than 5 MB`);
        return false;
      }
      return true;
    });
    if (!accepted.length) return;

    const uploaded: string[] = [];
    for (const [index, file] of accepted.entries()) {
      setProgress(`Uploading ${index + 1}/${accepted.length}…`);

      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, folder: "properties" }),
      });
      if (!presignRes.ok) {
        toast.error(
          presignRes.status === 503
            ? "File storage is not configured — the property will be saved without photos"
            : "Could not upload photos"
        );
        break;
      }

      const { uploadUrl, publicUrl } = await presignRes.json();
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putRes.ok) {
        toast.error(`Could not upload ${file.name}`);
        break;
      }
      uploaded.push(publicUrl);
    }

    setProgress(null);
    if (uploaded.length) onChange([...value, ...uploaded]);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {value.map((url) => (
          <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary R2 hostnames aren't configured for next/image */}
            <img src={url} alt="Property photo" className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(value.filter((u) => u !== url))}
                className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        ))}
        {value.length < MAX_PHOTOS && !disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!!progress}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary",
              progress && "pointer-events-none opacity-60"
            )}
          >
            <ImagePlus className="size-5" />
            <span className="text-[10px]">{progress ?? "Add photos"}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <p className="text-xs text-muted-foreground">Up to {MAX_PHOTOS} photos, 5 MB each.</p>
    </div>
  );
}
