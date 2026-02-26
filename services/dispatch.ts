import { httpsCallable } from "firebase/functions";
import { functionsDriver } from "./firebase";

type AcceptInput = { tenantId: string; orderId: string };
type AcceptOutput = { ok: true; orderId: string; driverId: string };

/**
 * Motoboy tenta pegar a corrida (primeiro que aceitar leva).
 * A Function faz a "trava" (transaction) para garantir que só 1 aceite.
 */
export async function acceptDriverOffer(input: AcceptInput): Promise<AcceptOutput> {
  const fn = httpsCallable<AcceptInput, AcceptOutput>(functionsDriver, "acceptDriverOffer");
  const res = await fn(input);
  return res.data;
}
