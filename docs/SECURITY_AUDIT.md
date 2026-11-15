# Auditoria de Seguridad SAST/SCA - ConsejoScout PWA

**Fecha de auditoria:** 2026-11-15  
**Alcance:** `/Users/juanjopascuzzi/apps/MiGrupoScout` (Esquema PostgreSQL/Supabase, Funciones Serverless `/api/**`, Scripts CLI, Frontend React/Vite, Service Worker y Configuracion Vercel)  
**Estandares de referencia:** OWASP Top 10 (2021), Principio de Menor Privilegio, Proteccion de Datos Personales y de Menores (PII/PHI)

---

## 1. Resumen Ejecutivo

Se ejecuto una auditoria completa de analisis estatico de codigo (SAST), configuracion de infraestructura y analisis de composicion de software (SCA) sobre el proyecto **ConsejoScout**.

**Estado general de seguridad:** **APROBADO CON REMEDIACIONES APLICADAS**

Durante la auditoria no se detectaron vulnerabilidades criticas ni altas (0 Criticas, 0 Altas). Se identificaron **3 hallazgos de severidad Media** y **4 hallazgos/observaciones de severidad Baja o Informativa**. Todos los hallazgos corregibles en codigo de aplicacion y configuracion fueron remediados y verificados mediante pruebas funcionales puntuales y compilacion de produccion (`npm run build`), manteniendo `0` vulnerabilidades en dependencias de runtime de produccion (`npm audit --omit=dev`).

### Resumen de Hallazgos

| ID | Severidad | Area | Descripcion breve | Estado |
|---|---|---|---|---|
| SEC-01 | Media | Web Push / Privacidad de Menores | Evasion de enmascaramiento de nombres por tildes/diacriticos u orden invertido, lista incompleta de terminos clinicos y exclusion de miembros inactivos en `api/_lib/payloadSanitizer.js` y `api/push/send.js` | Remediado |
| SEC-02 | Media | Frontend / CSP | Manejador inline `onclick="window.location.reload()"` en `public/offline.html` bloqueado por `script-src 'self'` en `vercel.json` | Remediado |
| SEC-03 | Media | Dispositivos Compartidos / Web Push | `handleLogout` en `src/App.jsx` no invocaba `unsubscribeFromPush` antes de `signOutSupabase()`, dejando suscripciones push activas en navegadores compartidos | Remediado |
| SEC-04 | Baja | Criptografia / Cron | `verifyCronAuthorization` en `api/push/check-reminders.js` comparaba longitudes antes de `crypto.timingSafeEqual` (fuga potencial de longitud del secreto por temporizacion) | Remediado |
| SEC-05 | Baja | Scripts CLI | `scripts/ingest-saac-docs.js` enviaba `EMBEDDING_API_KEY` de Gemini en query string (`?key=...`) en lugar de cabecera `x-goog-api-key` | Remediado |
| SEC-06 | Baja | RLS / RBAC (`database/schema.sql`) | `subjefe_grupo` tiene permiso de escritura sobre `group_memberships` (podria asignar rol `jefe_grupo`) y el trigger `validate_camp_checklist_rules()` confia en `required_adults` enviado por el cliente cuando `branch_scope = 'grupal'` | Documentado |
| SEC-07 | Baja (Dev) | SCA (`npm audit`) | 5 vulnerabilidades (2 bajas, 3 moderadas) en `deepmerge`, `glob` y `minimatch`, todas acotadas a `devDependencies` de build-time (`workbox-build` / `vite-plugin-pwa`). `npm audit --omit=dev`: 0 vulnerabilidades | Documentado |

---

## 2. Verificacion de Requisitos Obligatorios

### 2.1 RLS y Proteccion de Datos de Menores (`database/schema.sql`)

Se verifico integralmente `database/schema.sql` (lineas 1 a 612):

1. **Habilitacion y forzado de RLS en todas las tablas (lineas 376-395):**
   - `scout_groups`: `ENABLE ROW LEVEL SECURITY` y `FORCE ROW LEVEL SECURITY` (lineas 376-377).
   - `group_memberships`: `ENABLE ROW LEVEL SECURITY` y `FORCE ROW LEVEL SECURITY` (lineas 379-380).
   - `group_members`: `ENABLE ROW LEVEL SECURITY` y `FORCE ROW LEVEL SECURITY` (lineas 382-383).
   - `camp_checklists`: `ENABLE ROW LEVEL SECURITY` y `FORCE ROW LEVEL SECURITY` (lineas 385-386).
   - `council_tasks`: `ENABLE ROW LEVEL SECURITY` y `FORCE ROW LEVEL SECURITY` (lineas 388-389).
   - `push_subscriptions`: `ENABLE ROW LEVEL SECURITY` y `FORCE ROW LEVEL SECURITY` (lineas 391-392).
   - `saac_knowledge_base`: `ENABLE ROW LEVEL SECURITY` y `FORCE ROW LEVEL SECURITY` (lineas 394-395).

