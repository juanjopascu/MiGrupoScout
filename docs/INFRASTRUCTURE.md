# Infraestructura y Operacion - ConsejoScout PWA

Este documento define la arquitectura de red, DNS, seguridad en el borde (Edge), politicas de cache PWA, operacion de tareas programadas, respaldo/recuperacion ante desastres (Backup/DR) y configuracion alternativa On-Premise para **ConsejoScout**.

Toda especificacion aqui descripta fue contrastada con los artefactos reales del repositorio: `vercel.json`, `vite.config.js`, `src/sw.js`, `database/schema.sql`, `api/push/check-reminders.js`, `api/push/send.js`, `api/_lib/pushDispatcher.js` y `scripts/ingest-saac-docs.js`.

---

## 1. Arquitectura de Red, DNS, TLS 1.3 y Cabeceras HTTP

### 1.1 Topologia de Red en Produccion (Vercel + Supabase)

```text
+-----------------------+
|   Navegador / PWA     |
|  (Service Worker sw.js|
|   + IndexedDB local)  |
+-----------+-----------+
            | HTTPS (TLS 1.3 / HTTP/2-3)
            v
+-----------------------+
| Vercel Edge Network   |
| - Terminacion TLS     |
| - Cabeceras HTTP/CSP  |
| - Static dist/ (CDN)  |
| - Rewrites SPA        |
+-----+-----------+-----+
      |           |
      |           +------------------------------+
      v                                          v
+---------------------------+     +------------------------------+
| Vercel Serverless /api/*  |     | Servicios Externos (Cliente) |
| - POST /api/push/send     |     | - Supabase Auth/REST/WSS     |
| - GET /api/push/check-*   |     |   (https://*.supabase.co)    |
+-----+---------------+-----+     | - Google Fonts               |
      |               |           +------------------------------+
      |               |
      v               v
+--------------+  +----------------------------+
| Supabase DB  |  | Proveedores Web Push (VAPID)|
| PostgreSQL 16|  | FCM / Mozilla / Apple Push |
| + pgvector   |  +----------------------------+
+--------------+
```

### 1.2 Configuracion DNS para Dominio Personalizado hacia Vercel

Al vincular un dominio propio (por ejemplo `consejoscout.org.ar` o `app.consejoscout.org.ar`) en **Vercel -> Project Settings -> Domains**:

| Tipo de Registro | Host / Nombre | Valor Destino | TTL Recomendado | Uso |
| :--- | :--- | :--- | :--- | :--- |
| `A` | `@` (dominio apex) | `76.76.21.21` | `300` s (en migracion) / `3600` s | Resolucion del dominio raiz hacia la IP Anycast de Vercel |
| `CNAME` | `app` o `www` | `cname.vercel-dns.com.` | `300` s / `3600` s | Subdominio principal o alias redirigido |
| `TXT` | `_vercel` | Token asignado por Vercel | `300` s | Verificacion de propiedad si el dominio estuvo asociado previamente |
| `CAA` | `@` | `0 issue "letsencrypt.org"` | `3600` s | Restringe emision de certificados TLS a Let's Encrypt (usado por Vercel) |

Notas operativas de DNS:
- Si el proveedor DNS soporta registros `ALIAS` o `ANAME` en el apex (`@`), puede apuntarse a `cname.vercel-dns.com.` en lugar del registro `A` estatico.
- Definir un unico host canonico (por ejemplo `app.consejoscout.org.ar` o `consejoscout.org.ar`) con redireccion HTTP `308` desde el alternativo para evitar fragmentacion de origen en Service Worker, IndexedDB y suscripciones Web Push.
- Si se utiliza Cloudflare delante de Vercel, mantener el proxy en modo **DNS Only** (nube gris) para evitar doble terminacion TLS y conflictos con la renovacion automatica de certificados ACME en Vercel.

### 1.3 TLS 1.3 y HSTS

- **TLS**: Vercel Edge Network aprovisiona certificados TLS gestionados automaticamente via Let's Encrypt con soporte nativo para **TLS 1.3** (y TLS 1.2 para clientes heredados).
- **HSTS** verificado en `vercel.json` sobre `/(.*)`:

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

