"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

const CODE_LENGTH = 6;

export default function VerificarPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push("/bienvenida");
  }

  const code = digits.join("");

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
        Enviamos un código a <span className="font-medium text-ink">carlos@correo.com</span>
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
              className="h-12 w-11 rounded border border-line-2 text-center text-lg font-semibold text-ink outline-none focus:border-accent"
            />
          ))}
        </div>

        <div className="mb-5 flex justify-between text-[12px] text-ink-3">
          <span>Expira en 13:45</span>
          <span>Intentos: 3 de 3</span>
        </div>

        <Button
          variant="primary"
          type="submit"
          className="w-full"
          disabled={code.length !== CODE_LENGTH}
        >
          Verificar
        </Button>
        <Button variant="secondary" type="button" className="mt-2.5 w-full">
          Reenviar código
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
