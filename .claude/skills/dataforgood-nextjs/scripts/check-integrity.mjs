#!/usr/bin/env node
// Verificación de integridad de DataForGood (Next.js + Express). Sin dependencias.
// Equivalente al chequeo del prototipo (códigos duplicados / navegación muerta), adaptado al proyecto real.
//
// Uso:  node scripts/check-integrity.mjs [--root <carpeta-del-proyecto>] [--json]
// Sale con código 1 si hay errores. Las advertencias no bloquean.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const args = process.argv.slice(2);
const rootIdx = args.indexOf('--root');
const ROOT = rootIdx >= 0 ? args[rootIdx + 1] : process.cwd();
const AS_JSON = args.includes('--json');

// La rama del proyecto usa app/, components/, server/ en la raíz. Si existe src/app se usa src/.
const BASE = existsSync(join(ROOT, 'src', 'app')) ? join(ROOT, 'src') : ROOT;
const APP = join(BASE, 'app');
const SERVER = join(BASE, 'server');
const REGISTRY = join(BASE, 'lib', 'screens.json'); // opcional: registro de pantallas SCR-WEB
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'drizzle', 'public', 'docs', 'scripts']);

const errors = [];
const warnings = [];
const err = (check, file, msg) => errors.push({ check, file: file && rel(file), msg });
const warn = (check, file, msg) => warnings.push({ check, file: file && rel(file), msg });
const rel = (f) => relative(ROOT, f).split(sep).join('/');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mts|js|jsx|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

// Convierte src/app/(grupo)/campanas/[id]/page.tsx en /campanas/[id]
function routeFromPageFile(file) {
  const segments = relative(APP, file).split(sep).slice(0, -1);
  const kept = segments.filter((s) => !(s.startsWith('(') && s.endsWith(')')) && !s.startsWith('@') && !s.startsWith('_'));
  return '/' + kept.join('/');
}

