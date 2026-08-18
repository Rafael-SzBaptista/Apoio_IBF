import { type RefObject } from "react";

/** Abre a galeria de fotos no navegador (sem câmera). */
export const WEB_GALLERY_ACCEPT = "image/*";

export function WebGalleryInput({
  inputRef,
  onPick,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onPick: (file: File) => void;
}) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept={WEB_GALLERY_ACCEPT}
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onPick(file);
        e.target.value = "";
      }}
    />
  );
}