2. **Aislamiento estricto multi-tenant por `group_id` y `auth.uid()`:**
   - Funciones `SECURITY DEFINER` con `SET search_path = public`: `is_group_member(uuid)` (lineas 295-309) y `has_group_role(uuid, text[])` (lineas 311-326), restringidas a `authenticated, service_role` (lineas 328-332).
   - `group_members` (nomina de menores y adultos): `SELECT` limitado a `is_group_member(group_id)`; `INSERT`/`UPDATE` limitado a `has_group_role(group_id, ARRAY['jefe_grupo', 'subjefe_grupo', 'secretario', 'jefe_rama'])`; `DELETE` limitado a `jefe_grupo` y `subjefe_grupo` (lineas 475-508).
   - `camp_checklists` y `council_tasks`: aislados estrictamente mediante `is_group_member(group_id)` y `has_group_role(group_id, ...)` (lineas 510-574).
   - `push_subscriptions`: aislamiento estricto al propietario (`user_id = auth.uid()`) para `SELECT` y `DELETE`, y `user_id = auth.uid() AND is_group_member(group_id)` en `INSERT` y `UPDATE` (lineas 576-604).
   - `scout_groups`: `DELETE` denegado para el rol `authenticated`; `INSERT` requiere `has_group_role(id, ...)` previo, impidiendo creacion arbitraria de grupos desde el cliente (lineas 420-442).
   - `saac_knowledge_base`: solo `SELECT` para `authenticated` (`auth.uid() IS NOT NULL`); escritura exclusiva de `service_role` (lineas 417, 606-612).

3. **Cero acceso para el rol `anon`:**
   - `REVOKE ALL ON TABLE ... FROM anon` explicito sobre las 7 tablas (lineas 398-406).
   - `REVOKE ALL ON FUNCTION match_saac_documents(...) FROM PUBLIC` y `FROM anon` (lineas 370-371).
   - Todas las politicas RLS especifican explicitamente `TO authenticated`.

### 2.2 Custodia de Secretos (VAPID, Service Role, CRON_SECRET)

