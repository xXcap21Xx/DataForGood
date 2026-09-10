"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

interface Rule {
  label: string;
  test: (v: string) => boolean;
}

const PASSWORD_RULES: Rule[] = [
  { label: "Mínimo 8 caracteres", test: (v) => v.length >= 8 },
  { label: "Una mayúscula", test: (v) => /[A-Z]/.test(v) },
  { label: "Un número", test: (v) => /[0-9]/.test(v) },
  { label: "Un carácter especial", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export default function RegistroPage() {
  const router = useRouter();
  const [alias, setAlias] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);

  const allRulesPass = PASSWORD_RULES.every((r) => r.test(password));
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = alias && email && allRulesPass && passwordsMatch && acceptedTerms;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email === "carlos@correo.com") {
      setEmailTaken(true);
      return;
    }
    setEmailTaken(false);
    router.push("/verificar");
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-8">
      <div className="mb-2 text-center">
        <h1 className="text-xl font-extrabold text-ink">Crea tu cuenta</h1>
        <p className="mt-2 font-mono text-[10.5px] uppercase tracking-wider text-accent">
          Paso 1 de 3 · Tus datos
        </p>
      </div>

      <div className="my-5 flex gap-1.5">
        <div className="h-1 flex-1 rounded-pill bg-accent" />
        <div className="h-1 flex-1 rounded-pill bg-line" />
        <div className="h-1 flex-1 rounded-pill bg-line" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <Field label="Nombre o alias" required>
          <Input
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="Carlos P."
            required
          />
        </Field>

        <Field label="Correo" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailTaken(false);
            }}
            placeholder="carlos@correo.com"
            required
            className={emailTaken ? "border-danger bg-danger-tint" : ""}
          />
          {emailTaken && (
            <p className="mt-1.5 text-[12px] text-danger">Ese correo ya está registrado</p>
          )}
        </Field>

        <Field label="Contraseña" required>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </Field>

        <Field label="Confirmar contraseña" required>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            className={
              confirmPassword.length > 0 && !passwordsMatch ? "border-danger" : ""
            }
          />
        </Field>

        <ul className="mb-4 flex flex-col gap-1.5">
          {PASSWORD_RULES.map((rule) => {
            const pass = rule.test(password);
            return (
              <li
                key={rule.label}
                className={`text-[12.5px] ${pass ? "text-ok" : "text-ink-3"}`}
              >
                {pass ? "✓" : "·"} {rule.label}
              </li>
            );
          })}
        </ul>

        <label className="mb-5 flex items-start gap-2.5 text-[12.5px] text-ink-2">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5"
          />
          Acepto los{" "}
          <Link href="#" className="text-accent hover:underline">
            términos de uso
          </Link>{" "}
          y el{" "}
          <Link href="#" className="text-accent hover:underline">
            aviso de privacidad
          </Link>
        </label>

        <Button variant="primary" type="submit" className="w-full" disabled={!canSubmit}>
          Continuar
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ink-2">
        ¿Ya tienes cuenta?{" "}
        <Link href="/entrar" className="font-medium text-accent hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
