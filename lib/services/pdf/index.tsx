import "server-only";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ensureFontsRegistered } from "./fonts";
import { ArbaReportDocument, type ArbaReportInput } from "./arba-report";

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

export type { ArbaReportInput };
