import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  Auth,
  signInAnonymously,
} from "firebase/auth";

type Props = {
  auth: Auth;
  countryCode?: string; // ex: "+55"
  onSignedIn: () => void;
};

export default function PhoneOtpLogin({ auth, countryCode = "+55", onSignedIn }: Props) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  // container id único
  const recaptchaId = useMemo(
    () => `recaptcha-container-${Math.random().toString(36).slice(2)}`,
    []
  );

  useEffect(() => {
    // cria reCAPTCHA invisível
    if (!verifierRef.current) {
      verifierRef.current = new RecaptchaVerifier(auth, recaptchaId, { size: "invisible" });
    }
    return () => {
      try {
        verifierRef.current?.clear();
      } catch {
        // ignore
      }
      verifierRef.current = null;
    };
  }, [auth, recaptchaId]);

  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    // se usuário já digitar +55..., mantém
    if (raw.trim().startsWith("+")) return raw.trim();
    return `${countryCode}${digits}`;
  };

  const sendCode = async () => {
    setErr("");
    setLoading(true);
    try {
      const v = verifierRef.current;
      if (!v) throw new Error("reCAPTCHA não inicializado");
      const fullPhone = normalizePhone(phone);
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, v);
      confirmationRef.current = confirmation;
      setStep("code");
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Falha ao enviar código.");
      // re-render do reCAPTCHA em caso de erro
      try {
        await verifierRef.current?.render();
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    setErr("");
    setLoading(true);
    try {
      const confirmation = confirmationRef.current;
      if (!confirmation) throw new Error("Código não foi enviado ainda.");
      await confirmation.confirm(code.trim());
      onSignedIn();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Código inválido.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Login DEV para testar no Emulator sem SMS
  const devLogin = async () => {
  setErr("");
  setLoading(true);
  try {
    if (auth.currentUser) {
      onSignedIn();
      return;
    }
    await signInAnonymously(auth);
    onSignedIn();
  } catch (e: any) {
    console.error(e);
    setErr(e?.message || "Falha no login DEV.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="w-full max-w-sm mx-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-white">
      <div id={recaptchaId} />
      <h2 className="text-lg font-semibold">Entrar como Motoboy</h2>
      <p className="text-slate-300 text-sm mt-1">
        Use seu WhatsApp/telefone. Enviamos um código por SMS.
      </p>

      {step === "phone" ? (
        <div className="mt-4 space-y-3">
          <label className="text-sm text-slate-200">Telefone</label>
          <input
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 outline-none"
            placeholder="(99) 99999-9999"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          {err && <div className="text-red-300 text-sm">{err}</div>}

          <button
            className="w-full px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
            disabled={loading || phone.trim().length < 8}
            onClick={sendCode}
          >
            {loading ? "Enviando..." : "Enviar código"}
          </button>

          {/* ✅ Botão DEV (só em desenvolvimento) */}
          {import.meta.env.DEV && (
            <button
              type="button"
              className="w-full px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60"
              disabled={loading}
              onClick={devLogin}
              title="Apenas para testes locais (não envia SMS)"
            >
              {loading ? "Entrando..." : "Entrar DEV (sem SMS)"}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="text-sm text-slate-200">Código</label>
          <input
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 outline-none"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {err && <div className="text-red-300 text-sm">{err}</div>}
          <div className="flex gap-2">
            <button
              className="flex-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60"
              disabled={loading}
              onClick={() => setStep("phone")}
            >
              Voltar
            </button>
            <button
              className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
              disabled={loading || code.trim().length < 4}
              onClick={confirmCode}
            >
              {loading ? "Entrando..." : "Confirmar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
