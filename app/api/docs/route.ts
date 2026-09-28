import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/app-url";
import { BASE_PATH } from "@/lib/base-path";
import { puedeVerDocs } from "@/lib/api-docs";

const SWAGGER_UI = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14";

// Swagger UI con la especificación de /api/docs/spec. Corre en el mismo
// dominio que la API, así que "Try it out" usa la cookie de sesión del
// navegador y pasa el chequeo de Origin de proxy.ts.
export async function GET() {
  if (!(await puedeVerDocs())) {
    return NextResponse.redirect(absoluteUrl("/root"));
  }

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DataForGood API</title>
  <link rel="stylesheet" href="${SWAGGER_UI}/swagger-ui.css" />
  <style>body { margin: 0; background: #fff; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${SWAGGER_UI}/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "${BASE_PATH}/api/docs/spec",
      dom_id: "#swagger-ui",
      deepLinking: true,
      persistAuthorization: true,
      withCredentials: true,
    });
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
