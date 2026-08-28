import "server-only";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ensureFontsRegistered } from "./fonts";
import { ArbaReportDocument, type ArbaReportInput } from "./arba-report";
import { PropertySheetDocument, type PropertySheetInput } from "./property-sheet";

/**
 * Generates an ARBA catastral report PDF as a Buffer. Server-side only —
 * uses fs paths for fonts and node's React reconciler under the hood.
 */
export async function generateArbaReport(
  input: ArbaReportInput,
): Promise<Buffer> {
  ensureFontsRegistered();
  return renderToBuffer(<ArbaReportDocument data={input} />);
}

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

export type { ArbaReportInput, PropertySheetInput };