// Convierte /campanas/[id] y /docs/[...slug] en una expresión regular para comparar enlaces
function routeRegex(route) {
  if (route === '/') return /^\/$/;
  const body = route
    .split('/')
    .filter(Boolean)
    .map((seg) => {
      if (/^\[\[\.\.\..+\]\]$/.test(seg)) return '(?:/.*)?';
      if (/^\[\.\.\..+\]$/.test(seg)) return '/.+';
      if (/^\[.+\]$/.test(seg)) return '/[^/]+';
      return '/' + seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  return new RegExp('^' + body + '/?$');
}

// ---------------------------------------------------------------- 1. Registro de pantallas
let registry = [];
const HAS_REGISTRY = existsSync(REGISTRY);
if (HAS_REGISTRY) {
  try {
    registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
  } catch (e) {
    err('registro', REGISTRY, `JSON inválido: ${e.message}`);
  }
}

const seenCodes = new Map();
const seenPaths = new Map();
for (const s of registry) {
  if (!/^SCR-WEB-\d{2,}$/.test(s.code ?? '')) err('registro', REGISTRY, `Código con formato inválido: "${s.code}"`);
  if (seenCodes.has(s.code)) err('registro', REGISTRY, `Código duplicado: ${s.code}`);
  if (seenPaths.has(s.path)) err('registro', REGISTRY, `Ruta duplicada ${s.path} en ${seenPaths.get(s.path)} y ${s.code}`);
  seenCodes.set(s.code, s);
  seenPaths.set(s.path, s.code);
  for (const rf of s.rf ?? []) {
    if (!/^RF-WEB-\d{2,}$/.test(rf)) err('registro', REGISTRY, `${s.code}: requisito con formato inválido "${rf}"`);
  }
}

// ---------------------------------------------------------------- 2. Páginas ↔ registro
const allFiles = walk(BASE);
const pageFiles = walk(APP).filter((f) => /[\\/]page\.(tsx|jsx|ts|js)$/.test(f));
const pageRoutes = new Map(); // ruta -> archivo

for (const file of pageFiles) {
  const route = routeFromPageFile(file);
  pageRoutes.set(route, file);
  const text = readFileSync(file, 'utf8');
  const tags = [...text.matchAll(/@screen\s+(SCR-WEB-\d+)/g)].map((m) => m[1]);
  const entry = registry.find((s) => s.path === route);

  if (HAS_REGISTRY && tags.length === 0) {
    warn('pantallas', file, `La página ${route} no declara su código con /** @screen SCR-WEB-XX */`);
  }
  for (const tag of tags) {
    const byCode = seenCodes.get(tag);
    if (!byCode) err('pantallas', file, `@screen ${tag} no existe en screens.json`);
    else if (byCode.path !== route) err('pantallas', file, `@screen ${tag} está registrado con la ruta ${byCode.path}, pero este archivo sirve ${route}`);
  }
  if (HAS_REGISTRY && !entry) warn('pantallas', file, `La ruta ${route} no está en screens.json`);
}

for (const s of registry) {
  if (!pageRoutes.has(s.path)) err('pantallas', REGISTRY, `${s.code} apunta a ${s.path}, pero no existe page.tsx para esa ruta`);
}

// ---------------------------------------------------------------- 3. Navegación muerta
const knownRoutes = [...new Set([...pageRoutes.keys(), ...registry.map((s) => s.path)])].map((r) => ({ r, re: routeRegex(r) }));
const isKnown = (href) => {
  const clean = href.split(/[?#]/)[0] || '/';
  if (clean.startsWith('/api/')) return true;
  return knownRoutes.some(({ re }) => re.test(clean));
};

const tsxFiles = allFiles.filter((f) => /\.(tsx|jsx|ts)$/.test(f) && !f.startsWith(SERVER));
for (const file of tsxFiles) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/screenHref\(\s*['"`](SCR-WEB-[^'"`]+)['"`]/g)) {
    if (!seenCodes.has(m[1])) err('navegacion', file, `línea ${lineOf(text, m.index)}: screenHref('${m[1]}') apunta a una pantalla inexistente`);
  }
  for (const m of text.matchAll(/(?:href|redirect\(|push\(|replace\()\s*=?\s*\{?\s*['"](\/[^'"]*)['"]/g)) {
    const href = m[1];
    if (href.startsWith('//')) continue;
    if (!isKnown(href)) err('navegacion', file, `línea ${lineOf(text, m.index)}: enlace a ${href}, que no corresponde a ninguna página`);
  }
  text.split('\n').forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
    if (/data-go\s*=/.test(line)) err('navegacion', file, `línea ${i + 1}: quedó un atributo data-go del prototipo; usa <Link href={screenHref(...)}>`);
  });
}

// ---------------------------------------------------------------- 4. Fronteras servidor / cliente
for (const file of allFiles) {
  const text = readFileSync(file, 'utf8');
  const isClient = /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(text);
  if (isClient && /from\s+['"](?:@\/server\/|(?:\.\.\/)+server\/)/.test(text)) {
    err('fronteras', file, "Componente 'use client' importa código de src/server (expone lógica y secretos al navegador)");
  }
  if (file.startsWith(SERVER) && /import\s+['"]server-only['"]/.test(text)) {
    err('fronteras', file, "src/server no puede importar 'server-only': lanza error en Node plano y tumba Express. Ponlo en src/app/_data/*");
  }
  if (!file.startsWith(SERVER) && file !== join(ROOT, 'server.ts') && /from\s+['"]express['"]/.test(text)) {
    warn('fronteras', file, 'Se importa express fuera de src/server');
  }
  if (/['"]use server['"]/.test(text)) {
    warn('fronteras', file, "Se encontró 'use server'. Convención del proyecto: las mutaciones van por la API de Express (/api/v1)");
  }
}

// ---------------------------------------------------------------- 4b. Errores de React/Next vistos en la rama
const mockUsers = [];
for (const file of allFiles.filter((f) => /\.(tsx|jsx)$/.test(f))) {
  const text = readFileSync(file, 'utf8');
  const isClient = /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(text);
  if (isClient && /export\s+default\s+async\s+function/.test(text)) {
    err('react', file, "Componente 'use client' declarado async: falla en ejecución (500). Quita 'use client' y pasa la interactividad a un componente hijo, o quita async");
  }
  const nested = (text.match(/<Link\b[^>]*>\s*<Button\b|<Button\b[^>]*>\s*<Link\b/g) ?? []).length;
  if (nested) warn('react', file, `${nested} botón(es) anidados con <Link> (<a> dentro de <button> o al revés): HTML inválido y problemas con teclado y lectores de pantalla. Usa ButtonLink`);
}
for (const file of allFiles) {
  if (/from\s+['"]@\/data\/screensData['"]/.test(readFileSync(file, 'utf8'))) mockUsers.push(rel(file));
}
if (mockUsers.length) {
  warn('datos', null, `${mockUsers.length} archivo(s) aún usan datos simulados de data/screensData.ts (pendientes de conectar a services): ${mockUsers.slice(0, 4).join(', ')}${mockUsers.length > 4 ? ', …' : ''}`);
}

// ---------------------------------------------------------------- 5. Rutas de Express protegidas
const routerFiles = allFiles.filter((f) => f.startsWith(SERVER) && /router\.(ts|js)$|[\\/]http[\\/]app\.(ts|js)$/.test(f));
const GUARD = /requireAuth|requirePermission\(/;
for (const file of routerFiles) {
  const text = readFileSync(file, 'utf8');
  const routeCall = /\b(app|api|router|\w+Router)\.(get|post|put|patch|delete)\(\s*['"`]/g;
  const matches = [...text.matchAll(routeCall)];
  matches.forEach((m, i) => {
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const chunk = text.slice(m.index, Math.min(end, m.index + 600));
    const lineStart = text.lastIndexOf('\n', m.index) + 1;
    const lineEnd = text.indexOf('\n', m.index);
    const firstLine = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    const prevLine = text.slice(text.lastIndexOf('\n', lineStart - 2) + 1, lineStart);
    const isPublic = /@public/.test(firstLine) || /@public/.test(prevLine);
    if (!isPublic && !GUARD.test(chunk.split(/=>|function/)[0])) {
      err('api', file, `línea ${lineOf(text, m.index)}: ${m[1]}.${m[2]}() sin requireAuth/requirePermission ni comentario // @public`);
    }
  });
  if (/\bapp\.use\(\s*express\.json/.test(text)) {
    err('api', file, 'express.json() montado en la app global: debe ir solo dentro del router /api');
  }
}

// ---------------------------------------------------------------- 6. Singletons y decisiones del proyecto
for (const file of allFiles.filter((f) => f.startsWith(SERVER))) {
  const text = readFileSync(file, 'utf8');
  if (/new\s+(Pool|S3Client)\s*\(/.test(text) && !/globalThis/.test(text)) {
    err('singletons', file, 'Se crea Pool/S3Client sin guardarlo en globalThis: Express y Next tendrían instancias duplicadas');
  }
}
for (const file of allFiles) {
  const text = readFileSync(file, 'utf8');
  const m = text.match(/navigator\.geolocation|\b(latitude|longitude|latitud|longitud|gps)\b/i);
  if (m) warn('decisiones', file, `Referencia a ubicación ("${m[0]}"). La geolocalización se retiró de la plataforma; confirma que sea intencional`);
  if (/\b(localStorage|sessionStorage)\.(setItem|getItem)\(\s*['"][^'"]*(token|session|jwt)/i.test(text)) {
    err('decisiones', file, 'Token de sesión en localStorage/sessionStorage: la sesión va en cookie httpOnly');
  }
}

// ---------------------------------------------------------------- 7. Solo PostgreSQL y Docker
const FORBIDDEN_DB = ['sqlite3', 'better-sqlite3', '@libsql/client', 'mysql', 'mysql2', 'mariadb', 'mongodb', 'mongoose', 'pg-mem', '@electric-sql/pglite', 'mssql', 'tedious', 'oracledb'];
const reEscape = (x) => x.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
const pkgPath = join(ROOT, 'package.json');
if (existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    for (const name of FORBIDDEN_DB) {
      if (deps[name]) err('postgres', pkgPath, `Dependencia "${name}": la base de datos es estrictamente PostgreSQL, también en pruebas`);
    }
  } catch (e) {
    warn('postgres', pkgPath, `No se pudo leer package.json: ${e.message}`);
  }
}
const forbiddenImport = new RegExp(`from\\s+['"](?:${FORBIDDEN_DB.map(reEscape).join('|')}|drizzle-orm/(?:sqlite-core|mysql-core|singlestore-core|libsql|better-sqlite3|mysql2|pglite))['"]`);
for (const file of allFiles) {
  const m = readFileSync(file, 'utf8').match(forbiddenImport);
  if (m) err('postgres', file, `Importa un motor distinto de PostgreSQL (${m[0]})`);
}

const composePath = join(ROOT, 'docker-compose.yml');
if (!existsSync(composePath)) {
  warn('docker', null, 'No existe docker-compose.yml: el sistema completo (app, PostgreSQL, MinIO) se monta en Docker');
} else {
  const compose = readFileSync(composePath, 'utf8');
  const minioImages = [...compose.matchAll(/^\s*image:\s*["']?([^\s"']*minio[^\s"']*)/gm)].map((m) => m[1]);
  if (!minioImages.length) warn('docker', composePath, 'No se encontró el servicio de MinIO');
  for (const img of minioImages) {
    if (!/:RELEASE\.\d{4}-\d{2}-\d{2}T/.test(img)) err('docker', composePath, `Imagen de MinIO sin versión fija ("${img}"): usa la etiqueta RELEASE acordada por el equipo`);
  }
  if (/S3_ACCESS_KEY:\s*["']?\$\{?MINIO_ROOT_USER/.test(compose)) {
    err('docker', composePath, 'La app usa el usuario root de MinIO: debe usar MINIO_APP_ACCESS_KEY');
  }
  if (/^\s*image:\s*["']?(?:mysql|mariadb|mongo|mcr\.microsoft\.com\/mssql|gvenzl\/oracle)/m.test(compose)) {
    err('postgres', composePath, 'Hay un motor de base de datos distinto de PostgreSQL en docker-compose.yml');
  }
  compose.split('\n').forEach((line, i) => {
    if (/5432:5432/.test(line) && !/127\.0\.0\.1:/.test(line)) warn('docker', composePath, `línea ${i + 1}: PostgreSQL publica el puerto 5432 hacia fuera; en el compose base no debe publicarse`);
    if (/9001:9001/.test(line) && !/127\.0\.0\.1:/.test(line)) err('docker', composePath, `línea ${i + 1}: la consola de MinIO (9001) queda expuesta; publícala solo en 127.0.0.1`);
  });
}

// ---------------------------------------------------------------- Reporte
if (AS_JSON) {
  console.log(JSON.stringify({ errors, warnings, pages: pageFiles.length, screens: registry.length }, null, 2));
} else {
  const group = (list) => list.reduce((acc, x) => ((acc[x.check] ??= []).push(x), acc), {});
  console.log(`\nDataForGood · integridad  (${pageFiles.length} páginas, ${routerFiles.length} routers${HAS_REGISTRY ? `, ${registry.length} pantallas registradas` : ', sin registro SCR-WEB'})\n`);
  for (const [label, list, icon] of [['ERRORES', errors, '✖'], ['ADVERTENCIAS', warnings, '⚠']]) {
    if (!list.length) continue;
    console.log(`${label} (${list.length})`);
    for (const [check, items] of Object.entries(group(list))) {
      console.log(`  [${check}]`);
      items.forEach((x) => console.log(`    ${icon} ${x.file ? x.file + ': ' : ''}${x.msg}`));
    }
    console.log('');
  }
  console.log(errors.length ? `✖ ${errors.length} error(es), ${warnings.length} advertencia(s)` : `✔ Sin errores (${warnings.length} advertencia(s))`);
}
process.exit(errors.length ? 1 : 0);
