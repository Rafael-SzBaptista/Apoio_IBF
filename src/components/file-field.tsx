import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Camera, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { canUseWebCamera, WebCameraDialog, WebGalleryInput } from "@/mobile";
import { Field } from "@/components/apoio-ui";
import { Button } from "@/components/ui/button";
import { isImagePath, signedFileUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

function acceptsImages(accept: string) {
  return /image|\.jpe?g|\.png|\.webp|\.gif/i.test(accept);
}

function acceptsPdf(accept: string) {
  return /pdf/i.test(accept);
}

export function FileField({
  label,
  accept,
  file,
  onFileChange,
  storedPath,
  storedBucket,
  onClearStored,
}: {
  label: string;
  accept: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  storedPath?: string | null;
  storedBucket?: "inventario" | "notas";
  onClearStored?: () => void;
}) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const [storedUrl, setStoredUrl] = useState<string | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const webCamera = canUseWebCamera() && acceptsImages(accept);
  const allowPdf = acceptsPdf(accept);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setLocalUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (file || !storedPath || !storedBucket) {
      setStoredUrl(null);
      return;
    }
    let cancelled = false;
    void signedFileUrl(storedBucket, storedPath)
      .then((url) => {
        if (!cancelled) setStoredUrl(url);
      })
      .catch(() => {
        if (!cancelled) setStoredUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [file, storedPath, storedBucket]);

  const preview = localUrl ?? (isImagePath(storedPath) ? storedUrl : null);
  const caption = file?.name ?? (storedPath ? "Arquivo salvo" : null);

  return (
    <Field label={label} className="min-w-0">
      <WebGalleryInput inputRef={galleryRef} onPick={onFileChange} />
      {allowPdf && (
        <input
          ref={pdfRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            onFileChange(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      )}
      {preview && (
        <div className="mb-2 overflow-hidden rounded-md bg-muted">
          <img
            src={preview}
            alt=""
            className="mx-auto block max-h-40 max-w-full object-contain"
          />
        </div>
      )}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => galleryRef.current?.click()}>
          Escolher arquivo
        </Button>
        {webCamera && (
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setCameraOpen(true)}>
            <Camera className="size-3.5" /> Tirar foto
          </Button>
        )}
        {allowPdf && (
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => pdfRef.current?.click()}>
            PDF
          </Button>
        )}
        {caption && (
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground" title={caption}>
            {caption}
          </span>
        )}
        {(file || storedPath) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => {
              if (file) {
                onFileChange(null);
                return;
              }
              onClearStored?.();
            }}
          >
            Excluir
          </Button>
        )}
      </div>
      {webCamera && (
        <WebCameraDialog open={cameraOpen} onOpenChange={setCameraOpen} onCapture={onFileChange} />
      )}
    </Field>
  );
}

export function StoredThumb({
  bucket,
  path,
  className,
}: {
  bucket: "inventario" | "notas";
  path: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void signedFileUrl(bucket, path)
      .then((next) => {
        if (!cancelled) setUrl(next);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [bucket, path]);

  if (!url || !isImagePath(path)) return null;
  return <img src={url} alt="" className={cn("size-8 shrink-0 rounded object-cover", className)} />;
}

export function StoredFileButton({
  bucket,
  path,
  label = "Ver arquivo",
}: {
  bucket: "inventario" | "notas";
  path: string;
  label?: string;
}) {
  const open = async (event: MouseEvent) => {
    event.stopPropagation();
    const url = await signedFileUrl(bucket, path);
    if (!url) {
      toast.error("Não foi possível abrir o arquivo.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-7"
      onClick={open}
      aria-label={label}
    >
      <ImageIcon className="size-3.5" />
    </Button>
  );
}
