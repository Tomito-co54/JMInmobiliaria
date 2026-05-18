"use server";

import { revalidatePath } from "next/cache";
import { markAlertRead, markAllAlertsRead } from "@/lib/db/alerts";

export async function markAlertReadAction(id: string): Promise<void> {
  await markAlertRead(id);
  revalidatePath("/", "layout");
}

export async function markAllAlertsReadAction(): Promise<void> {
  await markAllAlertsRead();
  revalidatePath("/", "layout");
}
