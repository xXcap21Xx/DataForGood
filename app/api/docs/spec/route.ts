import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { puedeVerDocs } from "@/lib/api-docs";
import { BASE_PATH } from "@/lib/base-path";

// openapi.yaml vive en la raíz del proyecto. next.config.ts lo agrega al
// build standalone con outputFileTracingIncludes.
export async function GET() {
  if (!(await puedeVerDocs())) {
    return NextResponse.json({ error: "Inicia sesión como SuperUsuario en /root" }, { status: 401 });
  }

  try {
    const archivo = await readFile(path.join(process.cwd(), "openapi.yaml"), "utf8");
    // Primer servidor: el mismo desde el que se abre Swagger UI, con la
    // subruta de este build. Así "Try it out" funciona en Docker y en next dev.
    const spec = archivo.replace(
      /^servers:\r?\n/m,
      `servers:\n  - url: ${BASE_PATH || "/"}\n    description: Este servidor\n`,
    );
    return new NextResponse(spec, {
      headers: { "Content-Type": "application/yaml; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("No se pudo leer openapi.yaml", error);
    return NextResponse.json({ error: "No se encontró openapi.yaml" }, { status: 500 });
  }
}