1. **Ausencia de secretos de servidor en codigo cliente y bundle:**
   - Busqueda exhaustiva en `src/`, `index.html`, `public/`, `vite.config.js` y en el artefacto compilado `dist/` para `VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` y `EMBEDDING_API_KEY`: **0 coincidencias**.
   - `src/config/env.js` solo expone variables con prefijo `VITE_` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`, `VITE_SAAC_*`).
   - `.gitignore` excluye `.env`, `.env.local`, `.env.*.local`, `.vercel` y `dist`.
   - Escaneo de patrones de credenciales hardcodeadas (JWT, API keys, claves privadas PEM): **0 coincidencias** en codigo fuente.

2. **Autorizacion en `api/push/send.js`:**
   - Valida metodo `POST` (405 en otros metodos).
   - Extrae Bearer token y verifica sesion mediante `supabaseAdmin.auth.getUser(token)` (lineas 46-63), devolviendo `401` ante ausencia o invalidez.
   - En envios grupales (`isTest !== true`), exige `groupId` UUID valido (lineas 152-157) y valida en `group_memberships` (`is_active = true`) pertenencia con rol de conduccion `['jefe_grupo', 'subjefe_grupo', 'secretario', 'jefe_rama']` (lineas 159-176), devolviendo `403` si no cumple.
   - Si se envia `targetUserIds`, valida formato UUID y filtra `push_subscriptions` siempre con `.eq('group_id', groupId)` (lineas 208-227), evitando envios transversales entre grupos.
   - En modo `isTest === true`, restringe la consulta a `.eq('user_id', user.id)` y, si recibe `groupId`, valida membresia activa del usuario en ese grupo (lineas 87-105, 124-131).

3. **Autorizacion en `api/push/check-reminders.js`:**
   - Valida metodo `GET` (405 en otros metodos).
   - `verifyCronAuthorization()` (lineas 8-22) valida `Authorization: Bearer <token>` contra `process.env.CRON_SECRET` utilizando comparacion en tiempo constante con `crypto.timingSafeEqual`. Tras la remediacion SEC-04, ambos valores se digieren con SHA-256 antes de `timingSafeEqual` para evitar incluso filtracion de longitud.

### 2.3 Privacidad en Web Push (`api/_lib/payloadSanitizer.js`, `api/push/send.js`, `api/push/check-reminders.js`, `src/sw.js`)

1. **`api/push/check-reminders.js`:**
   - Consulta unicamente `group_id` en `camp_checklists`, `group_members` y `council_tasks` (lineas 97-115). No lee nombres, DNI ni fechas individuales.
   - Emite resumenes estrictamente agregados y numericos (`"Tenes X fichas medicas por vencer..."`) exclusivamente hacia roles habilitados (`jefe_grupo`, `subjefe_grupo`, `secretario`) tras pasar por `sanitizePushPayload()`.

2. **`api/_lib/payloadSanitizer.js` y `api/push/send.js`:**
   - Bloquea URLs externas o peligrosas mediante `ALLOWED_RELATIVE_URL_REGEX = /^\/[a-zA-Z0-9\-\/\?=&]*$/` y rechazo de `//` y `..`.
   - Elimina HTML, caracteres de control y emojis Unicode; trunca `title` a 64 caracteres y `body` a 160 caracteres.
   - Enmascara correos, DNI (con o sin puntos) y telefonos con `[dato-protegido]`.
   - Rechaza payloads con terminos medicos sensibles (`rejectSensitiveTerms = true`) y enmascara variantes si se desactiva el rechazo.
   - Remediaciones aplicadas (SEC-01):
     - Se corrigio el enmascaramiento de `blockedNames` para soportar diferencias de tildes/diacriticos (por ejemplo, `"Martin Perez"` frente a `"Martín Pérez"`) y orden invertido (`"Apellido, Nombre"`).
     - Se incluyeron todos los integrantes de `group_members` del grupo (activos e inactivos) en `blockedNames`, incluyendo el flujo `isTest` cuando se especifica `groupId`.
     - Se normalizo el texto antes de evaluar `SENSITIVE_MEDICAL_REGEX` (sin bandera `/g` en `.test()`), ampliando la cobertura de terminos clinicos sensibles y sus variantes de genero/numero.
     - Se corrigieron las rutas de `icon` (`/icons/icon-192.png`) y `badge` (`/icons/badge-72.png`).

3. **`src/sw.js`:**
   - En evento `push` (lineas 84-119): vuelve a limpiar HTML y caracteres de control, acota longitudes y valida `url` con `toSafeRelativeUrl`.
   - En `notificationclick` (lineas 121-157): revalida `targetUrl` y solo enfoca/navega ventanas del mismo origen (`self.location.origin`).
   - Rutas `/api/` y `*.supabase.co` configuradas con estrategia `NetworkOnly()` (lineas 40-43) para impedir almacenamiento de nominas o datos medicos en Cache Storage.

### 2.4 Seguridad Frontend y Cabeceras (`src/`, `public/`, `vercel.json`)

