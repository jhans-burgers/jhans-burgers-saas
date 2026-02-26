import {
  collection,
  doc,
  getDoc,
  CollectionReference,
  DocumentReference,
  Firestore,
  Timestamp,
} from "firebase/firestore";
import { dbPublic } from "./firebase";
import { Tenant } from "../types";

// --- Helpers for Dynamic Paths ---

/**
 * Returns a CollectionReference scoped to a specific tenant using dbPublic.
 * Ex: tenants/tenant123/orders
 */
export const tCol = <T = any>(tenantId: string, colName: string): CollectionReference<T> => {
  return collection(dbPublic, `tenants/${tenantId}/${colName}`) as CollectionReference<T>;
};

/**
 * Returns a DocumentReference scoped to a specific tenant using dbPublic.
 * Ex: tenants/tenant123/orders/order456
 */
export const tDoc = <T = any>(tenantId: string, colName: string, docId: string): DocumentReference<T> => {
  return doc(dbPublic, `tenants/${tenantId}/${colName}/${docId}`) as DocumentReference<T>;
};

/**
 * Same helpers but with a custom Firestore instance (dbPanel/dbMaster/dbDriver),
 * so it uses the correct authenticated session.
 */
export const tColDb = <T = any>(db: Firestore, tenantId: string, colName: string): CollectionReference<T> => {
  return collection(db, `tenants/${tenantId}/${colName}`) as CollectionReference<T>;
};

export const tDocDb = <T = any>(
  db: Firestore,
  tenantId: string,
  colName: string,
  docId: string
): DocumentReference<T> => {
  return doc(db, `tenants/${tenantId}/${colName}/${docId}`) as DocumentReference<T>;
};

// --- Tenant Resolution ---

export const getTenantBySlug = async (slug: string, db: Firestore = dbPublic): Promise<Tenant | null> => {
  try {
    const slugRef = doc(db, "tenantSlugs", slug);
    const slugSnap = await getDoc(slugRef);
    if (!slugSnap.exists()) return null;

    const tenantId = slugSnap.data().tenantId;
    const tenantRef = doc(db, "tenants", tenantId);
    const tenantSnap = await getDoc(tenantRef);

    return tenantSnap.exists() ? ({ id: tenantSnap.id, ...tenantSnap.data() } as Tenant) : null;
  } catch (e) {
    console.error("Error fetching tenant by slug:", e);
    return null;
  }
};

export const getTenantById = async (tenantId: string, db: Firestore = dbPublic): Promise<Tenant | null> => {
  try {
    const tenantRef = doc(db, "tenants", tenantId);
    const tenantSnap = await getDoc(tenantRef);
    return tenantSnap.exists() ? ({ id: tenantSnap.id, ...tenantSnap.data() } as Tenant) : null;
  } catch (e) {
    console.error("Error fetching tenant by ID:", e);
    return null;
  }
};

export const getTenantIdForUser = async (uid: string, db: Firestore = dbPublic): Promise<string | null> => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data().tenantId : null;
  } catch (e) {
    console.error("Error fetching user tenant:", e);
    return null;
  }
};

// --- Utils ---

export function isSubscriptionActive(tenant: any): boolean {
  if (!tenant) return false;

  if (tenant.subscriptionStatus && tenant.subscriptionStatus !== "active") {
    return false;
  }

  const paidUntil = tenant.paidUntil;
  if (!paidUntil) return false;

  let paidUntilDate: Date | null = null;

  if (paidUntil instanceof Timestamp) {
    paidUntilDate = paidUntil.toDate();
  } else if (typeof paidUntil?.toDate === "function") {
    paidUntilDate = paidUntil.toDate();
  } else if (typeof paidUntil?.seconds === "number") {
    paidUntilDate = new Date(paidUntil.seconds * 1000);
  } else {
    const d = new Date(paidUntil);
    paidUntilDate = isNaN(d.getTime()) ? null : d;
  }

  if (!paidUntilDate) return false;
  return paidUntilDate.getTime() >= Date.now();
}