import "server-only";
import { Preference } from "mercadopago";
import { getMercadoPagoConfig } from "./client";

export interface CreatePreferenceInput {
  orderId: string;
  title: string;
  description: string;
  quantity: number;
  unitPrice: number;
  currency: "ARS" | "USD";
  payerEmail: string;
  returnUrls: {
    success: string;
    pending: string;
    failure: string;
  };
  notificationUrl: string;
}

export interface CreatePreferenceResult {
  id: string;
  initPoint: string;
  sandboxInitPoint: string;
}

/**
 * Create a MercadoPago checkout preference. The order_id is stored as
 * external_reference so the webhook can find our row when MP fires.
 */
export async function createPreference(
  input: CreatePreferenceInput,
): Promise<CreatePreferenceResult> {
  const config = getMercadoPagoConfig();
  const client = new Preference(config);

  const response = await client.create({
    body: {
      items: [
        {
          id: input.orderId,
          title: input.title,
          description: input.description,
          quantity: input.quantity,
          unit_price: input.unitPrice,
          currency_id: input.currency,
          category_id: "services",
        },
      ],
      external_reference: input.orderId,
      payer: { email: input.payerEmail },
      back_urls: input.returnUrls,
      auto_return: "approved",
      notification_url: input.notificationUrl,
      statement_descriptor: "Jotaeme",
      binary_mode: true,
    },
  });

  if (!response.id || !response.init_point || !response.sandbox_init_point) {
    throw new Error("MercadoPago returned an incomplete preference");
  }

  return {
    id: response.id,
    initPoint: response.init_point,
    sandboxInitPoint: response.sandbox_init_point,
  };
}
