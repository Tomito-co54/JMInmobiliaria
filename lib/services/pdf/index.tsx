import "server-only";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ensureFontsRegistered } from "./fonts";
import { PropertySheetDocument, type PropertySheetInput } from "./property-sheet";

/**
 * Renders the public one-pager for a listing. Free and unauthenticated, so
 * the caller is responsible for having applied the public gate before
 * getting here — a draft must not become downloadable.
 */
export async function generatePropertySheet(
  input: PropertySheetInput,
): Promise<Buffer> {
  ensureFontsRegistered();
  return renderToBuffer(<PropertySheetDocument data={input} />);
}

export type { PropertySheetInput };