1. **Sanitizacion XSS y sumideros DOM/JS:**
   - Busqueda global en `src/`, `index.html`, `public/`, `api/` y `scripts/` de `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `document.write`, `eval(`, `new Function` y `onclick=`: **0 coincidencias** tras remediar `public/offline.html`.
   - `src/utils/textSanitizer.js` utiliza `DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })` combinado con `sanitizeString()` para toda entrada de usuario renderizada o persistida.
   - `src/services/knowledgeService.js` (linea 103) interpola terminos en `.or(...)` de Supabase; se verifico que `normalizeText()` elimina todo caracter fuera de `[a-z0-9\s]`, mitigando inyeccion en filtros PostgREST.
   - Enlaces externos (`target="_blank"`): unica aparicion en `src/pages/Dashboard.jsx` (lineas 582-586), con `rel="noopener noreferrer"` y URLs provenientes de configuracion institucional (`src/config/saacLinks.js`).

2. **Cabeceras de seguridad en `vercel.json`:**
   - `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`
   - `X-Frame-Options`: `DENY`
   - `X-Content-Type-Options`: `nosniff`
   - `Referrer-Policy`: `strict-origin-when-cross-origin`
   - `Permissions-Policy`: `camera=(), microphone=(), geolocation=()`
   - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
   - `/sw.js`: `Service-Worker-Allowed: /` y `Cache-Control: no-cache, no-store, must-revalidate`
   - `/api/(.*)`: `Cache-Control: no-store`

### 2.5 Auditoria de Dependencias (SCA)

1. **`npm audit --omit=dev` (dependencias de runtime en produccion):**
   - Resultado: `found 0 vulnerabilities` (codigo de salida `0`).
   - Dependencias analizadas: `@supabase/supabase-js`, `dompurify`, `idb`, `lucide-react`, `react`, `react-dom`, `web-push`, `workbox-core`, `workbox-precaching`, `workbox-routing`, `workbox-strategies`.

2. **`npm audit` (incluyendo `devDependencies` de build-time):**
   - Resultado: `5 vulnerabilities (2 low, 3 moderate)` (codigo de salida `1`).
   - Detalle:
     - `deepmerge >=4.2.0` (`GHSA-gcqx-w48m-w2h4`, prototype poisoning en `mergeObject()`), transitiva via `@rollup/plugin-node-resolve` -> `workbox-build` -> `vite-plugin-pwa`.
     - `glob 9.0.0 - 14.0.1` (`GHSA-3g3m-2fjr-6pw4`, moderada, bypass de cancelacion `AbortSignal`), transitiva via `workbox-build` -> `vite-plugin-pwa`.
     - `minimatch 7.0.0 - 11.0.0` (`GHSA-g3hv-75wg-m249`, moderada, potencial DoS por amplificacion de globparts), transitiva via `glob` -> `workbox-build` -> `vite-plugin-pwa`.
   - Evaluacion de impacto: Todas las vulnerabilidades corresponden exclusivamente a herramientas de empaquetado en tiempo de compilacion (`devDependencies`) y no se incluyen en el bundle de produccion (`dist/`) ni en las funciones serverless (`/api/**`). Se dispone de correccion con `npm audit fix`.

---

## 3. Detalle de Hallazgos y Remediaciones

### SEC-01 (Media): Evasion en sanitizacion de nombres por diacriticos/orden y cobertura clinica en Web Push

- **Ubicacion:** `api/_lib/payloadSanitizer.js`, `api/push/send.js`
- **Problema original:**
  1. `maskSensitivePatterns()` verificaba coincidencia normalizada sin tildes (`normalizeForMatch`), pero ejecutaba el reemplazo con `escapeRegExp(cleanName)` sin normalizar, fallando si el texto de la notificacion omitia tildes presentes en la nomina (o viceversa).
  2. No enmascaraba el formato `"Apellido, Nombre"` o `"Apellido Nombre"`.
  3. `api/push/send.js` solo consultaba miembros con `is_active = true` y no pasaba `blockedNames` en el flujo `isTest` cuando se indicaba `groupId`.
  4. `SENSITIVE_MEDICAL_REGEX` utilizaba bandera `/g` en `.test()` y omitia variantes femeninas/plurales o terminos clinicos frecuentes (ej. `alergica`, `celiaquia`, `diabetico`, `convulsiones`, `cardiopatia`).
- **Remediacion aplicada:**
  - Se implemento `buildAccentInsensitiveRegex()` para enmascarar nombres y terminos clinicos independientemente de tildes, mayusculas y formato `Nombre Apellido` / `Apellido, Nombre`.
  - Se removio el filtro `.eq('is_active', true)` al construir `blockedNames` en `api/push/send.js` y se aplico `blockedNames` tambien en `isTest` cuando se provee `groupId`.
  - Se normalizo la entrada con `normalizeForMatch()` antes de evaluar `SENSITIVE_MEDICAL_REGEX` (sin `/g`) y se amplio el listado de terminos clinicos protegidos.

### SEC-02 (Media): Script inline en `public/offline.html` bloqueado por CSP

- **Ubicacion:** `public/offline.html`, `public/offline.js`, `vite.config.js`
- **Problema original:** `public/offline.html` contenia `onclick="window.location.reload()"` en el boton de reintento, lo cual infringe `script-src 'self'` de la cabecera `Content-Security-Policy` en `vercel.json`.
- **Remediacion aplicada:** Se extrajo el manejador al archivo externo `public/offline.js`, se agrego `<script src="/offline.js" defer></script>` en `public/offline.html` y se registro `offline.js` en `includeAssets` de `vite.config.js` para precache offline en el Service Worker.

### SEC-03 (Media): Persistencia de suscripcion Web Push tras cierre de sesion en equipos compartidos

- **Ubicacion:** `src/App.jsx` (`handleLogout`)
- **Problema original:** `handleLogout()` ejecutaba `signOutSupabase()` y `clearAllOfflineData()`, pero no revocaba la suscripcion Web Push activa ni la eliminaba de `push_subscriptions`. En dispositivos compartidos, otro usuario podia seguir recibiendo alertas o verse impedido de suscribirse por restriccion `UNIQUE (endpoint)` y RLS.
- **Remediacion aplicada:** Se actualizo `handleLogout()` en `src/App.jsx` para invocar `await unsubscribeFromPush({ session })` antes de `signOutSupabase()`, manteniendo la revocacion autorizada mientras el JWT aun es valido.

### SEC-04 (Baja): Comparacion de longitud previa a `crypto.timingSafeEqual` en endpoint Cron

- **Ubicacion:** `api/push/check-reminders.js` (`verifyCronAuthorization`)
- **Problema original:** La verificacion previa `providedBuf.length !== expectedBuf.length` podia revelar la longitud de `CRON_SECRET` por canal lateral de tiempo.
- **Remediacion aplicada:** Se reemplazo la comparacion directa por `crypto.timingSafeEqual` sobre los digests SHA-256 de ambos valores (siempre 32 bytes).

### SEC-05 (Baja): Exposicion de API key de Gemini en URL query string en script CLI

- **Ubicacion:** `scripts/ingest-saac-docs.js` (`generateEmbeddingWithRetry`)
- **Problema original:** El parametro `?key=${encodeURIComponent(apiKey)}` en la URL podia quedar registrado en logs de proxies o trazas HTTP.
- **Remediacion aplicada:** Se movio la credencial a la cabecera HTTP `x-goog-api-key`.

### SEC-06 (Baja): Endurecimiento de RBAC e integridad en `database/schema.sql`

- **Ubicacion:** `database/schema.sql` (lineas 240-244, 452-465)
- **Detalle:**
  1. Las politicas `group_memberships_insert` y `group_memberships_update` habilitan a `subjefe_grupo` a insertar o actualizar membresias sin restringir el valor de `role`, por lo que un `subjefe_grupo` autenticado podria elevar su propio rol o el de terceros a `jefe_grupo` dentro de su mismo grupo. Se recomienda restringir en una futura migracion que solo `jefe_grupo` pueda asignar o modificar el rol `jefe_grupo`.
  2. En `validate_camp_checklist_rules()`, cuando `branch_scope = 'grupal'`, la base de datos acepta `NEW.required_adults` provisto por el cliente (`GREATEST(2, COALESCE(NEW.required_adults, 2))`), debido a que `branch_counts` no se persiste como columna dedicada en `camp_checklists`. Si se desea validacion matematica estricta en servidor para salidas grupales, se recomienda persistir `branch_counts jsonb` en `camp_checklists` y calcular el desglose dentro del trigger.

### SEC-07 (Baja - Dev): Vulnerabilidades transitivas en herramientas de build

- **Ubicacion:** `package-lock.json` (`devDependencies` via `vite-plugin-pwa` -> `workbox-build`)
- **Detalle:** `deepmerge`, `glob` y `minimatch` presentan 5 avisos (2 bajos, 3 moderados) exclusivamente en tiempo de compilacion. `npm audit --omit=dev` reporta 0 vulnerabilidades. Se recomienda ejecutar `npm audit fix` en una ventana de mantenimiento validando que no altere la generacion de `dist/sw.js`.

---

## 4. Verificaciones Post-Remediacion

- **Compilacion de produccion (`npm run build`):** Exitosa (`vite v6.4.6`, 1658 modulos transformados, `dist/sw.js` generado con 21 entradas precacheadas incluyendo `offline.js`).
- **Verificacion funcional de `sanitizePushPayload`:** Validado en Node.js el enmascaramiento de nombres con diacriticos asimetricos (`"Martin Perez"` frente a `"Martín Pérez"`), orden invertido (`"Ferreyra, Tomás"`), DNI, telefonos, rechazo de terminos clinicos sensibles (`"Menor alérgica al mani"`) y bloqueo de URLs externas (`"https://evil.com"`).
- **Escaneo final de secretos y sumideros peligrosos:** 0 secretos de servidor en `src/`, `index.html`, `public/`, `vite.config.js` y `dist/`; 0 ocurrencias de `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` o `onclick=`.
- **Nota sobre suite de tests (`npm test`):** `vitest run` finalizo con codigo 1 porque actualmente no existen archivos `*.test.*` o `*.spec.*` en el repositorio. Se recomienda incorporar pruebas unitarias automatizadas para `api/_lib/payloadSanitizer.js`, `src/domain/saacRules.js` y `src/domain/validators.js`.
