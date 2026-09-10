import Link from "next/link";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export default function EntrarPage() {
  return (
    <div className="rounded-lg border border-line bg-surface p-8">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-extrabold text-ink">Entra a tu cuenta</h1>
        <p className="mt-1 text-[13px] text-ink-2">
          Participa en campañas o administra las tuyas.
        </p>
      </div>

      <form className="flex flex-col">
        <Field label="Correo" required>
          <Input type="email" name="email" placeholder="nombre@correo.com" required />
        </Field>
        <Field label="Contraseña" required>
          <Input type="password" name="password" placeholder="••••••••" required />
        </Field>

        <Link href="#" className="mb-5 text-[13px] font-medium text-accent hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>

        <Button variant="primary" type="submit" className="w-full">
          Entrar
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
