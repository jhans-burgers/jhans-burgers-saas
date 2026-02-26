// ../services/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// (Opcional) se quiser logs do Firestore
// import { setLogLevel } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBKcFgN1x8bcjCHxC7ZImIlSUP0k4AoF34",
  authDomain: "jhans-burgers-admin.firebaseapp.com",
  projectId: "jhans-burgers-admin",
  storageBucket: "jhans-burgers-admin.firebasestorage.app",
  messagingSenderId: "578283100820",
  appId: "1:578283100820:web:af9b65acb149a39819f281",
  measurementId: "G-ESBZPFWJ30",
};

// ✅ 1) App DEFAULT (evita app/no-app)
export const appDefault = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ 2) Apps nomeados (sessões separadas)
export const appPanel =
  getApps().find((a) => a.name === "panel") ?? initializeApp(firebaseConfig, "panel");

export const appMaster =
  getApps().find((a) => a.name === "master") ?? initializeApp(firebaseConfig, "master");

export const appDriver =
  getApps().find((a) => a.name === "driver") ?? initializeApp(firebaseConfig, "driver");

// ✅ 3) Auth separados
export const authPanel = getAuth(appPanel);
export const authMaster = getAuth(appMaster);
export const authDriver = getAuth(appDriver);

// ✅ 4) Firestore separados
export const dbPublic = getFirestore(appDefault);
export const dbPanel = getFirestore(appPanel);
export const dbMaster = getFirestore(appMaster);
export const dbDriver = getFirestore(appDriver);
// Storage (para upload de fotos, etc.)
export const storagePublic = getStorage(appDefault);
export const storagePanel = getStorage(appPanel);
export const storageMaster = getStorage(appMaster);
export const storageDriver = getStorage(appDriver);


// ⚠️ Compat: código legado ainda importa "db"
export const db = dbPublic;

// ✅ 5) Functions separados
export const functionsPanel = getFunctions(appPanel, "us-central1");
export const functionsMaster = getFunctions(appMaster, "us-central1");
export const functionsDriver = getFunctions(appDriver, "us-central1");

// ✅ 6) Conectar emuladores automaticamente em DEV (UMA VEZ, PARA TUDO)
const __g: any = globalThis as any;

if (import.meta.env.DEV && !__g.__FIREBASE_EMULATORS_CONNECTED__) {
  __g.__FIREBASE_EMULATORS_CONNECTED__ = true;

  const host = "127.0.0.1";

  connectAuthEmulator(authPanel, `http://${host}:9099`, { disableWarnings: true });
  connectAuthEmulator(authMaster, `http://${host}:9099`, { disableWarnings: true });
  connectAuthEmulator(authDriver, `http://${host}:9099`, { disableWarnings: true });

  connectFirestoreEmulator(dbPublic, host, 8080);
  connectFirestoreEmulator(dbPanel, host, 8080);
  connectFirestoreEmulator(dbMaster, host, 8080);
  connectFirestoreEmulator(dbDriver, host, 8080);

  connectFunctionsEmulator(functionsPanel, host, 5001);
  connectFunctionsEmulator(functionsMaster, host, 5001);
  connectFunctionsEmulator(functionsDriver, host, 5001);

  connectStorageEmulator(storagePublic, host, 9199);
  connectStorageEmulator(storagePanel, host, 9199);
  connectStorageEmulator(storageMaster, host, 9199);
  connectStorageEmulator(storageDriver, host, 9199);
}