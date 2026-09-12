"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export default function EntrarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setServerError(payload.error ?? "No se pudo iniciar sesión");
        return;
      }

      router.push("/campanas");
      router.refresh();
    } catch {
      setServerError("No se pudo conectar con el servicio de usuarios");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-8">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-extrabold text-ink">Entra a tu cuenta</h1>
        <p className="mt-1 text-[13px] text-ink-2">
          Participa en campañas o administra las tuyas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <Field label="Correo" required>
          <Input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@correo.com"
            required
          />
        </Field>
        <Field label="Contraseña" required>
          <Input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          {serverError && (
            <p className="mt-1.5 text-[12px] text-danger">{serverError}</p>
          )}
        </Field>

        <Link href="#" className="mb-5 text-[13px] font-medium text-accent hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>

        <Button variant="primary" type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Entrando..." : "Entrar"}
        </Button>
        <Button variant="secondary" type="button" className="mt-2.5 w-full">
          Continuar con Google
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ink-2">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-accent hover:underline">
          Regístrate
        </Link>
      </p>

      <div className="mt-6 rounded-lg bg-sunken p-4 text-[12.5px] leading-relaxed text-ink-2">
        Toda cuenta entra como usuario común. El rol de supervisor lo asigna
        el SuperUsuario o cualquier Supervisor ya activo; revisor y
        administrador de campaña los asigna el SuperUsuario. Aparecen
        después dentro de la misma sesión.
      </div>
    </div>
  );
}
