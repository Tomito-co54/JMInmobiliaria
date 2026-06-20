"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Share the current property. Uses the Web Share API (native sheet on
 * mobile — WhatsApp, etc.); falls back to copying the URL to the clipboard
 * on desktop browsers without it. Replaces the old "(próximamente)" stub.
 */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user cancelled the share sheet — no-op
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el link");
    }
  }

  return (
    <Button variant="ghost" size="icon" aria-label="Compartir" onClick={handleShare}>
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
    </Button>
  );
}
