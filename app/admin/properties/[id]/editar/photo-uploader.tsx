"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Star, Trash2, GripVertical, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deletePropertyPhotoAction,
  reorderPropertyPhotosAction,
  uploadPropertyPhotoAction,
} from "@/app/admin/properties/actions";

/**
 * Drag-and-drop photo manager for the property loader.
 *
 *   - Upload via file picker or drop on the upload zone.
 *   - Each thumbnail is itself draggable; drop onto another thumbnail to
 *     reorder. The first photo in the array is the portada (badge "Portada").
 *   - One-click "Hacer portada" to swap any photo into the first slot.
 *   - X to delete (with confirm). Optimistic UI with rollback on failure.
 *
 * Uses native HTML5 drag-and-drop — no third-party dep. The interaction is
 * intentionally minimal: drag a card, drop it over the target card; the
 * dragged item slots into the target's position and the rest shifts.
 */
export function PhotoUploader({
  propertyId,
  photos,
  onChange,
}: {
  propertyId: string;
  photos: string[];
  onChange: (photos: string[]) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | File[]) {
    setUploading(true);
    let mutated = [...photos];
    try {
      // Sequential — keeps order predictable and avoids hammering Storage.
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.set("file", file);
        const result = await uploadPropertyPhotoAction(propertyId, fd);
        if (!result.ok) {
          toast.error(result.error);
          continue;
        }
        if (result.data) {
          mutated = result.data.photos;
          onChange(mutated);
        }
      }
      toast.success(`${files.length} foto${files.length === 1 ? "" : "s"} subida${files.length === 1 ? "" : "s"}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const next = [...photos];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDraggedIndex(null);
    onChange(next); // optimistic
    persistReorder(next);
  }

  function persistReorder(next: string[]) {
    startTransition(async () => {
      const result = await reorderPropertyPhotosAction(propertyId, next);
      if (!result.ok) {
        toast.error(result.error);
        onChange(photos); // rollback
        return;
      }
      if (result.data) onChange(result.data.photos);
    });
  }

  function makePrimary(index: number) {
    if (index === 0) return;
    const next = [photos[index], ...photos.filter((_, i) => i !== index)];
    onChange(next);
    persistReorder(next);
  }

  function handleDelete(url: string) {
    if (!confirm("¿Borrar esta foto? La acción no se puede deshacer.")) return;
    const previous = [...photos];
    const next = photos.filter((u) => u !== url);
    onChange(next); // optimistic
    startTransition(async () => {
      const result = await deletePropertyPhotoAction(propertyId, url);
      if (!result.ok) {
        toast.error(result.error);
        onChange(previous);
        return;
      }
      if (result.data) onChange(result.data.photos);
      toast.success("Foto borrada");
    });
  }

  function handleZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
          }
        }}
      />

      <div
        onDragOver={handleDragOver}
        onDrop={handleZoneDrop}
        className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input bg-muted/30 py-6 text-sm text-muted-foreground"
      >
        <Upload className="size-4" />
        <span>Arrastrá fotos acá o</span>
        <Button
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Subiendo…
            </>
          ) : (
            "Seleccionar archivos"
          )}
        </Button>
        <span className="text-xs text-muted-foreground/70">
          JPG / PNG / WebP · hasta 10 MB por foto
        </span>
      </div>

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((url, index) => {
            const isPrimary = index === 0;
            const isDragging = draggedIndex === index;
            return (
              <div
                key={url}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                className={`relative group rounded-md overflow-hidden border bg-muted aspect-[4/3] ${
                  isDragging ? "opacity-40" : ""
                }`}
              >
                <Image
                  src={url}
                  alt={`Foto ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover pointer-events-none"
                  unoptimized
                />
                {isPrimary && (
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-emerald-600 text-white text-[10px] font-medium px-1.5 py-0.5">
                    <Star className="size-3" />
                    Portada
                  </span>
                )}
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isPrimary && (
                    <button
                      type="button"
                      title="Hacer portada"
                      onClick={() => makePrimary(index)}
                      disabled={pending}
                      className="rounded bg-background/90 backdrop-blur p-1 hover:bg-background"
                    >
                      <Star className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Borrar"
                    onClick={() => handleDelete(url)}
                    disabled={pending}
                    className="rounded bg-background/90 backdrop-blur p-1 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 rounded bg-background/80 backdrop-blur text-[10px] font-medium px-1.5 py-0.5">
                  <GripVertical className="size-3" />
                  {index + 1}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Sin fotos todavía.
        </p>
      )}
    </div>
  );
}
