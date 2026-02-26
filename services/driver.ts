import { httpsCallable } from "firebase/functions";
import { functionsDriver } from "./firebase";

type ClaimInput = { slug: string; code: string; name: string; photoUrl?: string };
type ClaimOutput = { tenantId: string; driverId: string };

/**
 * Vincula o motoboy a uma loja usando o código de convite.
 * - Em DEV, o connectFunctionsEmulator() já é aplicado no services/firebase.ts.
 * - Em PROD, chama a Function publicada.
 */
export async function claimDriverJoin(input: ClaimInput): Promise<ClaimOutput> {
  const fn = httpsCallable<ClaimInput, ClaimOutput>(functionsDriver, "claimDriverJoin");
  const res = await fn(input);
  return res.data;
}
