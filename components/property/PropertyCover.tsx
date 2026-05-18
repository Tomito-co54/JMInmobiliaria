import Image from "next/image";
import { ImageIcon } from "lucide-react";

/**
 * Cover photo of the property.
 *
 * Today we only scrape the listing's cover image (photos[0]) — that's a
 * known Block 2 follow-up. Once the scraper brings the full gallery, this
 * component becomes the entry point into a fullscreen swipe gallery.
 *
 * The 4:3 aspect ratio is chosen so the layout stays stable while the image
 * loads. We use object-cover so portrait shots don't letterbox awkwardly.
 */

interface PropertyCoverProps {
  photos: string[];
  alt: string;
}

export function PropertyCover({ photos, alt }: PropertyCoverProps) {
  const cover = photos[0];
  const totalPhotos = photos.length;

  if (!cover) {
    return (
      <div className="relative aspect-[4/3] w-full bg-muted flex items-center justify-center text-muted-foreground rounded-lg overflow-hidden">
        <div className="flex flex-col items-center gap-2 text-sm">
          <ImageIcon className="size-8" />
          <span>Sin foto disponible</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] w-full bg-muted rounded-lg overflow-hidden">
      <Image
        src={cover}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 672px"
        className="object-cover"
        priority
      />
      <div className="absolute bottom-2 right-2 rounded-md bg-black/55 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
        1/{totalPhotos > 1 ? totalPhotos : 1}
      </div>
    </div>
  );
}
