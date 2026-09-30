/**
 * Temas de interés y temáticas de campaña: la misma lista, para que un
 * interés del perfil siempre corresponda a una temática que puede tener una
 * campaña. Se elige en /bienvenida y /cuenta (guardado en `usuarios.intereses`,
 * JSONB) y en el formulario de campaña (`campanas.tematica`). Sin
 * dependencias de servidor: lo importan Client Components y el dashboard de
 * usuarios del SuperUsuario.
 *
 * Los primeros siete son los originales: no se renombran porque ya hay
 * perfiles y campañas guardados con esos textos.
 */
export const TEMAS_DE_INTERES = [
  "Medio ambiente",
  "Salud urbana",
  "Educación",
  "Infraestructura",
  "Protección animal",
  "Movilidad",
  "Cultura",
  "Agua y saneamiento",
  "Calidad del aire",
  "Residuos y reciclaje",
  "Biodiversidad",
  "Espacios públicos",
  "Seguridad ciudadana",
  "Protección civil",
  "Accesibilidad",
  "Igualdad de género",
  "Derechos humanos",
  "Transparencia y gobierno",
  "Vivienda",
  "Alimentación y agricultura",
  "Empleo y economía local",
  "Tecnología y conectividad",
  "Deporte y recreación",
];
