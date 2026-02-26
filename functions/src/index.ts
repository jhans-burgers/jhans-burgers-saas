import * as admin from "firebase-admin";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

// ✅ Inicializa Admin (idempotente)
initializeApp();

const db = getFirestore();

// ===================== DISPATCH (estilo iFood) =====================

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function extractLatLngFromText(text?: string): { lat: number; lng: number } | null {
  if (!text) return null;

  // Ex: "GPS: -23.550520, -46.633308"
  const gps = text.match(/GPS\s*:\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/i);
  if (gps) return { lat: Number(gps[1]), lng: Number(gps[2]) };

  // Ex: Google Maps "@lat,lng"
  const at = text.match(/@\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (at) return { lat: Number(at[1]), lng: Number(at[2]) };

  // Ex: query=lat,lng | q=lat,lng
  const q = text.match(/(?:query|q)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/i);
  if (q) return { lat: Number(q[1]), lng: Number(q[2]) };

  // Fallback: qualquer "lat,lng" no texto
  const any = text.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (any) return { lat: Number(any[1]), lng: Number(any[2]) };

  return null;
}

async function dispatchOrder(tenantId: string, orderId: string, orderData: any) {
  const driversRef = db.collection("tenants").doc(tenantId).collection("drivers");
  const offersCol = db.collection("tenants").doc(tenantId).collection("driverOffers");
  const orderRef = db.collection("tenants").doc(tenantId).collection("orders").doc(orderId);

  // ✅ Config dinâmica por loja + origem do raio (LOJA)
  let dispatchRadiusKm = 5;
  let dispatchMaxDrivers = 5;
  let storeLoc: { lat: number; lng: number } | null = null;
  let tenantData: any = null;

  try {
    const tenantSnap = await db.collection("tenants").doc(tenantId).get();
    tenantData = tenantSnap.exists ? (tenantSnap.data() as any) : null;
    const t = tenantData;

    const r = Number(t?.dispatchRadiusKm ?? t?.config?.dispatchRadiusKm);
    const m = Number(t?.dispatchMaxDrivers ?? t?.config?.dispatchMaxDrivers);
    if (Number.isFinite(r) && r > 0) dispatchRadiusKm = r;
    if (Number.isFinite(m) && m > 0) dispatchMaxDrivers = Math.min(Math.floor(m), 20);

    const loc = t?.location ?? t?.config?.location;
    if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
      storeLoc = { lat: loc.lat, lng: loc.lng };
    }
  } catch (e) {
    console.warn("[dispatchOrder] could not load tenant config; using defaults", e);
  }

  // Fallback (opcional): se o lojista ainda não salvou o pin do mapa, tenta extrair lat/lng
  // de algum campo textual (ex.: link do Maps colado no endereço). Mantém a origem como "LOJA".
  if (!storeLoc) {
    const maybeText =
      tenantData?.address ??
      tenantData?.config?.address ??
      tenantData?.storeAddress ??
      orderData?.storeAddress ??
      orderData?.pickupAddress ??
      orderData?.pickupNotes;
    const parsed = extractLatLngFromText(typeof maybeText === "string" ? maybeText : undefined);
    if (parsed) storeLoc = parsed;
  }

  if (!storeLoc) {
    await orderRef.set(
      {
        dispatchStatus: "failed",
        dispatchError: "store_location_missing",
        dispatchFailedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.warn("[dispatchOrder] store location missing", { tenantId, orderId });
    return;
  }

  const now = Date.now();
  const maxStaleMs = 5 * 60 * 1000; // 5 min
  const radiusMeters = Math.round(dispatchRadiusKm * 1000);

  // Busca motoristas disponíveis (MVP: poucos por loja, então ok ordenar em memória)
  const snap = await driversRef.where("status", "==", "available").get().catch(async () => {
    return driversRef.get();
  });

  const candidates = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((d) => d.status === "available")
    .filter((d) => d.active !== false)
    .filter((d) => typeof d.lat === "number" && typeof d.lng === "number")
    .filter((d) => {
      const ms =
        (d.lastUpdate?.toMillis?.() ??
          (d.lastUpdate?.seconds ? d.lastUpdate.seconds * 1000 : 0)) as number;
      return !ms || ms >= now - maxStaleMs;
    })
    .map((d) => {
      const dist = haversineMeters(d.lat, d.lng, storeLoc!.lat, storeLoc!.lng);
      return { ...d, distanceMeters: dist };
    })
    .filter((d) => (d.distanceMeters ?? 999999999) <= radiusMeters)
    .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
    .slice(0, dispatchMaxDrivers);

  if (candidates.length === 0) {
    await orderRef.set(
      {
        dispatchStatus: "failed",
        dispatchError: "no_drivers_in_radius",
        dispatchFailedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log("[dispatchOrder] no candidates", { tenantId, orderId, dispatchRadiusKm });
    return;
  }

  const expiresAt = Timestamp.fromMillis(Date.now() + 60 * 1000); // 60s
  const batch = db.batch();

  candidates.forEach((drv) => {
    const offerId = `${orderId}_${drv.id}`;
    const ref = offersCol.doc(offerId);
    batch.set(
      ref,
      {
        tenantId,
        orderId,
        driverId: drv.id,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
        expiresAt,

        // dados do pedido (entrega)
        customer: orderData?.customer || "",
        phone: orderData?.phone || "",
        address: orderData?.address || "",
        mapsLink: orderData?.mapsLink || "",
        value: Number(orderData?.value || 0),
        paymentMethod: orderData?.paymentMethod || "",

        // origem (pickup) = LOJA
        pickupLat: storeLoc!.lat,
        pickupLng: storeLoc!.lng,
        distanceMeters: drv.distanceMeters,
      },
      { merge: true }
    );
  });

  batch.set(
    orderRef,
    {
      dispatchStatus: "broadcasting",
      dispatchCreatedAt: FieldValue.serverTimestamp(),
      dispatchExpiresAt: expiresAt,
      dispatchDrivers: candidates.map((c) => c.id),
      dispatchPickupLat: storeLoc.lat,
      dispatchPickupLng: storeLoc.lng,
      dispatchRadiusKm,
      dispatchMaxDrivers,
    },
    { merge: true }
  );

  await batch.commit();
  console.log("[dispatchOrder] offers created", {
    tenantId,
    orderId,
    count: candidates.length,
    dispatchRadiusKm,
    dispatchMaxDrivers,
  });

  // 🔔 Push Notification (FCM Web) — best-effort
  try {
    await sendOfferPushToDrivers({
      tenantId,
      orderId,
      orderData,
      driverIds: candidates.map((c) => c.id),
    });
  } catch (e) {
    console.warn("[dispatchOrder] push send failed (best-effort)", e);
  }
}

// ===================== PUSH NOTIFICATIONS (FCM) =====================

async function collectDriverTokens(params: {
  tenantId: string;
  driverIds: string[];
}): Promise<{ tokens: string[]; tokenToDriverId: Map<string, string> }> {
  const { tenantId, driverIds } = params;

  const tokenToDriverId = new Map<string, string>();
  const tokens: string[] = [];

  for (const driverId of driverIds) {
    const snap = await db
      .collection("tenants")
      .doc(tenantId)
      .collection("drivers")
      .doc(driverId)
      .collection("fcmTokens")
      .get();

    snap.docs.forEach((d) => {
      const token = d.id;
      if (!token) return;
      tokens.push(token);
      tokenToDriverId.set(token, driverId);
    });
  }

  // Dedup
  const dedup = Array.from(new Set(tokens));
  return { tokens: dedup, tokenToDriverId };
}

async function cleanupInvalidTokens(params: {
  tenantId: string;
  tokenToDriverId: Map<string, string>;
  invalidTokens: string[];
}): Promise<void> {
  const { tenantId, tokenToDriverId, invalidTokens } = params;
  if (invalidTokens.length === 0) return;

  const batch = db.batch();
  invalidTokens.forEach((token) => {
    const driverId = tokenToDriverId.get(token);
    if (!driverId) return;
    const ref = db
      .collection("tenants")
      .doc(tenantId)
      .collection("drivers")
      .doc(driverId)
      .collection("fcmTokens")
      .doc(token);
    batch.delete(ref);
  });
  await batch.commit();
}

async function sendOfferPushToDrivers(params: {
  tenantId: string;
  orderId: string;
  orderData: any;
  driverIds: string[];
}): Promise<void> {
  const { tenantId, orderId, orderData, driverIds } = params;
  if (!driverIds.length) return;

  const { tokens, tokenToDriverId } = await collectDriverTokens({ tenantId, driverIds });
  if (tokens.length === 0) {
    console.log("[push] no tokens", { tenantId, orderId, driverIds });
    return;
  }

  const customer = String(orderData?.customer || "Cliente").trim() || "Cliente";
  const address = String(orderData?.address || "").trim();
  const value = Number(orderData?.value || 0);
  const title = "Nova corrida disponível";
  const body = address
    ? `${customer} • ${address}`
    : value
      ? `Valor: R$ ${value.toFixed(2).replace(".", ",")}`
      : "Abra o app do motoboy para aceitar.";

  const url = `/motoboy?tenantId=${encodeURIComponent(tenantId)}&orderId=${encodeURIComponent(orderId)}`;

  // ⚠️ data payload precisa ser string
  const data: Record<string, string> = {
    type: "driver_offer",
    tenantId,
    orderId,
    url,
    title,
    body,
    tag: `offer-${orderId}`,
  };

  const message: admin.messaging.MulticastMessage = {
    tokens,
    data,
    android: {
      priority: "high",
      ttl: 60 * 1000,
      notification: {
        sound: "default",
      },
    },
    webpush: {
      headers: {
        Urgency: "high",
        TTL: "60",
      },
      fcmOptions: { link: url },
    },
  };

  const res = await admin.messaging().sendEachForMulticast(message);

  const invalidTokens: string[] = [];
  res.responses.forEach((r, idx) => {
    if (r.success) return;
    const token = tokens[idx];
    const code = (r.error as any)?.code || "";
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
    ) {
      invalidTokens.push(token);
    }
  });

  try {
    await cleanupInvalidTokens({ tenantId, tokenToDriverId, invalidTokens });
  } catch (e) {
    console.warn("[push] cleanup invalid tokens failed", e);
  }

  console.log("[push] offer sent", {
    tenantId,
    orderId,
    tokens: tokens.length,
    failures: res.failureCount,
  });
}

// ===================== MASTER ADMIN AUTH (DEV FRIENDLY) =====================

// ✅ UID(s) do master (produção e/ou fixo)
const SUPER_ADMINS = new Set<string>([
  "yN1SFDimT8gewgJxrb4b0NgGCzuX",
  // ✅ seu UID atual do master (emulador/dev)
  "Bz6OvZ0e58jSX6aPpyc6WPVj4QQe",
]);

// ✅ Email(s) do master (SÓ para DEV no emulator — não precisa ficar trocando UID)
const SUPER_ADMIN_EMAILS = new Set<string>([
  "jandessonmoraes@gmail.com",
]);

function isDevEmulator() {
  return process.env.FUNCTIONS_EMULATOR === "true";
}

function assertMaster(request: Parameters<typeof onCall>[0] extends never ? any : any) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Você precisa estar logado.");
  }

  const uid = request.auth.uid;
  const email = (request.auth.token?.email as string | undefined)?.toLowerCase();

  const allowed =
    SUPER_ADMINS.has(uid) ||
    (isDevEmulator() && email && SUPER_ADMIN_EMAILS.has(email));

  if (!allowed) {
    throw new HttpsError("permission-denied", "Acesso negado.");
  }
}

// ===================== ADMIN: Create Owner User + Link =====================

export const adminCreateOwnerUserAndLink = onCall(async (request) => {
  console.log("[adminCreateOwnerUserAndLink] auth:", request.auth);
  console.log("[adminCreateOwnerUserAndLink] uid:", request.auth?.uid);

  // ✅ valida master (UID em prod, email em DEV)
  assertMaster(request);

  const tenantId = String(request.data?.tenantId || "").trim();
  const email = String(request.data?.email || "").trim().toLowerCase();
  const password = String(request.data?.password || "");

  if (!tenantId || !email || !password) {
    throw new HttpsError("invalid-argument", "tenantId, email e password são obrigatórios.");
  }

  if (password.length < 6) {
    throw new HttpsError("invalid-argument", "A senha precisa ter pelo menos 6 caracteres.");
  }

  const tenantSnap = await db.collection("tenants").doc(tenantId).get();
  if (!tenantSnap.exists) {
    throw new HttpsError("not-found", "Tenant não encontrado.");
  }

  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch {
    userRecord = await admin.auth().createUser({ email, password });
  }

  const uid = userRecord.uid;

  await db.collection("users").doc(uid).set(
    {
      email,
      tenantId,
      role: "owner",
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { uid };
});

// ===================== MOTOBoy / Driver Join Code =====================

export const setDriverJoinCode = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Você precisa estar logado.");
  }

  const tenantId = String(request.data?.tenantId || "").trim();
  const joinCode = String(request.data?.joinCode || "").trim();

  if (!tenantId || !joinCode) {
    throw new HttpsError("invalid-argument", "tenantId e joinCode são obrigatórios.");
  }

  const userSnap = await db.collection("users").doc(request.auth.uid).get();
  if (!userSnap.exists) throw new HttpsError("permission-denied", "Acesso negado.");

  const userData = userSnap.data() as any;

  if (userData.tenantId !== tenantId) {
    throw new HttpsError("permission-denied", "Acesso negado.");
  }
  if (userData.role !== "owner") {
    throw new HttpsError("permission-denied", "Somente owner pode alterar o convite do motoboy.");
  }

  await db
    .collection("tenants")
    .doc(tenantId)
    .collection("private")
    .doc("driverJoin")
    .set(
      {
        joinCode,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: request.auth.uid,
      },
      { merge: true }
    );

  return { ok: true };
});

