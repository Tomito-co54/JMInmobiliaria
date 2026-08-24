"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  describeCallbackError,
  readCallbackErrorCode,
} from "@/lib/auth/callback-errors";

interface AuthCallbackNoticeProps {
  /** Error code read server-side from `?error=` on /login. */
  initialCode?: string;
}

/**
 * Explains why an email link didn't work.
 *
 * Two sources feed it. The server passes `?error=` down as `initialCode`.
 * The fragment (`#error=...`) is invisible to the server, so this component
 * reads it from `window.location` on mount — that is the only place in the
 * app where those failures can be observed at all.
 *
 * The fragment is stripped afterwards so a refresh doesn't replay a stale
 * error at someone who has already moved on.
 */
export function AuthCallbackNotice({ initialCode }: AuthCallbackNoticeProps) {
  const [code, setCode] = useState<string | undefined>(initialCode);

  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    if (!fragment) return;

    const fromFragment = readCallbackErrorCode(new URLSearchParams(fragment));
    if (!fromFragment) return;

    setCode(fromFragment);
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  }, []);

  if (!code) return null;

  const notice = describeCallbackError(code);

  return (
    <div
      className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 space-y-1"
      role="alert"
    >
      <p className="text-sm text-destructive">{notice.message}</p>
      {notice.canRetry && (
        <Link
          href="/forgot-password"
          // min-h-11 = 44px, the project's floor for touch targets. The link
          // reads as text, but the thumb still gets a full-size hit area.
          className="inline-flex items-center min-h-11 text-sm text-destructive font-medium underline underline-offset-4"
        >
          Pedir un link nuevo
        </Link>
      )}
    </div>
  );
}
