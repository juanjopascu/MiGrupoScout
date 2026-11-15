# Guia de Despliegue y Operacion - ConsejoScout PWA

Esta guia describe el procedimiento completo para aprovisionar la base de datos en Supabase, generar las credenciales criptograficas requeridas, ingestar la normativa oficial SAAC y desplegar ConsejoScout en Vercel con Web Push y Cron diario operativo.

---

## 1. Requisitos Previos

- Node.js 20 o superior y `npm`.
- Cuenta y proyecto creado en **Supabase** (PostgreSQL 16).
- Cuenta y proyecto vinculado en **Vercel**.
- Clave de API para generacion de embeddings (`gemini` por defecto u `openai`) para el script de ingesta normativa.
- Herramienta `openssl` (o Node.js) para generar `CRON_SECRET`.

---

## 2. Configuracion de Base de Datos en Supabase (`/database/schema.sql`)

ConsejoScout utiliza aislamiento multi-tenant por `group_id` con Row Level Security (`FORCE ROW LEVEL SECURITY`) y busqueda vectorial con `pgvector`.

### Pasos

1. Ingresar al panel de Supabase del proyecto destino.
2. Abrir **SQL Editor -> New query**.
3. Copiar y ejecutar el contenido completo del archivo `/database/schema.sql`.
4. Verificar en **Database -> Extensions** que `pgcrypto` y `vector` (`pgvector`) esten habilitadas.
5. Verificar en **Table Editor** que se hayan creado las tablas:
   - `scout_groups`
   - `group_memberships`
   - `group_members`
   - `camp_checklists`
   - `council_tasks`
   - `push_subscriptions`
   - `saac_knowledge_base`
6. Confirmar en **Database -> Functions** la existencia de `is_group_member`, `has_group_role` y `match_saac_documents`.
7. Obtener las credenciales en **Project Settings -> API**:
   - `Project URL` -> se usara en `VITE_SUPABASE_URL` y `SUPABASE_URL`.
   - `anon` (`public`) key -> se usara en `VITE_SUPABASE_ANON_KEY`.
   - `service_role` (`secret`) key -> se usara exclusivamente en `SUPABASE_SERVICE_ROLE_KEY`.

---

## 3. Generacion de Claves VAPID y `CRON_SECRET`

### 3.1 Claves VAPID para Web Push

Ejecutar en la raiz del proyecto:

```bash
npm run generate-vapid
```

El script `scripts/generate-vapid.js` imprimira tres variables listas para copiar:

```env
VITE_VAPID_PUBLIC_KEY=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

Notas importantes:
- `VITE_VAPID_PUBLIC_KEY` y `VAPID_PUBLIC_KEY` deben tener exactamente el mismo valor.
- `VAPID_PRIVATE_KEY` nunca debe exponerse con prefijo `VITE_`.
- Definir `VAPID_SUBJECT` con un identificador `mailto:` valido (por ejemplo, `mailto:soporte@consejoscout.org.ar`).

### 3.2 Secreto de Cron (`CRON_SECRET`)

Generar un secreto aleatorio de 64 caracteres hexadecimales:

```bash
openssl rand -hex 32
```

Alternativa con Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Guardar el resultado para asignarlo a `CRON_SECRET` en Vercel. Vercel enviara automaticamente la cabecera `Authorization: Bearer <CRON_SECRET>` al invocar el endpoint programado.

---

## 4. Ingesta de Normativa SAAC (`npm run ingest-saac`)

El script `scripts/ingest-saac-docs.js` descarga documentos de `https://scouts.org.ar/biblioteca` (o desde un directorio local con `--input-dir`), divide el texto por articulos/secciones, genera embeddings de 768 dimensiones y ejecuta upsert idempotente en `saac_knowledge_base`.

### 4.1 Preparar entorno local temporal

Exportar las variables privadas necesarias en la sesion actual (o cargarlas desde `.env.local` sin exponerlas al repositorio):

```bash
export SUPABASE_URL="https://tu-proyecto.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
export EMBEDDING_PROVIDER="gemini"
export EMBEDDING_API_KEY="tu-api-key-de-embeddings"
```

### 4.2 Validacion previa en modo simulacion (`--dry-run`)

Ejecutar primero sin escribir en la base de datos para verificar conectividad y fragmentacion:

```bash
npm run ingest-saac -- --source=all --dry-run
```

### 4.3 Ejecucion real en Supabase

Para ingestar todas las fuentes del manifiesto oficial:

```bash
npm run ingest-saac -- --source=all
```

Opciones adicionales utiles:
- Filtrar por categoria: `npm run ingest-saac -- --category=norma_operativa`
- Procesar documentos locales (`.pdf`, `.html`, `.md`, `.txt`): `npm run ingest-saac -- --input-dir=./ruta/documentos`
- Consultar ayuda completa: `npm run ingest-saac -- --help`