- Duracion de 2 anos (`63072000` segundos), extensible a todos los subdominios (`includeSubDomains`) y apto para inclusion en listas `preload`. Antes de habilitar `preload` en produccion definitiva, confirmar que ningun otro subdominio del dominio raiz dependa de HTTP sin cifrado.

### 1.4 Cabeceras HTTP Verificadas en `vercel.json`

Aplicadas globalmente a `source: "/(.*)"`:

| Cabecera | Valor Configurado en `vercel.json` | Proposito de Seguridad |
| :--- | :--- | :--- |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'` | Restringe ejecucion de scripts a origen propio, habilita Web Workers y Manifest propios, y limita conexiones de API/WebSocket a `self` y `*.supabase.co`. |
| `X-Frame-Options` | `DENY` | Bloquea incrustacion en iframes (complementa `frame-ancestors 'none'`). |
| `X-Content-Type-Options` | `nosniff` | Impide MIME-type sniffing en navegador. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Evita fuga de rutas o parametros en enlaces salientes. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Deshabilita hardware sensible no utilizado por la aplicacion. |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Fuerza HTTPS estricto en el navegador. |

### 1.5 Regla de Rewrite SPA en `vercel.json`

```json
{
  "source": "/((?!api(?:/|$)|assets(?:/|$)|icons(?:/|$)|sw\\.js$|manifest\\.webmanifest$|offline\\.html$).*)",
  "destination": "/index.html"
}
```

Excluye explicitamente `/api`, `/assets`, `/icons`, `/sw.js`, `/manifest.webmanifest` y `/offline.html` para que rutas inexistentes de API o activos estaticos no respondan `200 OK` con `index.html`.

---

## 2. Reglas de Cache en CDN/Edge para PWA y Aislamiento de `/api/*`

### 2.1 Comportamiento de Build y Service Worker (`vite.config.js` + `src/sw.js`)

- `vite.config.js` utiliza `VitePWA` en modo `injectManifest` (`srcDir: 'src'`, `filename: 'sw.js'`, `registerType: 'prompt'`, `injectRegister: false`).
- El build (`npm run build`) genera en `dist/`:
  - `assets/*.js` y `assets/*.css` con hash criptografico de contenido en el nombre de archivo.
  - `sw.js` con el manifiesto de precache inyectado (`self.__WB_MANIFEST`, patron `**/*.{js,css,html,ico,png,svg,woff2}`).
  - `manifest.webmanifest`, `index.html`, `offline.html` e `icons/*`.
- En `src/sw.js`:
  - Las rutas hacia `/api/` y `*.supabase.co` usan estrategia `NetworkOnly()` para excluir por completo datos operativos y de menores del `Cache Storage`.
  - Las navegaciones SPA (`NavigationRoute` con `denylist: [/^\/api\//]`) usan `NetworkFirst` con `networkTimeoutSeconds: 3` y fallback a `matchPrecache('/index.html')` o `matchPrecache('/offline.html')`.

### 2.2 Estado Verificado en `vercel.json` vs Politica Objetivo

| Ruta / Recurso | Configuracion Actual en `vercel.json` | Estado / Evaluacion |
| :--- | :--- | :--- |
| `/sw.js` | `Service-Worker-Allowed: /`<br>`Cache-Control: no-cache, no-store, must-revalidate` | **Correcto**. Garantiza validacion inmediata de nuevas versiones del Service Worker y habilita el scope raiz `/`. |
| `/manifest.webmanifest` | `Content-Type: application/manifest+json`<br>`Cache-Control: public, max-age=3600` | **Correcto**. MIME oficial de manifiesto web y TTL de 1 hora. |
| `/api/(.*)` | `Cache-Control: no-store` | **Correcto (mejorable)**. Aisla respuestas dinamicas en navegador; se recomienda sumar `CDN-Cache-Control: no-store` y `X-Robots-Tag: noindex, nofollow`. |
| `/assets/(.*)` | *Sin bloque especifico en `vercel.json`* | **Ajuste requerido**. Los archivos Vite tienen hash inmutable; debe agregarse `Cache-Control: public, max-age=31536000, immutable` para evitar revalidaciones innecesarias en Edge y navegador. |
| `/index.html` y `/offline.html` | *Sin bloque especifico en `vercel.json`* | **Ajuste requerido**. Debe explicitarse `Cache-Control: public, max-age=0, must-revalidate` para asegurar que el documento HTML nunca quede cacheado apuntando a hashes anteriores tras un deploy. |
| `/icons/(.*)` | *Sin bloque especifico en `vercel.json`* | **Ajuste recomendado**. Los iconos no llevan hash en el nombre; definir `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`. |