export const claimDriverJoin = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Você precisa estar logado.");
  }

  const slug = String(request.data?.slug || "").trim();
  const code = String(request.data?.code || "").trim();
  const name = String(request.data?.name || "").trim();
  const photoUrl = String(request.data?.photoUrl || "").trim();

  if (!slug || !code || !name) {
    throw new HttpsError("invalid-argument", "slug, code e name são obrigatórios.");
  }

  const slugRef = db.collection("tenantSlugs").doc(slug);
  const slugSnap = await slugRef.get();
  if (!slugSnap.exists) throw new HttpsError("not-found", "Loja não encontrada.");

  const tenantId = String((slugSnap.data() as any).tenantId || "").trim();
  if (!tenantId) throw new HttpsError("not-found", "Loja não encontrada.");

  const privateRef = db.collection("tenants").doc(tenantId).collection("private").doc("driverJoin");
  const privateSnap = await privateRef.get();
  if (!privateSnap.exists) {
    throw new HttpsError("failed-precondition", "Loja ainda não configurou convite de motoboy.");
  }

  const joinCode = String((privateSnap.data() as any).joinCode || "");
  if (!joinCode || joinCode !== code) {
    throw new HttpsError("permission-denied", "Código de convite inválido.");
  }

  const uid = request.auth.uid;
  const user = await admin.auth().getUser(uid);

  await db.collection("tenants").doc(tenantId).collection("drivers").doc(uid).set(
    {
      name,
      photoUrl: photoUrl || "",
      phone: user.phoneNumber || "",
      status: "offline",
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await db.collection("users").doc(uid).set(
    {
      tenantId,
      role: "driver",
      photoUrl: photoUrl || "",
      phone: user.phoneNumber || "",
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { tenantId, driverId: uid };
});

export const adminCreateDriverUserAndLink = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Você precisa estar logado.");
  }

  const tenantId = String(request.data?.tenantId || "").trim();
  const name = String(request.data?.name || "").trim();
  const email = String(request.data?.email || "").trim().toLowerCase();
  const password = String(request.data?.password || "");
  const photoUrl = String(request.data?.photoUrl || "").trim();

  if (!tenantId || !name || !email || !password) {
    throw new HttpsError("invalid-argument", "tenantId, name, email e password são obrigatórios.");
  }
  if (password.length < 6) {
    throw new HttpsError("invalid-argument", "A senha precisa ter pelo menos 6 caracteres.");
  }

  // ✅ Permissão: master OU owner/admin do tenant
  const callerSnap = await db.collection("users").doc(request.auth.uid).get();
  if (!callerSnap.exists) throw new HttpsError("permission-denied", "Acesso negado.");

  const caller = callerSnap.data() as any;
  const isCallerMaster = SUPER_ADMINS.has(request.auth.uid);
  const isCallerStaff =
    caller?.tenantId === tenantId && (caller?.role === "owner" || caller?.role === "admin");

  if (!isCallerMaster && !isCallerStaff) {
    throw new HttpsError("permission-denied", "Acesso negado.");
  }

  // ✅ Tenant precisa existir
  const tenantSnap = await db.collection("tenants").doc(tenantId).get();
  if (!tenantSnap.exists) {
    throw new HttpsError("not-found", "Tenant não encontrado.");
  }

  // ✅ Cria ou reutiliza user do Auth
  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch {
    userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      photoURL: photoUrl || undefined,
    });
  }

  const uid = userRecord.uid;

  // ✅ Cria driver no tenant (Admin SDK ignora rules)
  await db.collection("tenants").doc(tenantId).collection("drivers").doc(uid).set(
    {
      name,
      email,
      photoUrl: photoUrl || "",
      status: "offline",
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // ✅ Espelha em /users (para rules funcionarem)
  await db.collection("users").doc(uid).set(
    {
      email,
      tenantId,
      role: "driver",
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { uid };
});


// ===================== TRIGGER: Quando pedido fica PRONTO, cria ofertas =====================

export const onOrderReadyDispatch = onDocumentUpdated("tenants/{tenantId}/orders/{orderId}", async (event) => {
  const tenantId = event.params.tenantId as string;
  const orderId = event.params.orderId as string;

  const before = event.data?.before?.data() as any;
  const after = event.data?.after?.data() as any;
  if (!before || !after) return;

  if (before.status === after.status) return;
  if (after.status !== "ready") return;

  if (after.serviceType && after.serviceType !== "delivery") return;

  if (after.driverId) return;
  if (after.dispatchStatus === "broadcasting") return;

  try {
    await dispatchOrder(tenantId, orderId, after);
  } catch (e) {
    console.error("[onOrderReadyDispatch] error", { tenantId, orderId, e });
  }
});

// ===================== Motoboy aceita corrida (primeiro leva) =====================

export const acceptDriverOffer = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Você precisa estar logado.");

  const tenantId = String(request.data?.tenantId || "").trim();
  const orderId = String(request.data?.orderId || "").trim();
  if (!tenantId || !orderId) {
    throw new HttpsError("invalid-argument", "tenantId e orderId são obrigatórios.");
  }

  const orderRef = db.collection("tenants").doc(tenantId).collection("orders").doc(orderId);
  const driverRef = db.collection("tenants").doc(tenantId).collection("drivers").doc(uid);
  const offerRef = db.collection("tenants").doc(tenantId).collection("driverOffers").doc(`${orderId}_${uid}`);

  await db.runTransaction(async (tx) => {
    const [orderSnap, driverSnap, offerSnap] = await Promise.all([
      tx.get(orderRef),
      tx.get(driverRef),
      tx.get(offerRef),
    ]);

    if (!orderSnap.exists) throw new HttpsError("not-found", "Pedido não encontrado.");
    if (!driverSnap.exists) throw new HttpsError("permission-denied", "Motoboy não cadastrado nesta loja.");
    if (!offerSnap.exists) throw new HttpsError("failed-precondition", "Oferta não encontrada (expirou ou não foi enviada).");

    const order = orderSnap.data() as any;
    const offer = offerSnap.data() as any;

    if (offer.status !== "pending") {
      throw new HttpsError("failed-precondition", "Essa oferta não está mais disponível.");
    }

    if (order.driverId) {
      throw new HttpsError("already-exists", "Esse pedido já foi pego por outro motoboy.");
    }

    if (order.status !== "ready") {
      throw new HttpsError("failed-precondition", "Pedido ainda não está pronto para entrega.");
    }

    tx.set(
      orderRef,
      {
        driverId: uid,
        status: "delivering",
        assignedAt: FieldValue.serverTimestamp(),
        dispatchStatus: "accepted",
        dispatchAcceptedAt: FieldValue.serverTimestamp(),
        dispatchAcceptedBy: uid,
      },
      { merge: true }
    );

    tx.set(
      offerRef,
      {
        status: "accepted",
        acceptedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(
      driverRef,
      {
        status: "delivering",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  // Expira as outras ofertas (best-effort, fora da transaction)
  try {
    const pendingSnap = await db
      .collection("tenants")
      .doc(tenantId)
      .collection("driverOffers")
      .where("orderId", "==", orderId)
      .where("status", "==", "pending")
      .get();

    const batch = db.batch();
    pendingSnap.docs.forEach((d) =>
      batch.set(d.ref, { status: "expired", expiredAt: FieldValue.serverTimestamp() }, { merge: true })
    );
    await batch.commit();
  } catch (e) {
    console.warn("[acceptDriverOffer] expire others failed", e);
  }

  return { ok: true, orderId, driverId: uid };
});