Verificar luego en Supabase (`Table Editor -> saac_knowledge_base`) que existan registros con vector poblado.

---

## 5. Configuracion de Variables de Entorno en Vercel

En el panel de Vercel: **Project -> Settings -> Environment Variables**.

### 5.1 Variables Publicas de Frontend (`VITE_*`)

Configurar para los entornos **Production**, **Preview** y **Development** segun corresponda:

| Variable | Descripcion |
| :--- | :--- |
| `VITE_SUPABASE_URL` | URL publica del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave publica `anon` de Supabase |
| `VITE_VAPID_PUBLIC_KEY` | Clave publica VAPID en base64url |
| `VITE_SAAC_CRUZ_DEL_SUR_URL` | `https://cruzdelsur.scouts.org.ar` |
| `VITE_SAAC_RUMBO_SUR_URL` | `https://rumbosur.scouts.org.ar` |
| `VITE_SAAC_BIBLIOTECA_URL` | `https://scouts.org.ar/biblioteca` |
| `VITE_SAAC_CAMPUS_URL` | `https://campus.scouts.org.ar` |

Advertencia operativa: Vite embebe las variables `VITE_*` durante `npm run build`. Si se modifica cualquiera de ellas en Vercel, es obligatorio lanzar un nuevo deploy (**Redeploy**) para que el bundle tome los valores actualizados.

### 5.2 Variables Privadas de Servidor (`/api/**`)

Configurar sin prefijo `VITE_`:

| Variable | Descripcion |
| :--- | :--- |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada `service_role` de Supabase |
| `VAPID_PUBLIC_KEY` | Clave publica VAPID |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID |
| `VAPID_SUBJECT` | URI `mailto:` de contacto tecnico |
| `CRON_SECRET` | Secreto Bearer para `/api/push/check-reminders` |

Nota: `EMBEDDING_PROVIDER` y `EMBEDDING_API_KEY` son requeridas unicamente para el script CLI `npm run ingest-saac`; no es necesario cargarlas en Vercel mientras la busqueda semantica utilice consultas desde cliente autenticado o scripts offline.

---

## 6. Despliegue en Vercel y Verificacion PWA

1. Conectar el repositorio Git en Vercel (o desplegar mediante CLI con `vercel --prod`).
2. Confirmar que Vercel detecte:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Verificar que `vercel.json` aplique correctamente:
   - Cabeceras de seguridad (`Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, etc.) en `/(.*)`.
   - `Service-Worker-Allowed: /` y `Cache-Control: no-cache, no-store, must-revalidate` en `/sw.js`.
   - `Content-Type: application/manifest+json` en `/manifest.webmanifest`.
   - `Cache-Control: no-store` en `/api/(.*)`.
   - Fallback SPA hacia `/index.html` sin interceptar `/api/*`, `/assets/*`, `/icons/*`, `/sw.js`, `/manifest.webmanifest` ni `/offline.html`.
4. Abrir la URL desplegada en HTTPS y comprobar en DevTools (**Application -> Service Workers / Manifest**) que el Service Worker registre correctamente y el manifiesto cargue sin errores de CSP.

---

## 7. Verificacion del Cron Diario (`/api/push/check-reminders`)

`vercel.json` programa la ejecucion diaria automatica:

```json
{
  "path": "/api/push/check-reminders",
  "schedule": "0 11 * * *"
}
```

- Horario: `11:00 UTC` diarios (equivalente a `08:00 ART`, zona horaria Argentina UTC-3).
- El endpoint `api/push/check-reminders.js` valida `Authorization: Bearer <CRON_SECRET>` mediante comparacion en tiempo constante (`crypto.timingSafeEqual`).

### 7.1 Prueba de rechazo sin credenciales (debe responder `401`)

```bash
curl -i "https://tu-dominio.vercel.app/api/push/check-reminders"
```

Respuesta esperada: HTTP `401 Unauthorized` con `{ "success": false, "error": "CRON_SECRET invalido o ausente." }`.

### 7.2 Prueba de ejecucion autorizada (debe responder `200`)

```bash
curl -i -H "Authorization: Bearer TU_CRON_SECRET" \
  "https://tu-dominio.vercel.app/api/push/check-reminders"
```

Respuesta esperada: HTTP `200 OK` con resumen agregado:

```json
{
  "success": true,
  "data": {
    "groupsEvaluated": 0,
    "notificationsSent": 0,
    "subscriptionsPruned": 0,
    "executedAt": "2026-11-15T11:00:00.000Z"
  }
}
```

### 7.3 Monitoreo en Produccion

1. En Vercel, abrir **Project -> Settings -> Cron Jobs** (o **Logs** filtrando por `/api/push/check-reminders`).
2. Confirmar que el estado de cada ejecucion diaria sea `200`.
3. Ante respuestas `401`, verificar que `CRON_SECRET` este definido en el entorno **Production** de Vercel y reintentar la invocacion manual desde la consola de Cron Jobs.
