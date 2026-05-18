import "server-only";
import { Payment } from "mercadopago";
import { getMercadoPagoConfig } from "./client";

export interface FetchedPayment {
  id: number;
  status:
    | "pending"
    | "approved"
    | "authorized"
    | "in_process"
    | "in_mediation"
    | "rejected"
    | "cancelled"
    | "refunded"
    | "charged_back";
  statusDetail: string;
  externalReference: string | null;
  preferenceId: string | null;
  payerEmail: string | null;
  transactionAmount: number;
  currencyId: string;
  dateApproved: string | null;
  dateCreated: string | null;
}

/**
 * Fetch a payment from MercadoPago by ID. Always call this from the
 * webhook handler — never trust the webhook payload alone; an attacker
 * could send a fake notification with status=approved.
 */
export async function getPayment(paymentId: string): Promise<FetchedPayment> {
  const config = getMercadoPagoConfig();
  const client = new Payment(config);
  const response = await client.get({ id: paymentId });

  return {
    id: response.id ?? 0,
    status: (response.status ?? "pending") as FetchedPayment["status"],
    statusDetail: response.status_detail ?? "",
    externalReference: response.external_reference ?? null,
    preferenceId: response.order?.id ? String(response.order.id) : null,
    payerEmail: response.payer?.email ?? null,
    transactionAmount: response.transaction_amount ?? 0,
    currencyId: response.currency_id ?? "ARS",
    dateApproved: response.date_approved ?? null,
    dateCreated: response.date_created ?? null,
  };
}