### 2.3 Ajustes Recomendados para `vercel.json`

Se recomienda incorporar los siguientes bloques dentro de `headers` en `vercel.json` (ubicados junto a las reglas especificas existentes):

```json
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(index\\.html|offline\\.html)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/icons/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=86400, stale-while-revalidate=604800"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store"
        },
        {
          "key": "CDN-Cache-Control",
          "value": "no-store"
        },
        {
          "key": "X-Robots-Tag",
          "value": "noindex, nofollow"
        }
      ]
    }
```

Observacion menor adicional sobre rewrites: algunos navegadores y rastreadores solicitan `/favicon.ico` de forma automatica. Actualmente esa peticion es reescrita hacia `/index.html` por no existir en `public/` ni en la exclusion negativa del rewrite. Puede mantenerse asi o excluirse (`favicon\\.ico$`) si se incorpora un archivo `/public/favicon.ico`.

---

## 3. Operacion del Cron Diario `/api/push/check-reminders`

### 3.1 Programacion y Zona Horaria (UTC vs ART `-03:00`)

En `vercel.json`:

```json
{
  "path": "/api/push/check-reminders",
  "schedule": "0 11 * * *"
}
```

- Los Cron Jobs de Vercel interpretan todas las expresiones exclusivamente en **UTC**.
- `0 11 * * *` corresponde a **`11:00 UTC`**, equivalente a **`08:00 ART` (`UTC-03:00`)** en Argentina (sin horario de verano vigente).
- En `api/push/check-reminders.js`, las ventanas de vencimiento se calculan con `addDaysIsoUtc(now, days)`:
  - Carpetas distritales (`camp_checklists.district_submission_deadline`): `hoy_UTC + 7 dias`.
  - Fichas medicas (`group_members.medical_form_expires_at`): `hoy_UTC + 15 dias`.
  - Tareas de Consejo (`council_tasks.due_date`): `hoy_UTC + 3 dias`.
- Dado que `11:00 UTC` equivale a `08:00 ART` del **mismo dia calendario**, no existe corrimiento de fecha durante el disparo automatico. Sin embargo, una ejecucion manual realizada entre las `21:00 ART` y las `23:59 ART` (`00:00 UTC` a `02:59 UTC`) evaluara los cortes con el dia calendario UTC siguiente (+1 dia respecto de ART).

### 3.2 Flujo de Ejecucion y Seguridad

1. Solo acepta metodo HTTP `GET` (`405 Method Not Allowed` para otros metodos).
2. Verifica `Authorization: Bearer <CRON_SECRET>` mediante comparacion de longitud y `crypto.timingSafeEqual` (`401 Unauthorized` si es invalido o ausente).
3. Instancia `getSupabaseAdmin()` (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, omitiendo RLS para evaluar todos los grupos en una sola corrida).
4. Consulta en paralelo `camp_checklists`, `group_members` y `council_tasks`.
5. Agrupa metricas agregadas por `group_id` y filtra destinatarios con membresia activa en `RECIPIENT_ROLES = ['jefe_grupo', 'subjefe_grupo', 'secretario']`.
6. Sanitiza el mensaje agregado mediante `sanitizePushPayload` (sin nombres ni datos sensibles de menores en el payload push) y despacha via `dispatchPushNotifications`.

### 3.3 Limites de Ejecucion Serverless y Riesgos de Escala

