// Subruta en la que se publica la app (p. ej. "/dataforgood" detrás del
// proxy de multimodal-ai-lab.cicese.mx). next.config.ts la fija como
// `basePath` y la expone aquí en tiempo de build.
//
// `basePath` se aplica solo a <Link>, router.push y redirect(). Todo lo
// demás que arma una URL a mano (fetch, <img src>, <a href>,
// window.location, NextResponse.redirect) tiene que anteponer BASE_PATH.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
