import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { authDriver, storageDriver, dbDriver } from "../services/firebase";
import { claimDriverJoin } from "../services/driver";
import { compressImage } from "../utils";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function DriverInstallPage() {
  const q = useQuery();
  const navigate = useNavigate();

  const slugFromUrl = (q.get("slug") || "").trim();
  const codeFromUrl = (q.get("code") || "").trim();

  const [slug, setSlug] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  const [joining, setJoining] = useState(false);
  const [err, setErr] = useState("");

  // ✅ Mantém o slug mesmo se voltar sem ?slug=
  useEffect(() => {
    if (slugFromUrl) {
      localStorage.setItem("driverSlug", slugFromUrl);
      setSlug(slugFromUrl);
    } else {
      setSlug(localStorage.getItem("driverSlug") || "");
    }
  }, [slugFromUrl]);

  // ✅ Se o link já vier com ?code=, pré-preenche
  useEffect(() => {
    if (codeFromUrl) setCode(codeFromUrl);
  }, [codeFromUrl]);

  // Preview da foto
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const uploadDriverPhoto = async (uid: string): Promise<string> => {
    if (!photoFile) throw new Error("Envie uma foto (selfie) para continuar.");

    const compressed = await compressImage(photoFile, {
      maxWidth: 900,
      maxHeight: 900,
      quality: 0.85,
      outputType: "image/jpeg",
    });

    const file = (compressed as any) ?? photoFile;

    const storageRef = ref(storageDriver, `drivers/${uid}/profile.jpg`);
    await uploadBytes(storageRef, file, {
      contentType: "image/jpeg",
      cacheControl: "public,max-age=86400",
    });
    return await getDownloadURL(storageRef);
  };

  const handleActivate = async () => {
    setErr("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password;

    if (!slug) return setErr("Link inválido: slug não encontrado.");
    if (!code.trim()) return setErr("Informe o código de convite.");
    if (!name.trim()) return setErr("Informe seu nome.");
    if (!phone.trim()) return setErr("Informe seu telefone/whatsapp.");
    if (!cleanEmail || !cleanPass) return setErr("Informe email e senha.");
    if (!photoFile) return setErr("Envie uma foto (selfie) para continuar.");

    setJoining(true);

    try {
      // 1) cria conta no Auth (ou loga se já existe)
      let uid: string;
      try {
        const cred = await createUserWithEmailAndPassword(authDriver, cleanEmail, cleanPass);
        uid = cred.user.uid;
      } catch (e: any) {
        if (e?.code === "auth/email-already-in-use") {
          const cred = await signInWithEmailAndPassword(authDriver, cleanEmail, cleanPass);
          uid = cred.user.uid;
        } else {
          throw e;
        }
      }

      // 2) upload selfie
      const photoUrl = await uploadDriverPhoto(uid);

      // 3) vincula motoboy na loja (retorna tenantId)
      // ⚠️ Se sua claimDriverJoin não aceita phone, remova phone daqui
      const res = await claimDriverJoin({
        slug,
        code: code.trim(),
        name: name.trim(),
        photoUrl,
      });

      const tenantId = res?.tenantId;
      if (!tenantId) throw new Error("Falha ao vincular: tenantId não retornou.");

      // 4) grava perfil do usuário (users/{uid})
      await setDoc(
        doc(dbDriver, "users", uid),
        {
          role: "driver",
          tenantId,
          name: name.trim(),
          phone: phone.trim(),
          email: cleanEmail,
          photoUrl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 5) grava driver no tenant (tenants/{tenantId}/drivers/{uid})
      await setDoc(
        doc(dbDriver, `tenants/${tenantId}/drivers/${uid}`),
        {
          name: name.trim(),
          phone: phone.trim(),
          email: cleanEmail,
          photoUrl,
          status: "offline",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 6) salva no localStorage
      localStorage.setItem("driverTenantId", tenantId);
      localStorage.setItem("driverSlug", slug);

      // 7) vai pro app do motoboy
      navigate("/motoboy", { replace: true });
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Falha ao ativar motoboy.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-3">
            <img src="/logo-motoboy.svg" alt="Motoboy" className="w-14 h-14" />
          </div>
          <h1 className="text-2xl font-bold">Ativar App do Motoboy</h1>
          <p className="text-slate-300 mt-1">
            Você foi convidado por uma lanchonete. Cadastre email/senha, envie sua foto e informe o código de convite.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div>
            <div className="text-sm text-slate-300">Loja (slug)</div>
            <div className="font-mono text-slate-100">{slug || "—"}</div>
          </div>

          <label className="text-sm text-slate-200">Seu nome</label>
          <input
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 outline-none"
            placeholder="Ex: João"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label className="text-sm text-slate-200">Seu WhatsApp</label>
          <input
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 outline-none"
            placeholder="(99) 99999-9999"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <label className="text-sm text-slate-200">Código de convite</label>
          <input
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 outline-none"
            placeholder="Ex: 123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-sm text-slate-200">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 outline-none"
                placeholder="motoboy@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-slate-200">Senha</label>
              <input
                type="password"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="text-sm text-slate-200">Foto (selfie)</label>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} className="h-full w-full object-cover" alt="Foto" />
                ) : (
                  <span className="text-xs text-slate-500">Sem foto</span>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                className="text-sm text-slate-300"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="text-xs text-slate-400 mt-1">Obrigatório. Ajuda a loja a validar o entregador.</div>
          </div>

          {err && <div className="text-red-300 text-sm">{err}</div>}
          {joining && <div className="text-slate-300 text-sm">Ativando...</div>}

          <button
            disabled={joining}
            onClick={handleActivate}
            className="w-full mt-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 font-bold"
          >
            {joining ? "Ativando..." : "Ativar agora"}
          </button>
        </div>

        <div className="text-xs text-slate-400 text-center">
          Dica: abra este link no celular para testar como se fosse o QR Code.
        </div>
      </div>
    </div>
  );
}