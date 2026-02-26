import { getMessaging, getToken, deleteToken, isSupported, onMessage, MessagePayload } from "firebase/messaging";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { appDriver, dbDriver } from "./firebase";

const LS_TOKEN_KEY = "driverFcmToken";

export type PushSetupResult = {
  supported: boolean;
  permission: NotificationPermission;
  token?: string;
  error?: string;
};

/**
 * Detecta se FCM Web é suportado no navegador atual.
 */
export async function isFcmWebSupported(): Promise<boolean> {
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

/**
 * Registra o Service Worker necessário para receber notificações em background.
 * Deve estar em /public/firebase-messaging-sw.js.
 */
export async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  } catch (e) {
    console.warn("[push] Falha ao registrar service worker:", e);
    return null;
  }
}

/**
 * Habilita push notifications no app do motoboy.
 * - pede permissão
 * - gera token FCM
 * - salva token no Firestore em tenants/{tenantId}/drivers/{driverId}/fcmTokens/{token}
 */
export async function enableDriverPush(params: {
  tenantId: string;
  driverId: string;
  vapidKey?: string;
}): Promise<PushSetupResult> {
  const supported = await isFcmWebSupported();
  const permission = (typeof Notification !== "undefined" ? Notification.permission : "default") as NotificationPermission;

  if (!supported) {
    return {
      supported: false,
      permission,
      error: "Este navegador não suporta push notifications (FCM Web). Use Chrome/Android ou um app nativo.",
    };
  }

  if (typeof Notification === "undefined") {
    return { supported, permission: "default", error: "Notificações não estão disponíveis neste ambiente." };
  }

  // ⚠️ Por UX, isso deve acontecer por gesto do usuário (clique no botão).
  let finalPermission: NotificationPermission = Notification.permission;
  if (finalPermission !== "granted") {
    finalPermission = await Notification.requestPermission();
  }

  if (finalPermission !== "granted") {
    return {
      supported,
      permission: finalPermission,
      error: "Permissão de notificação negada. Ative em Configurações do navegador para receber corridas com a tela desligada.",
    };
  }

  const swReg = await registerFcmServiceWorker();
  if (!swReg) {
    return {
      supported,
      permission: finalPermission,
      error: "Não foi possível registrar o Service Worker. Verifique se /firebase-messaging-sw.js está acessível.",
    };
  }

  const messaging = getMessaging(appDriver);

  const vapidKey = params.vapidKey || (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY;

  let token: string | null = null;
  try {
    token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });
  } catch (e) {
    console.error("[push] getToken error", e);
    return {
      supported,
      permission: finalPermission,
      error:
        "Falha ao gerar token de notificação. Verifique VAPID key e se o domínio está correto (localhost é ok).",
    };
  }

  if (!token) {
    return {
      supported,
      permission: finalPermission,
      error: "Token de notificação vazio. Verifique configuração do Firebase Cloud Messaging.",
    };
  }

  // Salva token localmente (útil para logout/cleanup)
  localStorage.setItem(LS_TOKEN_KEY, token);

  // Persiste token no Firestore (multi-device)
  const tokenRef = doc(dbDriver, `tenants/${params.tenantId}/drivers/${params.driverId}/fcmTokens/${token}`);
  await setDoc(
    tokenRef,
    {
      token,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      userAgent: navigator.userAgent,
      platform: navigator.platform || "",
    },
    { merge: true }
  );

  return { supported, permission: finalPermission, token };
}

/**
 * Tenta registrar push SEM pedir permissão.
 * - se já estiver granted, gera token e salva.
 * - se não estiver, apenas retorna status.
 */
export async function hydrateDriverPush(params: {
  tenantId: string;
  driverId: string;
  vapidKey?: string;
}): Promise<PushSetupResult> {
  const supported = await isFcmWebSupported();

  if (typeof Notification === "undefined") {
    return { supported, permission: "default", error: "Notificações não disponíveis." };
  }

  const permission = Notification.permission;
  if (!supported) {
    return { supported: false, permission, error: "Push não suportado neste navegador." };
  }

  if (permission !== "granted") {
    return { supported, permission };
  }

  // Já está permitido → tenta habilitar sem prompt
  return enableDriverPush(params);
}

/**
 * Remove token do Firestore e do navegador (best-effort).
 */
export async function disableDriverPush(params: { tenantId: string; driverId: string }): Promise<void> {
  const token = localStorage.getItem(LS_TOKEN_KEY);
  if (!token) return;

  try {
    const messaging = getMessaging(appDriver);
    await deleteToken(messaging);
  } catch (e) {
    console.warn("[push] deleteToken falhou:", e);
  }

  try {
    const tokenRef = doc(dbDriver, `tenants/${params.tenantId}/drivers/${params.driverId}/fcmTokens/${token}`);
    await deleteDoc(tokenRef);
  } catch (e) {
    console.warn("[push] deleteDoc token falhou:", e);
  }

  localStorage.removeItem(LS_TOKEN_KEY);
}

/**
 * Escuta notificações quando o app está em FOREGROUND.
 * (Em background, quem mostra é o Service Worker.)
 */
export function onDriverForegroundMessage(handler: (payload: MessagePayload) => void): () => void {
  const messaging = getMessaging(appDriver);
  const unsub = onMessage(messaging, handler);
  return () => unsub();
}