- **Timeouts de plataforma (Vercel)**:
  - Plan **Hobby**: limite estricto de 1 cron/dia por proyecto con ventana de disparo flexible (no garantizada al minuto exacto) y timeout por defecto de 10 s (ampliable segun configuracion de Fluid Compute del proyecto).
  - Plan **Pro**: precision al minuto y `maxDuration` configurable hasta 60 s - 300 s.
- **Cuellos de botella identificados en el codigo actual**:
  1. **Despacho secuencial por grupo**: en `api/push/check-reminders.js` (lineas 200-242), el bucle `for (const groupId of groupIds)` ejecuta `await dispatchPushNotifications(...)` de forma secuencial entre grupos (aunque intra-grupo paraleliza en lotes de `concurrency = 10` con `Promise.allSettled`). Si crece la cantidad de grupos Scout activos y hay endpoints push lentos, la duracion acumulada puede acercarse al timeout serverless.
  2. **Consultas sin paginacion explicita**: las tres consultas iniciales a Supabase (lineas 97-115) no especifican `.limit()` ni paginacion por rango, por lo que quedan sujetas al `max-rows` configurado en PostgREST (por defecto `1000` filas en Supabase). Si la plataforma supera ese volumen de registros abiertos simultaneos, se debera paginar por bloques o delegar el agregado a una funcion RPC en PostgreSQL.

### 3.4 Manejo de Reintentos, Purga y Monitoreo

- **Reintentos**:
  - Vercel Cron **no reintenta automaticamente** si la invocacion devuelve `5xx` o expira por timeout.
  - Dentro de `api/_lib/pushDispatcher.js`, los endpoints que responden HTTP `404` o `410` (suscripcion expirada o revocada por el usuario) se eliminan automaticamente de `push_subscriptions` y se reportan en `subscriptionsPruned`. Otros errores (`429`, `5xx`, timeouts de red) incrementan el contador `failed` sin reintento en la misma corrida.
  - **Reintento manual ante fallo**: puede invocarse nuevamente por CLI con:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  "https://<dominio-produccion>/api/push/check-reminders"
```

  - Las notificaciones diarias comparten `tag: daily-reminders-<primeros-8-chars-groupId>` y `renotify: false` en `src/sw.js`, evitando acumulacion ruidosa en la bandeja del dispositivo si ocurre una re-ejecucion en el mismo dia.
- **Monitoreo operativo**:
  - Revisar diariamente en **Vercel -> Logs / Cron Jobs** que la invocacion de las `11:00 UTC` retorne HTTP `200` y registrar los contadores `groupsEvaluated`, `notificationsSent`, `subscriptionsPruned` y la latencia total de ejecucion.
  - Configurar alerta externa (por ejemplo Uptime/Monitoring o Log Drain hacia Grafana/BetterStack/Datadog) ante cualquier codigo HTTP `>= 400`, aparicion de `[push/check-reminders] Error:` en logs, o caida de ejecuciones por mas de 25 horas.

---

## 4. Estrategia de Respaldo y Recuperacion ante Desastres (Backup/DR)

### 4.1 Inventario de Datos Criticos (`database/schema.sql`)

- **Motor y extensiones**: PostgreSQL 16 + `pgcrypto` + `vector` (`pgvector`).
- **Tablas operativas multi-tenant (`FORCE ROW LEVEL SECURITY`)**:
  - `scout_groups`
  - `group_memberships` (FK a `auth.users(id)`)
  - `group_members` (contiene datos personales y vigencia medica de beneficiarios/educadores)
  - `camp_checklists` (FK `created_by` a `auth.users(id)`)
  - `council_tasks` (FK `created_by` a `auth.users(id)`)
  - `push_subscriptions` (FK a `auth.users(id)`)
- **Base de conocimiento vectorial**:
  - `saac_knowledge_base` (`embedding vector(768)`, `content_hash text UNIQUE`, indice `idx_saac_kb_embedding_hnsw` con `hnsw (embedding vector_cosine_ops)`).
- **Logica en base de datos**: funciones `set_updated_at()`, `validate_camp_checklist_rules()`, `is_group_member(uuid)`, `has_group_role(uuid, text[])`, `match_saac_documents(...)` y todas las politicas RLS.

### 4.2 Politica de Backups (PITR + `pg_dump`)

| Mecanismo | Plan / Requisito | RPO | RTO Estimado | Uso Recomendado |
| :--- | :--- | :--- | :--- | :--- |
| **Supabase PITR (WAL continuo)** | Supabase Pro + add-on PITR | Segundos / < 5 min | 15 - 60 min | Produccion multi-grupo con recuperacion granular antes de errores humanos o borrados accidentales |
| **Snapshots diarios Supabase** | Supabase Pro | 24 horas | 15 - 45 min | Linea base automatizada de plataforma |
| **`pg_dump` logico cifrado** | Todos los planes (incluye Free) | <= 24 horas (segun cron) | 30 - 90 min | Portabilidad fuera de Supabase, archivo historico y verificacion independiente |

Reglas operativas para `pg_dump` contra Supabase:
1. Conectarse siempre al **Direct Connection** o **Session Pooler** (puerto `5432`), nunca al Transaction Pooler (`6543`).
2. Para backup de negocio excluyendo la tabla de embeddings (regenerable, reduciendo drasticamente el tamano del artefacto):

```bash
export PGPASSWORD="$SUPABASE_DB_PASSWORD"
pg_dump \
  --host="db.<project-ref>.supabase.co" \
  --port=5432 \
  --username="postgres" \
  --dbname="postgres" \
  --format=custom \
  --compress=9 \
  --schema=public \
  --schema=auth \
  --exclude-table-data="public.saac_knowledge_base" \
  --file="consejoscout_$(date -u +%Y%m%dT%H%M%SZ).dump"
