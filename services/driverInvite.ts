import { httpsCallable } from "firebase/functions";
import { functionsPanel } from "./firebase";

type SetJoinCodeInput = { tenantId: string; joinCode: string };
type SetJoinCodeOutput = { ok: boolean };

export async function setDriverJoinCode(input: SetJoinCodeInput): Promise<SetJoinCodeOutput> {
  const fn = httpsCallable<SetJoinCodeInput, SetJoinCodeOutput>(functionsPanel, "setDriverJoinCode");
  const res = await fn(input);
  return res.data;
}
