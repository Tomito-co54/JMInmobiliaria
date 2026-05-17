"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Global error boundary for the entire app.
 * Triggered when rendering errors bubble all the way up.
 *
 * Sentry recommends this file so React render errors are captured
 * in addition to runtime exceptions.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ maxWidth: 500, textAlign: "center" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Algo salió mal
            </h1>
            <p style={{ color: "#666", marginBottom: "1rem" }}>
              Tuvimos un problema cargando esta página. Ya nos avisaron y lo
              estamos revisando.
            </p>
            {/* global-error.tsx replaces the root layout, so Link is not usable here */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                display: "inline-block",
                padding: "0.5rem 1rem",
                background: "#000",
                color: "#fff",
                borderRadius: "0.375rem",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              Volver al inicio
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