```

3. **Cifrado obligatorio del backup**: dado que `group_members` almacena nombres completos, DNI (`document_number`) y vencimientos medicos, todo dump almacenado fuera de Supabase debe cifrarse inmediatamente (por ejemplo con `age` o `gpg --symmetric --cipher-algo AES256`) y guardarse en almacenamiento privado con retencion 7 diarios / 4 semanales / 3 mensuales.
4. **Control de integridad**: mantener un trabajo mensual de restauracion de prueba en un proyecto Supabase de staging o contenedor PostgreSQL 16 + `pgvector` local validando conteo de filas, ejecucion de `validate_camp_checklist_rules` y politicas RLS.

### 4.3 Procedimiento de Recuperacion ante Desastres (DRP)

1. **Declaracion de incidente y contencion**: congelar escrituras o rotar credenciales si el incidente involucra compromiso de claves (`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` o `VAPID_PRIVATE_KEY`).
2. **Restauracion de base de datos**:
   - *Con PITR*: ejecutar **Restore to a specific time** desde el panel de Supabase al timestamp inmediatamente previo al incidente.
   - *Desde `pg_dump` en instancia limpia (PostgreSQL 16)*:
     1. Habilitar extensiones previas (`CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS vector;`).
     2. Restaurar primero el esquema `auth` (`auth.users`) para preservar los UUID referenciados por `group_memberships`, `camp_checklists`, `council_tasks` y `push_subscriptions`.
     3. Aplicar `database/schema.sql` si se restaura solo datos, o ejecutar `pg_restore --no-owner --role=postgres` sobre el dump completo.
3. **Re-indexacion idempotente de `saac_knowledge_base`**:
   - Si el backup excluyo `public.saac_knowledge_base`, o si se requiere reconstruir vectores tras corrupcion o cambio de proveedor de embeddings (siempre de `768` dimensiones: `gemini` `text-embedding-004` u `openai` `text-embedding-3-small`):

```bash
export SUPABASE_URL="https://<nuevo-proyecto>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<nueva-service-role-key>"
export EMBEDDING_PROVIDER="gemini"
export EMBEDDING_API_KEY="<api-key>"

# Validacion previa sin escritura
npm run ingest-saac -- --source=all --dry-run

