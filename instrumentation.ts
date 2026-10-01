// Next llama a register() una vez al arrancar el servidor, antes de atender
// peticiones (no durante `next build`). Aquí se crea o actualiza el esquema
// de la base, en vez de ejecutar el DDL en cada petición. El código de Node
// va en instrumentation-node.ts: este archivo también se analiza para Edge.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { crearEsquemaAlArrancar } = await import("./instrumentation-node");
    await crearEsquemaAlArrancar();
  }
}
