import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { canUseWebCamera, WebCameraDialog } from "@/mobile";
import { Button } from "@/components/ui/button";
import { isImagePath, signedFileUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function EventPhotoField({
  path,
  locked,
  pending,
  onPick,
  onClear,
}: {
  path: string | null;
  locked?: boolean;
  pending?: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const webCamera = canUseWebCamera();

  useEffect(() => {
    if (!path || !isImagePath(path)) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    void signedFileUrl("programacoes", path)
      .then((next) => {
        if (!cancelled) setUrl(next);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Foto</p>
      <div
        className={cn(
          "overflow-hidden rounded-md border bg-muted",
          url ? "aspect-video" : "grid min-h-32 place-items-center",
        )}
      >
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <p className="px-3 text-center text-sm text-muted-foreground">
            {locked ? "Nenhuma foto enviada." : "Escolha da galeria ou tire uma foto."}
          </p>
        )}
      </div>
      {!locked && (
        <div className="flex flex-wrap gap-2">
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPick(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => galleryRef.current?.click()}
          >
            <ImagePlus className="size-3.5" /> Galeria
          </Button>
          {webCamera && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setCameraOpen(true)}
            >
              <Camera className="size-3.5" /> Tirar foto
            </Button>
          )}
          {path && (
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onClear}>
              <Trash2 className="size-3.5" /> Excluir
            </Button>
          )}
        </div>
      )}
      {webCamera && (
        <WebCameraDialog open={cameraOpen} onOpenChange={setCameraOpen} onCapture={onPick} />
      )}
    </div>
  );
}