# Re-ingesta idempotente (onConflict: 'content_hash')
npm run ingest-saac -- --source=all
```

   - Como `scripts/ingest-saac-docs.js` calcula `content_hash = sha256(docTitle|articleRef|content)` y realiza `upsert` con `onConflict: 'content_hash'`, la ejecucion puede repetirse o reanudarse tras interrupciones sin duplicar fragmentos.
   - Si el volumen de chunks crece o se reemplazan embeddings masivamente, reconstruir el indice HNSW y actualizar estadisticas en PostgreSQL:

```sql
REINDEX INDEX CONCURRENTLY idx_saac_kb_embedding_hnsw;
ANALYZE public.saac_knowledge_base;
```

4. **Verificacion post-restauracion**:
   - Confirmar que el rol `anon` no tenga permisos sobre tablas operativas ni sobre `match_saac_documents`.
   - Verificar funcionamiento de `/api/push/check-reminders` y consultas semanticas desde sesion autenticada.

---

## 5. Configuracion Alternativa On-Premise (Debian + Nginx)

En escenarios donde un Distrito o institucion requiera operar el frontend PWA y el backend de notificaciones fuera de Vercel (por ejemplo, en una VM Debian 12/13 interna o VPS dedicado), debe respetarse la misma topologia de cabeceras, aislamiento de cache y proteccion de endpoints.

### 5.1 Arquitectura de Proceso Local en Debian

- **Frontend estatico**: artefactos generados con `npm run build` copiados a `/var/www/consejoscout/dist` (permisos `root:www-data`, `0755` directorios / `0644` archivos).
- **Servicio API Node.js 20+**: los archivos `api/push/send.js` y `api/push/check-reminders.js` estan implementados como handlers estilo Vercel `(req, res)`. Para ejecutarlos on-premise se debe montar un servidor HTTP minimo en Node.js 20+ (o adaptador Express) escuchando exclusivamente en `127.0.0.1:3001`, gestionado por `systemd` con archivo de entorno `/etc/consejoscout/api.env` (`chmod 0600`).
- **Cron local**: `systemd timer` o entrada en `crontab` ejecutando diariamente a las `08:00 ART` (`11:00 UTC`):

```cron
0 8 * * * root /usr/bin/curl -fsS -H "Authorization: Bearer $(grep '^CRON_SECRET=' /etc/consejoscout/api.env | cut -d= -f2-)" http://127.0.0.1:3001/api/push/check-reminders >/var/log/consejoscout-cron.log 2>&1
```

*(Nota: verificar que la zona horaria del host Debian sea `America/Argentina/Buenos_Aires` con `timedatectl`, o ajustar a `0 11 * * *` si el servidor opera en `UTC`.)*

### 5.2 Snippet Compartido de Cabeceras de Seguridad en Nginx

En Nginx, definir `add_header` dentro de un bloque `location` anula los `add_header` heredados del bloque `server`. Por ello, es obligatorio incluir este snippet en el `server` y en todo `location` que agregue cabeceras propias (como `Cache-Control` o `Service-Worker-Allowed`).

Crear `/etc/nginx/snippets/consejoscout-security-headers.conf`:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

### 5.3 Configuracion Nginx (Reverse Proxy SSL/TLS, HTTP/2, PWA y Rate Limiting)

Crear `/etc/nginx/conf.d/consejoscout-ratelimit.conf` (contexto `http`):

```nginx
# Rate limiting para /api/push/*: 10 req/min por IP con rafaga corta de 5
limit_req_zone $binary_remote_addr zone=consejoscout_push_limit:10m rate=10r/m;
limit_req_status 429;
```

Crear `/etc/nginx/sites-available/consejoscout.conf`:

```nginx
upstream consejoscout_api {
    server 127.0.0.1:3001;
    keepalive 16;
}

