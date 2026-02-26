import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { getTenantBySlug, tCol, isSubscriptionActive } from "../services/saas";
import { Tenant, Product, AppConfig } from "../types";
import ClientInterface from "../components/ClientInterface";
import { Loader2, Ban } from "lucide-react";

export default function PublicStorePage() {
  const { slug } = useParams();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    let unsubProducts: null | (() => void) = null;

    const run = async () => {
      try {
        // reset ao trocar slug
        setLoading(true);
        setError("");
        setTenant(null);
        setProducts([]);

        if (!slug) {
          setError("Loja não encontrada.");
          setLoading(false);
          return;
        }

        const t = await getTenantBySlug(slug);

        if (!alive) return;

        if (!t) {
          setError("Loja não encontrada.");
          setLoading(false);
          return;
        }

        // Checagem visual (regras/backend fazem a real segurança)
        if (!isSubscriptionActive(t)) {
          setError("Esta loja está temporariamente indisponível.");
          setLoading(false);
          return;
        }

        setTenant(t);

        // ✅ Referência e PATH (para depuração)
        const productsRef = tCol(t.id, "products");
        console.log("[PublicStore] productsRef.path =", productsRef.path);
        console.log("[PublicStore] tenantId =", t.id, "slug =", slug);

        // ✅ Query de produtos disponíveis
        const qProducts = query(productsRef, where("available", "==", true));

        unsubProducts = onSnapshot(
          qProducts,
          (snapshot: QuerySnapshot<DocumentData>) => {
            if (!alive) return;

            const prodList = snapshot.docs.map(
              (d) => ({ id: d.id, ...(d.data() as any) } as Product)
            );

            setProducts(prodList);
            setLoading(false);
          },
          (err: any) => {
            console.error("[PublicStore] Products snapshot error:", err);

            if (!alive) return;

            // Mostra mensagem mais útil quando é permissão
            const code = err?.code || "";
            if (code === "permission-denied") {
              setError("Sem permissão para listar produtos (rules).");
            } else {
              setError("Erro ao carregar produtos.");
            }
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("[PublicStore] load error:", err);
        if (!alive) return;

        setError("Erro ao carregar loja.");
        setLoading(false);
      }
    };

    run();

    return () => {
      alive = false;
      if (unsubProducts) unsubProducts();
    };
  }, [slug]);

  const handleCreateOrder = async (orderData: any) => {
    if (!tenant) return;

    try {
      const ordersRef = tCol(tenant.id, "orders");
      console.log("[PublicStore] ordersRef.path =", ordersRef.path);

      await addDoc(ordersRef, {
        ...orderData,
        createdAt: serverTimestamp(),
        tenantId: tenant.id,
      });
    } catch (err) {
      console.error("[PublicStore] Error creating order", err);
      alert("Erro ao enviar pedido. Tente novamente.");
    }
  };

  const handleEnterGiveaway = async (entryData: any) => {
    if (!tenant) return;

    try {
      const giveawayRef = tCol(tenant.id, "giveaway_entries");
      console.log("[PublicStore] giveawayRef.path =", giveawayRef.path);

      await addDoc(giveawayRef, {
        ...entryData,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("[PublicStore] Error entering giveaway", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-slate-800 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-40 bg-slate-800 rounded animate-pulse mb-2" />
              <div className="h-3 w-56 bg-slate-800 rounded animate-pulse" />
            </div>
          </div>

          <div className="mt-6 h-36 w-full bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
              >
                <div className="h-32 w-full bg-slate-800 rounded-xl animate-pulse" />
                <div className="mt-4 h-4 w-3/4 bg-slate-800 rounded animate-pulse" />
                <div className="mt-2 h-3 w-1/2 bg-slate-800 rounded animate-pulse" />
                <div className="mt-4 flex items-center justify-between">
                  <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />
                  <div className="h-9 w-24 bg-slate-800 rounded-xl animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          <div className="py-10 flex items-center justify-center text-slate-400 text-sm">
            <Loader2 className="animate-spin mr-2" size={16} />
            Carregando cardápio...
          </div>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <Ban size={64} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Ops!</h1>
        <p className="text-slate-400">{error || "Loja não encontrada."}</p>
      </div>
    );
  }

  const appConfig: AppConfig = {
    appName: tenant.appName || tenant.name,
    appLogoUrl: tenant.appLogoUrl || "",
    bannerUrl: tenant.bannerUrl,
    ...((tenant as any).config || {}),
  };

  return (
    <ClientInterface
      products={products}
      appConfig={appConfig}
      onCreateOrder={handleCreateOrder}
      onEnterGiveaway={handleEnterGiveaway}
      allowSystemAccess={false}
      onSystemAccess={() => {}}
      onRecordVisit={() => {}}
    />
  );
}
