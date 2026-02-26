import { signOut } from "firebase/auth";
import { auth } from "./firebase";

type LogoutOptions = {
  signOutAuth?: boolean; // padrão false
  redirectTo?: string;
};

export async function logout(reason: string, opts: LogoutOptions = {}) {
  const { signOutAuth = false, redirectTo } = opts;

  console.warn("🚪 LOGOUT CALLED:", reason);
  console.trace("logout stack trace");

  // NÃO desloga por padrão (evita derrubar Master em outra aba)
  if (signOutAuth) {
    await signOut(auth);
  }

  if (redirectTo) {
    window.location.href = redirectTo;
  }
}
