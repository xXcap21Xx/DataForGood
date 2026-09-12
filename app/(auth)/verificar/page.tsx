"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 3;

function formatRemaining(ms: number) {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function VerificarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    async function loadPending() {
      try {
        const response = await fetch("/api/auth/verificar");
        if (!response.ok) {
          router.replace("/entrar");
          return;
        }
        const payload = await response.json();
        setEmail(payload.data.email);
        setExpiresAt(payload.data.expiresAt ? new Date(payload.data.expiresAt).getTime() : null);
        setAttemptsLeft(payload.data.attemptsLeft ?? MAX_ATTEMPTS);
      } catch {
        router.replace("/entrar");
      } finally {
        setLoading(false);
      }
    }
    loadPending();
  }, [router]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = expiresAt ? expiresAt - now : 0;
  const expired = expiresAt !== null && remainingMs <= 0;

  function handleChange(index: number, value: string) {
    const clean = value.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);

    if (clean && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  const code = digits.join("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (code.length !== CODE_LENGTH) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "No se pudo verificar el código");
        if (typeof payload.attemptsLeft === "number") {
          setAttemptsLeft(payload.attemptsLeft);
        }
        setDigits(Array(CODE_LENGTH).fill(""));
        inputsRef.current[0]?.focus();
        return;
      }

      router.push("/bienvenida");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servicio de verificación");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError("");
    setResending(true);
    try {
      const response = await fetch("/api/auth/verificar/reenviar", { method: "POST" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "No se pudo reenviar el código");
        return;
      }

      setExpiresAt(payload.data.expiresAt ? new Date(payload.data.expiresAt).getTime() : null);
      setAttemptsLeft(MAX_ATTEMPTS);
      setDigits(Array(CODE_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } catch {
      setError("No se pudo conectar con el servicio de verificación");
    } finally {
      setResending(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-line bg-surface p-8 text-center text-[13px] text-ink-2">
        Cargando…
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-tint text-accent">
        <MailIcon />
      </div>
      <h1 className="text-xl font-extrabold text-ink">Verifica tu correo</h1>
      <p className="mt-1 font-mono text-[10.5px] uppercase tracking-wider text-accent">
        Paso 2 de 3 · Verificación
      </p>
      <p className="mt-3 text-[13px] text-ink-2">
        Enviamos un código a <span className="font-medium text-ink">{email}</span>
      </p>

      <div className="my-5 flex gap-1.5">
        <div className="h-1 flex-1 rounded-pill bg-accent" />
        <div className="h-1 flex-1 rounded-pill bg-accent" />
        <div className="h-1 flex-1 rounded-pill bg-line" />
      </div>

      <div className="mb-5 rounded-lg bg-warn-tint p-4 text-left text-[12.5px] leading-relaxed text-warn">
        Tu cuenta permanece inactiva y no puedes participar en campañas hasta
        completar este paso.
      </div>

      <form onSubmit={handleSubmit}>
        <p className="mb-2 text-left text-[13px] font-medium text-ink">Código de 6 dígitos</p>
        <div className="mb-2 flex justify-center gap-2">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              inputMode="numeric"
              maxLength={1}
              disabled={expired || attemptsLeft <= 0}
              className="h-12 w-11 rounded border border-line-2 text-center text-lg font-semibold text-ink outline-none focus:border-accent disabled:opacity-50"
            />
          ))}
        </div>

        <div className="mb-2 flex justify-between text-[12px] text-ink-3">
          <span>{expired ? "Código expirado" : `Expira en ${formatRemaining(remainingMs)}`}</span>
          <span>Intentos: {attemptsLeft} de {MAX_ATTEMPTS}</span>
        </div>

        {error && <p className="mb-3 text-left text-[12px] text-danger">{error}</p>}

        <Button
          variant="primary"
          type="submit"
          className="w-full"
          disabled={code.length !== CODE_LENGTH || submitting || expired || attemptsLeft <= 0}
        >
          {submitting ? "Verificando..." : "Verificar"}
        </Button>
        <Button
          variant="secondary"
          type="button"
          className="mt-2.5 w-full"
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? "Enviando..." : "Reenviar código"}
        </Button>
      </form>

      <p className="mt-5 text-[12px] text-ink-3">
        Si no lo encuentras, revisa la carpeta de correo no deseado.
      </p>
    </div>
  );
}

function MailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}