server {
    listen 80;
    listen [::]:80;
    server_name app.consejoscout.org.ar;

    # Permitir desafio ACME si se usa certbot --webroot
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    # En Nginx >= 1.25.1 usar: listen 443 ssl; http2 on;
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.consejoscout.org.ar;

    root /var/www/consejoscout/dist;
    index index.html;

    # Certificados TLS (Let's Encrypt / CA interna)
    ssl_certificate /etc/letsencrypt/live/app.consejoscout.org.ar/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.consejoscout.org.ar/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/app.consejoscout.org.ar/chain.pem;

    # Hardening SSL/TLS (TLS 1.2 y TLS 1.3)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout 5s;

    server_tokens off;
    client_max_body_size 256k;

    include /etc/nginx/snippets/consejoscout-security-headers.conf;

    # Compresion de estaticos de texto
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json application/manifest+json image/svg+xml;

    # 1. Service Worker: nunca cachear y autorizar scope raiz '/'
    location = /sw.js {
        include /etc/nginx/snippets/consejoscout-security-headers.conf;
        add_header Service-Worker-Allowed "/" always;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        expires -1;
        try_files $uri =404;
    }

    # 2. Web App Manifest
    location = /manifest.webmanifest {
        types { }
        default_type application/manifest+json;
        include /etc/nginx/snippets/consejoscout-security-headers.conf;
        add_header Cache-Control "public, max-age=3600" always;
        try_files $uri =404;
    }

    # 3. Documentos HTML de entrada y fallback offline
    location ~* ^/(index\.html|offline\.html)$ {
        include /etc/nginx/snippets/consejoscout-security-headers.conf;
        add_header Cache-Control "public, max-age=0, must-revalidate" always;
        try_files $uri =404;
    }

    # 4. Assets Vite con hash criptografico inmutable
    location ^~ /assets/ {
        include /etc/nginx/snippets/consejoscout-security-headers.conf;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        access_log off;
        try_files $uri =404;
    }

    # 5. Iconos PWA estaticos (sin hash)
    location ^~ /icons/ {
        include /etc/nginx/snippets/consejoscout-security-headers.conf;
        add_header Cache-Control "public, max-age=86400, stale-while-revalidate=604800" always;
        try_files $uri =404;
    }

    # 6. Endpoint de Cron: restringido a loopback cuando el cron corre en el mismo servidor
    # (Si se invoca desde un scheduler externo confiable, reemplazar por allow <IP_ORQUESTADOR>;)
    location = /api/push/check-reminders {
        allow 127.0.0.1;
        allow ::1;
        deny all;

        include /etc/nginx/snippets/consejoscout-security-headers.conf;
        add_header Cache-Control "no-store" always;

        proxy_pass http://consejoscout_api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 7. Endpoints Push publicos (/api/push/send) con Rate Limiting
    location ^~ /api/push/ {
        limit_req zone=consejoscout_push_limit burst=5 nodelay;

        include /etc/nginx/snippets/consejoscout-security-headers.conf;
        add_header Cache-Control "no-store" always;
        add_header X-Robots-Tag "noindex, nofollow" always;

        proxy_pass http://consejoscout_api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # 8. Resto de /api/* sin cache
    location ^~ /api/ {
        include /etc/nginx/snippets/consejoscout-security-headers.conf;
        add_header Cache-Control "no-store" always;
        add_header X-Robots-Tag "noindex, nofollow" always;

        proxy_pass http://consejoscout_api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 9. Fallback SPA (sin interceptar rutas excluidas arriba)
    location / {
        include /etc/nginx/snippets/consejoscout-security-headers.conf;
        add_header Cache-Control "public, max-age=0, must-revalidate" always;
        try_files $uri $uri/ /index.html;
    }
}
```

### 5.4 Activacion, Validacion y Firewall en Debian

```bash
# Habilitar sitio y validar sintaxis antes de recargar
sudo ln -s /etc/nginx/sites-available/consejoscout.conf /etc/nginx/sites-enabled/consejoscout.conf
sudo nginx -t && sudo systemctl reload nginx

# Reglas minimas de firewall (UFW)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow from <IP_ADMIN_BASTION> to any port 22 proto tcp
sudo ufw enable

# Verificacion de cabeceras PWA y aislamiento de API
curl -sI https://app.consejoscout.org.ar/sw.js | grep -iE 'service-worker-allowed|cache-control|strict-transport-security'
curl -sI https://app.consejoscout.org.ar/assets/ | head -n 5
curl -sI https://app.consejoscout.org.ar/api/push/check-reminders
```
