import { httpsCallable } from "firebase/functions";
import { functionsPanel } from "./firebase";

type CreateDriverInput = {
  tenantId: string;
  name: string;
  email: string;
  password: string;
};

export async function createDriverUserAndLink(input: CreateDriverInput): Promise<{ uid: string }> {
  const fn = httpsCallable(functionsPanel, "adminCreateDriverUserAndLink");

  const res: any = await fn({
    tenantId: input.tenantId,
    name: input.name,
    email: input.email,
    password: input.password,
  });

  const uid = res?.data?.uid || "";
  if (!uid) throw new Error("Função não retornou uid.");

  return { uid };
}
